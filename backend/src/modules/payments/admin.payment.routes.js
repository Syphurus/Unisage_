/**
 * @fileoverview Admin payment routes.
 *
 *   GET   /api/admin/payments/queue?status=&q=
 *   GET   /api/admin/payments/audit?paymentId=
 *   GET   /api/admin/payments/:id
 *   POST  /api/admin/payments/:id/approve  (If-Match required)
 *   POST  /api/admin/payments/:id/reject   (If-Match required)
 *   POST  /api/admin/payments/:id/revoke   (If-Match required; payments.revoke permission)
 *
 * Chain: auth → adminAuth → permissionAuth(['payments.review' or 'payments.revoke'])
 */

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminAuth");
const permissionAuth = require("../../middleware/permissionAuth");
const validate = require("../../middleware/validation");
const idempotency = require("../../middleware/idempotency");
const validators = require("./payment.validators");
const controller = require("./admin.payment.controller");

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Admin rate limit exceeded" },
  },
});

router.use(authMiddleware);
router.use(adminAuth);
router.use(adminLimiter);

router.get(
  "/queue",
  permissionAuth(["payments.review", "payments.revoke"]),
  validate(validators.adminQueueQuery),
  controller.queue
);

router.get(
  "/audit",
  permissionAuth(["payments.review", "payments.revoke"]),
  controller.listAudit
);

router.get(
  "/:id",
  permissionAuth(["payments.review", "payments.revoke"]),
  validate(validators.paymentIdParam),
  controller.getOne
);

router.post(
  "/:id/approve",
  permissionAuth(["payments.review"]),
  validate(validators.adminApprove),
  idempotency(),
  controller.approve
);

router.post(
  "/:id/reject",
  permissionAuth(["payments.review"]),
  validate(validators.adminReject),
  idempotency(),
  controller.reject
);

router.post(
  "/:id/revoke",
  permissionAuth(["payments.revoke"]),
  validate(validators.adminRevoke),
  idempotency(),
  controller.revoke
);

module.exports = router;
