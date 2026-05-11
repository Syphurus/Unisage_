/**
 * @fileoverview Custom coupon routes.
 *
 *   POST /api/coupons/validate  validate and preview a coupon before payment
 */

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../../middleware/auth");
const validate = require("../../middleware/validation");
const validators = require("./coupon.validators");
const controller = require("./coupon.controller");

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

router.post(
  "/validate",
  perUser(20, 15 * 60 * 1000),
  validate(validators.validateCoupon),
  controller.validateCoupon
);

module.exports = router;
