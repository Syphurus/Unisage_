/**
 * @fileoverview Supabase Storage abstraction for payment proofs.
 *
 * Bucket name comes from env (`PAYMENT_PROOF_BUCKET`). The bucket MUST be
 * private — public reads would expose user payment screenshots. Admins
 * fetch proofs via short-lived signed URLs issued server-side.
 */

const crypto = require("crypto");
const { supabase } = require("../../../config/database");
const env = require("../../../config/env");
const logger = require("../../../utils/logger");

const SIGNED_URL_TTL_SECONDS = 60;

function extensionForMime(mime) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function buildKey({ paymentId, mime }) {
  const random = crypto.randomBytes(16).toString("hex");
  const ext = extensionForMime(mime);
  // Store under a path the user cannot guess. No PII in the key.
  return `payments/${paymentId}/${random}.${ext}`;
}

/**
 * Upload a buffer to private storage. Returns the storage key.
 */
async function uploadProof({ paymentId, buffer, mime }) {
  const key = buildKey({ paymentId, mime });
  const { error } = await supabase.storage
    .from(env.PAYMENT_PROOF_BUCKET)
    .upload(key, buffer, {
      contentType: mime,
      upsert: false,
    });
  if (error) {
    logger.error("proof upload failed", { error: error.message, paymentId });
    throw new Error("PROOF_UPLOAD_FAILED");
  }
  return { bucket: env.PAYMENT_PROOF_BUCKET, key };
}

/**
 * Issue a short-lived signed URL to view a proof. Admin-only paths only.
 */
async function getSignedUrl({ bucket, key }) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`signed_url_failed: ${error.message}`);
  return { url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
}

module.exports = { uploadProof, getSignedUrl, SIGNED_URL_TTL_SECONDS };
