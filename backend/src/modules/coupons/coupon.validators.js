/**
 * @fileoverview Joi validators for custom coupon endpoints.
 */

const Joi = require("joi");

const uuid = Joi.string().uuid().required();
const couponCode = Joi.string()
  .trim()
  .uppercase()
  .min(3)
  .max(32)
  .pattern(/^[A-Z0-9][A-Z0-9_-]{2,31}$/);

const couponBody = Joi.object({
  code: couponCode.required(),
  type: Joi.string().valid("fixed", "percentage").required(),
  value: Joi.number().positive().required(),
  maxDiscountInrPaise: Joi.number().integer().min(0).allow(null).optional(),
  minPurchaseInrPaise: Joi.number().integer().min(0).default(0),
  usageLimit: Joi.number().integer().min(0).allow(null).optional(),
  perUserUsageLimit: Joi.number().integer().min(1).allow(null).optional(),
  allowedEmailDomains: Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9.-]+\.[a-z]{2,}$/)
    )
    .default([]),
  firstPurchaseOnly: Joi.boolean().default(false),
  active: Joi.boolean().default(true),
  expiresAt: Joi.date().iso().allow(null).optional(),
});

const couponUpdateBody = Joi.object({
  code: couponCode.optional(),
  type: Joi.string().valid("fixed", "percentage").optional(),
  value: Joi.number().positive().optional(),
  maxDiscountInrPaise: Joi.number().integer().min(0).allow(null).optional(),
  minPurchaseInrPaise: Joi.number().integer().min(0).optional(),
  usageLimit: Joi.number().integer().min(0).allow(null).optional(),
  perUserUsageLimit: Joi.number().integer().min(1).allow(null).optional(),
  allowedEmailDomains: Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9.-]+\.[a-z]{2,}$/)
    )
    .optional(),
  firstPurchaseOnly: Joi.boolean().optional(),
  active: Joi.boolean().optional(),
  expiresAt: Joi.date().iso().allow(null).optional(),
}).min(1);

const validateCoupon = {
  body: Joi.object({
    couponCode: Joi.string().trim().min(1).max(32).required(),
    planId: uuid,
    originalAmount: Joi.number().optional(),
    userId: Joi.string().uuid().optional(),
  }),
};

const adminListQuery = {
  query: Joi.object({
    status: Joi.string().valid("active", "inactive", "expired", "all").default("all"),
    q: Joi.string().trim().max(64).allow("").optional(),
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

const couponIdParam = {
  params: Joi.object({ id: uuid }),
};

const couponRedemptions = {
  params: Joi.object({ id: uuid }),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

const createCoupon = {
  body: couponBody,
};

const updateCoupon = {
  params: Joi.object({ id: uuid }),
  body: couponUpdateBody,
};

module.exports = {
  validateCoupon,
  adminListQuery,
  couponIdParam,
  couponRedemptions,
  createCoupon,
  updateCoupon,
};
