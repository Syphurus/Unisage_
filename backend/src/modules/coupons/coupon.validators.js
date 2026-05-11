/**
 * @fileoverview Joi validators for custom coupon endpoints.
 */

const Joi = require("joi");

const uuid = Joi.string().uuid().required();

const validateCoupon = {
  body: Joi.object({
    couponCode: Joi.string().trim().min(1).max(32).required(),
    planId: uuid,
    originalAmount: Joi.number().optional(),
    userId: Joi.string().uuid().optional(),
  }),
};

module.exports = {
  validateCoupon,
};
