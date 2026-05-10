/**
 * @fileoverview Entitlement gate middleware.
 *
 * MUST be used AFTER `authMiddleware`. Authentication and authorization are
 * intentionally separated — this middleware is concerned only with whether
 * the authenticated user holds an active entitlement for the given scope.
 *
 * Returns 402 with code ENTITLEMENT_REQUIRED so the frontend can show the
 * paywall — distinct from 401 (not logged in) and 403 (admin-only).
 */

const entitlementService = require("./entitlement.service");
const { isScope } = require("./capability.registry");
const { AppError, AuthError } = require("../../utils/errors");
const logger = require("../../utils/logger");

class EntitlementRequiredError extends AppError {
  constructor(scope) {
    super(`Premium access required for "${scope}"`, 402, "ENTITLEMENT_REQUIRED");
    this.scope = scope;
  }
}

/**
 * Express middleware factory.
 *   router.get('/foo', authMiddleware, requireEntitlement('predictor'), handler)
 */
function requireEntitlement(scope) {
  if (!isScope(scope)) {
    throw new Error(`requireEntitlement: unknown scope "${scope}"`);
  }

  return async function entitlementGate(req, _res, next) {
    try {
      if (!req.user) throw new AuthError("Authentication required");

      // Admin users have implicit access to all premium scopes for support purposes.
      // (They are subject to the same audit trail via request logs.)
      if (req.user.role === "admin") {
        req.entitlement = { scope, source: "admin-override" };
        return next();
      }

      const active = await entitlementService.getActive(req.user.id, scope);
      if (!active) {
        const err = new EntitlementRequiredError(scope);
        err.details = { scope };
        return next(err);
      }

      req.entitlement = {
        scope,
        expiresAt: active.expires_at,
        source: "entitlement",
        id: active.id,
      };
      next();
    } catch (err) {
      // Fail closed on unexpected DB errors.
      logger.error("Entitlement evaluation failed", {
        scope,
        userId: req.user?.id,
        error: err.message,
      });
      next(err);
    }
  };
}

/**
 * Non-blocking variant: attaches `req.entitlements` (a map of scope → boolean)
 * without rejecting. Useful for endpoints that need to filter their response
 * based on what the user has access to (e.g. content listing that strips
 * `paper_predictor` items for unentitled users).
 */
function attachEntitlements(scopes) {
  const list = scopes.filter(isScope);
  return async function attach(req, _res, next) {
    try {
      if (!req.user) {
        req.entitlements = {};
        return next();
      }
      if (req.user.role === "admin") {
        req.entitlements = Object.fromEntries(list.map((s) => [s, true]));
        return next();
      }
      const active = await entitlementService.listActive(req.user.id);
      const have = new Set(active.map((e) => e.scope));
      req.entitlements = Object.fromEntries(list.map((s) => [s, have.has(s)]));
      next();
    } catch (err) {
      // Fail closed: no entitlements rather than a crash.
      req.entitlements = Object.fromEntries(list.map((s) => [s, false]));
      logger.warn("attachEntitlements failed, defaulting to no access", {
        error: err.message,
      });
      next();
    }
  };
}

module.exports = {
  requireEntitlement,
  attachEntitlements,
  EntitlementRequiredError,
};
