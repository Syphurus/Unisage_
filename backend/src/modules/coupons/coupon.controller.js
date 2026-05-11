/**
 * @fileoverview User-facing custom coupon controllers.
 */

const couponService = require("./coupon.service");

async function validateCoupon(req, res, next) {
  try {
    const quote = await couponService.buildCouponQuote({
      user: req.user,
      planId: req.body.planId,
      couponCode: req.body.couponCode,
    });
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  validateCoupon,
};
