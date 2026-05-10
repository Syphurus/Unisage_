/**
 * @fileoverview Idempotency middleware.
 *
 * Requires the client to send an `Idempotency-Key` header on mutating
 * payment endpoints. Replayed keys with matching bodies return the original
 * cached response; replayed keys with different bodies return 409
 * (IDEMPOTENCY_REPLAY_MISMATCH).
 *
 * Keys are scoped to (user_id, endpoint, key) so users cannot collide.
 * TTL: 24 hours.
 */

const crypto = require("crypto");
const { supabase } = require("../config/database");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function hashRequest(req) {
  const payload = {
    method: req.method,
    path: req.originalUrl.split("?")[0],
    // Body may include multipart fields by name (not file contents) — multer
    // populates req.body before this middleware runs only for upload routes
    // where we've already moved the file aside.
    body: req.body || {},
    query: req.query || {},
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Express middleware. Pass `{ required: true }` to enforce key presence.
 */
function idempotency({ required = true } = {}) {
  return async function idempotencyMiddleware(req, res, next) {
    try {
      const key = req.header("Idempotency-Key");
      if (!key) {
        if (required) {
          return next(
            new AppError(
              "Idempotency-Key header is required on this endpoint",
              400,
              "IDEMPOTENCY_KEY_REQUIRED"
            )
          );
        }
        return next();
      }
      if (typeof key !== "string" || key.length < 8 || key.length > 128) {
        return next(
          new AppError(
            "Idempotency-Key must be 8-128 characters",
            400,
            "IDEMPOTENCY_KEY_INVALID"
          )
        );
      }
      if (!req.user?.id) {
        // Should never happen — idempotency is always after authMiddleware.
        return next(new AppError("Authenticated user required", 401, "AUTH_ERROR"));
      }

      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      const requestHash = hashRequest(req);

      const { data: existing, error: selErr } = await supabase
        .from("payment_idempotency_keys")
        .select("request_hash, response_status, response_body, expires_at")
        .eq("user_id", req.user.id)
        .eq("endpoint", endpoint)
        .eq("key", key)
        .maybeSingle();

      if (selErr) {
        logger.warn("idempotency lookup failed; proceeding without cache", {
          error: selErr.message,
        });
      } else if (existing) {
        if (new Date(existing.expires_at) < new Date()) {
          // Stale — fall through; cleanup job purges later.
        } else if (existing.request_hash !== requestHash) {
          return next(
            new AppError(
              "Idempotency-Key was reused with a different request body",
              409,
              "IDEMPOTENCY_REPLAY_MISMATCH"
            )
          );
        } else {
          return res.status(existing.response_status).json(existing.response_body);
        }
      }

      // Wrap res.json to capture the response so we can persist it for replay.
      const originalJson = res.json.bind(res);
      let captured = false;
      res.json = function (body) {
        if (!captured) {
          captured = true;
          // Don't cache server errors — they may be transient.
          if (res.statusCode < 500) {
            const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString();
            supabase
              .from("payment_idempotency_keys")
              .upsert(
                {
                  user_id: req.user.id,
                  endpoint,
                  key,
                  request_hash: requestHash,
                  response_status: res.statusCode,
                  response_body: body,
                  expires_at: expiresAt,
                },
                { onConflict: "user_id,endpoint,key" }
              )
              .then(({ error }) => {
                if (error) {
                  logger.warn("idempotency persist failed", { error: error.message });
                }
              });
          }
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = idempotency;
