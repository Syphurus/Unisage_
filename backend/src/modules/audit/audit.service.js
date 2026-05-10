/**
 * @fileoverview Audit logger. Append-only via DB trigger.
 *
 * Critical actions MUST audit — never call this fire-and-forget on a
 * security-sensitive path. Use `record` (awaited) inside the same handler.
 * `recordSafe` is a fallback that logs to winston if the DB insert fails,
 * for non-blocking informational events.
 */

const { supabase } = require("../../config/database");
const logger = require("../../utils/logger");

/**
 * @typedef {Object} AuditEntry
 * @property {'user'|'admin'|'system'} actorType
 * @property {string|null} actorId
 * @property {string} action            e.g. 'payment.approve'
 * @property {string} [targetType]      e.g. 'payment'
 * @property {string} [targetId]
 * @property {string} [ip]
 * @property {string} [userAgent]
 * @property {Object} [metadata]
 */

/**
 * Insert an audit log row. Awaited — throws on failure.
 * Use for security-critical actions (approve/reject/revoke/etc).
 */
async function record(entry) {
  const row = {
    actor_type: entry.actorType,
    actor_id: entry.actorId || null,
    action: entry.action,
    target_type: entry.targetType || null,
    target_id: entry.targetId || null,
    ip: entry.ip || null,
    user_agent: entry.userAgent || null,
    metadata: entry.metadata || {},
  };
  const { error } = await supabase.from("audit_logs").insert(row);
  if (error) {
    logger.error("audit insert failed", { error: error.message, action: entry.action });
    throw error;
  }
}

/**
 * Fire-and-forget variant. Logs locally on DB failure but does not throw.
 * Use only for informational events where audit miss is acceptable.
 */
function recordSafe(entry) {
  record(entry).catch((err) =>
    logger.warn("audit.recordSafe swallowed error", {
      error: err.message,
      action: entry.action,
    })
  );
}

/**
 * Record a security event (suspicious activity, rate-limit hit, etc.).
 * Severity is one of 'info','warn','suspicious','critical'.
 */
async function security({ severity, category, userId, ip, metadata }) {
  const { error } = await supabase.from("security_events").insert({
    severity,
    category,
    user_id: userId || null,
    ip: ip || null,
    metadata: metadata || {},
  });
  if (error) {
    logger.error("security_event insert failed", { error: error.message, severity, category });
  }
}

/**
 * Helper to pull common request metadata. Use in handlers:
 *   await audit.record({ ...audit.fromReq(req), action: 'payment.approve', ... })
 */
function fromReq(req) {
  return {
    actorType: req.user?.role === "admin" ? "admin" : "user",
    actorId: req.user?.id || null,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || null,
  };
}

module.exports = { record, recordSafe, security, fromReq };
