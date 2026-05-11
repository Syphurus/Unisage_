/**
 * @fileoverview Admin coupon controllers.
 */

const couponService = require("./coupon.service");
const audit = require("../audit/audit.service");

async function list(req, res, next) {
  try {
    const data = await couponService.adminListCoupons({
      status: req.query.status,
      query: req.query.q,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const coupon = await couponService.adminCreateCoupon(req.body);
    audit.recordSafe({
      ...audit.fromReq(req),
      action: "coupon.create",
      targetType: "coupon",
      targetId: coupon.id,
      metadata: { code: coupon.code },
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const coupon = await couponService.adminUpdateCoupon({
      couponId: req.params.id,
      input: req.body,
    });
    audit.recordSafe({
      ...audit.fromReq(req),
      action: "coupon.update",
      targetType: "coupon",
      targetId: coupon.id,
      metadata: { code: coupon.code, fields: Object.keys(req.body) },
    });
    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await couponService.adminGetCoupon(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function redemptions(req, res, next) {
  try {
    const data = await couponService.adminListRedemptions({
      couponId: req.params.id,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  update,
  getOne,
  redemptions,
};
