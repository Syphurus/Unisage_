/**
 * @fileoverview Study sessions controller — tracks study session start/end and statistics.
 */

const { supabase } = require("../config/database");
const { NotFoundError } = require("../utils/errors");
const analyticsService = require("../services/analytics.service");

/**
 * POST /api/sessions/start
 * Start a new study session.
 * Body: { subjectId }
 */
async function startSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { subjectId } = req.body;

    // Verify subject exists
    const { data: subject, error: subErr } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .single();

    if (subErr || !subject) throw new NotFoundError("Subject");

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        subject_id: subjectId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error("Failed to start study session");

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        subjectId: data.subject_id,
        startedAt: data.started_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/sessions/:id/end
 * End an active study session.
 */
async function endSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership and that session is still active
    const { data: session, error: findErr } = await supabase
      .from("study_sessions")
      .select("id, started_at, ended_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (findErr || !session) throw new NotFoundError("Study session");

    if (session.ended_at) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Session has already ended",
        },
      });
    }

    const endedAt = new Date();
    const startedAt = new Date(session.started_at);
    const durationSeconds = Math.round((endedAt - startedAt) / 1000);

    const { data, error } = await supabase
      .from("study_sessions")
      .update({
        ended_at: endedAt.toISOString(),
        duration: durationSeconds,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error("Failed to end study session");

    res.json({
      success: true,
      data: {
        id: data.id,
        subjectId: data.subject_id,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        durationSeconds: data.duration,
        durationMinutes: Math.round(data.duration / 60),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sessions/stats
 * Get study statistics for the current user.
 */
async function getStats(req, res, next) {
  try {
    const stats = await analyticsService.getUserStudyStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { startSession, endSession, getStats };
