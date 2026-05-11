/**
 * @fileoverview User-facing payment controllers.
 */

const crypto = require("crypto");
const paymentService = require("./payment.service");
const entitlementService = require("../entitlements/entitlement.service");
const proofUpload = require("./upload/proof.upload");
const proofStorage = require("./upload/proof.storage");
const audit = require("../audit/audit.service");
const { ValidationError } = require("../../utils/errors");
const logger = require("../../utils/logger");

async function getPlans(_req, res, next) {
  try {
    const plans = await paymentService.listActivePlans();
    res.json({
      success: true,
      data: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        amountInrPaise: p.amount_inr_paise,
        amountInr: (p.amount_inr_paise / 100).toFixed(2),
        durationDays: p.duration_days,
        scopes: p.scopes,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function createIntent(req, res, next) {
  try {
    const result = await paymentService.createIntent({
      user: req.user,
      planId: req.body.planId,
      req,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createRazorpayOrder(req, res, next) {
  try {
    const result = await paymentService.createRazorpayOrder({
      user: req.user,
      planId: req.body.planId,
      couponCode: req.body.couponCode,
      req,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function verifyRazorpayPayment(req, res, next) {
  try {
    const result = await paymentService.verifyRazorpayPayment({
      user: req.user,
      paymentId: req.body.paymentId,
      razorpayPaymentId: req.body.razorpay_payment_id,
      razorpayOrderId: req.body.razorpay_order_id,
      razorpaySignature: req.body.razorpay_signature,
      req,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function submitProof(req, res, next) {
  try {
    let uploadMeta = null;

    if (req.file) {
      const sniffed = proofUpload.sniffMagicBytes(req.file.buffer);
      if (!sniffed) {
        throw new ValidationError("Uploaded file format is not recognised");
      }
      if (sniffed !== req.file.mimetype) {
        // Magic bytes disagree with declared MIME → reject.
        audit.security({
          severity: "suspicious",
          category: "upload_mime_mismatch",
          userId: req.user.id,
          ip: req.ip,
          metadata: { declared: req.file.mimetype, sniffed },
        });
        throw new ValidationError("File contents do not match declared type");
      }

      const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

      const { bucket, key } = await proofStorage.uploadProof({
        paymentId: req.params.id,
        buffer: req.file.buffer,
        mime: sniffed,
      });

      uploadMeta = {
        storage_bucket: bucket,
        storage_key: key,
        mime_type: sniffed,
        size_bytes: req.file.size,
        sha256,
      };
    }

    const result = await paymentService.submitProof({
      user: req.user,
      paymentId: req.params.id,
      utr: req.body.utr,
      upload: uploadMeta,
      req,
    });

    res.json({
      success: true,
      data: { paymentId: result.payment_id, status: "pending_verification" },
    });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    await paymentService.cancel({
      user: req.user,
      paymentId: req.params.id,
      req,
    });
    res.json({ success: true, data: { paymentId: req.params.id, status: "cancelled" } });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const row = await paymentService.getUserPayment({
      user: req.user,
      paymentId: req.params.id,
    });
    res.json({ success: true, data: serializeUserPayment(row) });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const rows = await paymentService.listUserPayments({ user: req.user });
    res.json({ success: true, data: rows.map(serializeUserPayment) });
  } catch (err) {
    next(err);
  }
}

async function getMyEntitlements(req, res, next) {
  try {
    const active = await entitlementService.listActive(req.user.id);
    res.json({
      success: true,
      data: {
        scopes: active.map((e) => ({ scope: e.scope, expiresAt: e.expiresAt })),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Multer error handler — converts INTERNAL multer/our-own errors to JSON.
 */
function handleUploadError(err, _req, res, next) {
  if (!err) return next();

  // multer.MulterError or our 'UNSUPPORTED_MIME'
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: { code: "FILE_TOO_LARGE", message: "Proof must be under 5 MB" },
    });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE" || err.message === "UNSUPPORTED_MIME") {
    return res.status(415).json({
      success: false,
      error: {
        code: "UNSUPPORTED_MEDIA",
        message: "Allowed types: JPEG, PNG, WEBP, PDF",
      },
    });
  }
  if (err.name === "MulterError") {
    logger.warn("multer error", { code: err.code, message: err.message });
    return res
      .status(400)
      .json({ success: false, error: { code: "UPLOAD_ERROR", message: err.message } });
  }
  next(err);
}

function serializeUserPayment(row) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    status: row.status,
    amountInrPaise: row.amount_inr_paise,
    amountInr: (row.amount_inr_paise / 100).toFixed(2),
    scopes: row.scopes,
    durationDays: row.duration_days,
    version: row.version,
    intentExpiresAt: row.intent_expires_at,
    submissionExpiresAt: row.submission_expires_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    revokedAt: row.revoked_at,
    rejectReason: row.reject_reason,
    revokeReason: row.revoke_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  getPlans,
  createIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
  submitProof,
  cancel,
  getOne,
  listMine,
  getMyEntitlements,
  handleUploadError,
};
