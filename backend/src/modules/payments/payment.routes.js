/**
 * @fileoverview User-facing payment routes.
 *
 *   GET  /api/payments/plans            list active plans
 *   POST /api/payments/intent           create a new payment intent (requires Idempotency-Key)
 *   POST /api/payments/:id/submit       submit UTR + optional proof image (requires Idempotency-Key)
 *   POST /api/payments/:id/cancel       cancel an open intent
 *   GET  /api/payments/:id              get one payment (own only)
 *   GET  /api/payments/mine             list own payments
 *   GET  /api/payments/me/entitlements  list active entitlements for the user
 */

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../../middleware/auth");
const validate = require("../../middleware/validation");
const idempotency = require("../../middleware/idempotency");
const validators = require("./payment.validators");
const controller = require("./payment.controller");
const { proofUpload } = require("./upload/proof.upload");

const router = Router();

const perUser = (max, windowMs) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
      success: false,
      error: { code: "RATE_LIMIT", message: "Too many requests" },
    },
  });

router.use(authMiddleware);

router.get("/plans", controller.getPlans);

router.get("/mine", perUser(60, 60 * 1000), controller.listMine);
router.get("/me/entitlements", perUser(60, 60 * 1000), controller.getMyEntitlements);

router.post(
  "/intent",
  perUser(5, 15 * 60 * 1000),
  validate(validators.createIntent),
  idempotency(),
  controller.createIntent
);

router.post(
  "/:id/submit",
  perUser(3, 15 * 60 * 1000),
  proofUpload.single("proof"),
  controller.handleUploadError,
  validate(validators.submitProof),
  idempotency(),
  controller.submitProof
);

router.post(
  "/:id/cancel",
  perUser(10, 15 * 60 * 1000),
  validate(validators.paymentIdParam),
  controller.cancel
);

router.get(
  "/:id",
  perUser(60, 60 * 1000),
  validate(validators.paymentIdParam),
  controller.getOne
);

module.exports = router;
