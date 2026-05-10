/**
 * @fileoverview Analytics routes (all require authentication).
 *
 * INGESTION
 *   POST /api/analytics/heartbeat   — reading-time + scroll heartbeat
 *   POST /api/analytics/events      — bulk event insert
 *
 * READS
 *   GET  /api/analytics/me          — dashboard payload (rollup-backed)
 *   GET  /api/analytics/me/subjects — per-subject progress + weakness
 */

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const analyticsController = require("../controllers/analytics.controller");
const authMiddleware = require("../middleware/auth");
const validate = require("../middleware/validation");
const validators = require("../utils/validators");
const { requireEntitlement } = require("../modules/entitlements/entitlement.middleware");

const router = Router();

// Per-user heartbeat limiter. Heartbeats are expected ~every 30s — this
// allows a generous burst (rapid tab focus changes) without enabling abuse.
// Keyed by user id (not IP) so multiple students on one network aren't
// throttled together.
const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12, // 12 heartbeats per minute (one every 5s sustained)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: "Heartbeat rate exceeded",
    },
  },
});

// Event ingestion limiter — bursty but bounded.
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Event ingestion rate exceeded" },
  },
});

// All analytics routes require authentication.
router.use(authMiddleware);

// Ingestion
router.post(
  "/heartbeat",
  heartbeatLimiter,
  validate(validators.heartbeat),
  analyticsController.heartbeat
);

router.post(
  "/events",
  eventsLimiter,
  validate(validators.ingestEvents),
  analyticsController.events
);

// Reads — premium ('analysis' scope). Gate is server-authoritative.
router.get("/me", requireEntitlement("analysis"), analyticsController.getMyDashboard);
router.get(
  "/me/subjects",
  requireEntitlement("analysis"),
  analyticsController.getMySubjectProgress
);

module.exports = router;
