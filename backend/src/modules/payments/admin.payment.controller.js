/**
 * @fileoverview Admin payment controllers.
 *
 * All actions in this file write audit logs from within payment.service. The
 * controller layer's job is request shaping and concurrency-token enforcement.
 */

const paymentService = require("./payment.service");
const proofStorage = require("./upload/proof.storage");
const { supabase } = require("../../config/database");
const audit = require("../audit/audit.service");
const {
  ConflictError,
  ValidationError,
  NotFoundError,
} = require("../../utils/errors");

function readExpectedVersion(req) {
  // Prefer If-Match header; fall back to body.expectedVersion (validators allow it).
  const header = req.header("If-Match");
  if (header != null) {
    const n = Number.parseInt(header, 10);
    if (!Number.isFinite(n) || n < 0) {
      throw new ValidationError(
        "If-Match header must be a non-negative integer"
      );
    }
    return n;
  }
  if (typeof req.body.expectedVersion === "number")
    return req.body.expectedVersion;
  throw new ValidationError(
    "Concurrency token required (If-Match or body.expectedVersion)"
  );
}

async function queue(req, res, next) {
  try {
    const { status, q, limit, offset } = req.query;
    const data = await paymentService.adminListQueue({
      status,
      query: q,
      limit,
      offset,
    });
    res.json({
      success: true,
      data: { rows: data.rows.map(serializeAdminPayment), total: data.total },
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await paymentService.adminGetPayment({
      paymentId: req.params.id,
    });
    let proofUrl = null;
    if (result.upload) {
      const signed = await proofStorage.getSignedUrl({
        bucket: result.upload.storage_bucket,
        key: result.upload.storage_key,
      });
      proofUrl = signed.url;
    }

    audit.recordSafe({
      ...audit.fromReq(req),
      action: "payment.admin.view",
      targetType: "payment",
      targetId: req.params.id,
    });

    res.json({
      success: true,
      data: {
        payment: serializeAdminPayment(result.payment),
        user: result.user,
        events: result.events,
        upload: result.upload
          ? {
              id: result.upload.id,
              mimeType: result.upload.mime_type,
              sizeBytes: result.upload.size_bytes,
              sha256: result.upload.sha256,
              uploadedAt: result.upload.uploaded_at,
              signedUrl: proofUrl,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const expectedVersion = readExpectedVersion(req);
    const data = await paymentService.approve({
      admin: req.user,
      paymentId: req.params.id,
      expectedVersion,
      note: req.body.note,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const expectedVersion = readExpectedVersion(req);
    const data = await paymentService.reject({
      admin: req.user,
      paymentId: req.params.id,
      expectedVersion,
      reason: req.body.reason,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function revoke(req, res, next) {
  try {
    const expectedVersion = readExpectedVersion(req);
    const data = await paymentService.revoke({
      admin: req.user,
      paymentId: req.params.id,
      expectedVersion,
      reason: req.body.reason,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const expectedVersion = readExpectedVersion(req);
    const data = await paymentService.adminCancel({
      admin: req.user,
      paymentId: req.params.id,
      expectedVersion,
      req,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listAudit(req, res, next) {
  try {
    const paymentId = req.query.paymentId;
    let q = supabase
      .from("audit_logs")
      .select(
        "id, actor_type, actor_id, action, target_type, target_id, ip, metadata, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (paymentId)
      q = q.eq("target_type", "payment").eq("target_id", paymentId);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function serializeAdminPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    referenceCode: row.reference_code,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    amountInrPaise: row.amount_inr_paise,
    amountInr: (row.amount_inr_paise / 100).toFixed(2),
    scopes: row.scopes,
    durationDays: row.duration_days,
    utr: row.utr_normalized,
    proofUploadId: row.proof_upload_id,
    notes: row.notes,
    rejectReason: row.reject_reason,
    revokeReason: row.revoke_reason,
    version: row.version,
    provider: row.provider,
    intentExpiresAt: row.intent_expires_at,
    submissionExpiresAt: row.submission_expires_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    revokedAt: row.revoked_at,
    approvedBy: row.approved_by,
    rejectedBy: row.rejected_by,
    revokedBy: row.revoked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { queue, getOne, approve, reject, revoke, cancel, listAudit };
