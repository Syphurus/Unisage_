/**
 * @fileoverview Joi validators for payment endpoints.
 */

const Joi = require("joi");

const uuid = Joi.string().uuid().required();

const createIntent = {
  body: Joi.object({
    planId: uuid,
  }),
};

const createRazorpayOrder = {
  body: Joi.object({
    planId: uuid,
  }),
};

const verifyRazorpayPayment = {
  body: Joi.object({
    paymentId: uuid,
    razorpay_payment_id: Joi.string().trim().required(),
    razorpay_order_id: Joi.string().trim().required(),
    razorpay_signature: Joi.string().trim().required(),
  }),
};

const paymentIdParam = {
  params: Joi.object({ id: uuid }),
};

// Submit proof: multipart form. After multer, `req.body` has `utr` as a string.
const submitProof = {
  params: Joi.object({ id: uuid }),
  body: Joi.object({
    utr: Joi.string().trim().min(8).max(32).pattern(/^[A-Za-z0-9]+$/).required(),
  }),
};

const adminReject = {
  params: Joi.object({ id: uuid }),
  body: Joi.object({
    reason: Joi.string().trim().min(3).max(500).required(),
    expectedVersion: Joi.number().integer().min(0).required(),
  }),
};

const adminApprove = {
  params: Joi.object({ id: uuid }),
  body: Joi.object({
    note: Joi.string().trim().max(500).allow("").optional(),
    expectedVersion: Joi.number().integer().min(0).required(),
  }),
};

const adminRevoke = {
  params: Joi.object({ id: uuid }),
  body: Joi.object({
    reason: Joi.string().trim().min(3).max(500).required(),
    expectedVersion: Joi.number().integer().min(0).required(),
  }),
};

const adminQueueQuery = {
  query: Joi.object({
    status: Joi.string()
      .valid(
        "created",
        "awaiting_submission",
        "pending_verification",
        "approved",
        "rejected",
        "expired",
        "cancelled",
        "revoked",
        "refunded"
      )
      .optional(),
    q: Joi.string().trim().max(64).optional(),
    limit: Joi.number().integer().min(1).max(100).default(25),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

module.exports = {
  createIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
  paymentIdParam,
  submitProof,
  adminApprove,
  adminReject,
  adminRevoke,
  adminQueueQuery,
};
