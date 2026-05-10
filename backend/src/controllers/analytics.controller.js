/**
 * @fileoverview Analytics controller — ingestion + dashboard reads.
 *
 * Ingestion endpoints are kept thin; the heavy lifting lives in
 * analytics.ingest.service.js. Read endpoints delegate to
 * analytics.read.service.js.
 */

const ingest = require("../services/analytics.ingest.service");
const reads = require("../services/analytics.read.service");
const logger = require("../utils/logger");

/**
 * POST /api/analytics/heartbeat
 * Body validated by validators.heartbeat.
 *
 * Lightweight: bounded delta, 1–2 indexed point operations.
 * Returns the canonical sessionId so the client can pass it back on the
 * next heartbeat (saves a lookup server-side).
 */
async function heartbeat(req, res, next) {
  try {
    const result = await ingest.recordHeartbeat(req.user.id, req.body);
    res.status(200).json({
      success: true,
      data: {
        sessionId: result.sessionId,
        totalActiveSeconds: result.totalActiveSeconds,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analytics/events
 * Body: { events: [{ type, contentId?, subjectId?, payload?, occurredAt? }, ...] }
 */
async function events(req, res, next) {
  try {
    const inserted = await ingest.recordEvents(req.user.id, req.body.events);
    res.status(201).json({ success: true, data: { inserted } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/me
 * Rollup-backed dashboard payload. Falls back to live aggregation when
 * rollups are absent.
 */
async function getMyDashboard(req, res, next) {
  try {
    const data = await reads.getUserDashboardStats(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/me/subjects
 * Per-subject completion + weakness ranking. Highest weakness first —
 * front-end uses this directly to render "study these first".
 */
async function getMySubjectProgress(req, res, next) {
  try {
    const data = await reads.getUserSubjectProgress(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  heartbeat,
  events,
  getMyDashboard,
  getMySubjectProgress,
};
