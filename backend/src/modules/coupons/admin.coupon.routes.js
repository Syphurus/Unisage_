/**
 * @fileoverview Admin coupon management routes.
 *
 *   GET   /api/admin/coupons
 *   POST  /api/admin/coupons
 *   GET   /api/admin/coupons/:id
 *   PATCH /api/admin/coupons/:id
 *   GET   /api/admin/coupons/:id/redemptions
 */

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../../middleware/auth");
const adminAuth = require("../../middleware/adminAuth");
const permissionAuth = require("../../middleware/permissionAuth");
const validate = require("../../middleware/validation");
const validators = require("./coupon.validators");
const controller = require("./admin.coupon.controller");

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 80,
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
router.use(permissionAuth(["coupons.manage"]));
router.use(adminLimiter);

router.get("/", validate(validators.adminListQuery), controller.list);
router.post("/", validate(validators.createCoupon), controller.create);
router.get("/:id", validate(validators.couponIdParam), controller.getOne);
router.patch("/:id", validate(validators.updateCoupon), controller.update);
router.get(
  "/:id/redemptions",
  validate(validators.couponRedemptions),
  controller.redemptions
);

module.exports = router;
