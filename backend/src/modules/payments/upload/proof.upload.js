/**
 * @fileoverview Multer config for payment proof uploads.
 *
 * Memory storage so we can hash and magic-byte sniff before persisting.
 * Caps and MIME allowlist are enforced both here AND in the magic-byte
 * check downstream (defense in depth).
 */

const multer = require("multer");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 4096,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("UNSUPPORTED_MIME"));
      return;
    }
    cb(null, true);
  },
});

/**
 * Sniff magic bytes to confirm declared MIME. Filenames and Content-Type
 * are user-controlled and cannot be trusted.
 *
 * Returns the detected mime, or null if unrecognised.
 */
function sniffMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const b = buffer;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return "image/png";
  // WEBP: 52 49 46 46 .. .. .. .. 57 45 42 50  ("RIFF...WEBP")
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return "image/webp";
  // PDF: 25 50 44 46 ("%PDF")
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46)
    return "application/pdf";
  return null;
}

module.exports = {
  proofUpload,
  sniffMagicBytes,
  ALLOWED_MIME,
  MAX_BYTES,
};
