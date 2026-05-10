/**
 * @fileoverview Progress controller — tracks user content completion and study time.
 */

const { supabase } = require("../config/database");
const { NotFoundError } = require("../utils/errors");

/**
 * GET /api/progress
 * Get all progress entries for the current user.
 */
async function getProgress(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("user_progress")
      .select(
        `
        id, completed, time_spent, last_accessed, completed_at,
        content!user_progress_content_id_fkey(
          id, type, title,
          units!content_unit_id_fkey(
            id, title, unit_number,
            subjects!units_subject_id_fkey(id, name, code)
          )
        )
      `
      )
      .eq("user_id", userId)
      .order("last_accessed", { ascending: false });

    if (error) throw new Error("Failed to fetch progress");

    res.json({
      success: true,
      data: (data || []).map((p) => ({
        id: p.id,
        completed: p.completed,
        timeSpent: p.time_spent,
        lastAccessed: p.last_accessed,
        completedAt: p.completed_at,
        content: p.content
          ? {
              id: p.content.id,
              type: p.content.type,
              title: p.content.title,
              unit: p.content.units
                ? {
                    id: p.content.units.id,
                    title: p.content.units.title,
                    subject: p.content.units.subjects || null,
                  }
                : null,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/progress/subject/:subjectId
 * Get progress for a specific subject (all content across all units).
 *
 * Phase-2: prefer the subject_progress rollup for the headline numbers
 * (totalContent, completedContent, percentage) — that's an indexed
 * point-read instead of three queries plus client-side math. The detailed
 * per-content `progress` array still comes from a live query because the
 * UI relies on per-content state (timeSpent, completed_at).
 */
async function getSubjectProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { subjectId } = req.params;

    // 1. Try the rollup first.
    const { data: rollup } = await supabase
      .from("subject_progress")
      .select("total_content, completed_content, completion_pct, weakness_score, last_studied_at")
      .eq("user_id", userId)
      .eq("subject_id", subjectId)
      .maybeSingle();

    // Get all units for this subject
    const { data: units, error: unitsErr } = await supabase
      .from("units")
      .select("id")
      .eq("subject_id", subjectId);

    if (unitsErr) throw new Error("Failed to fetch units");

    const unitIds = (units || []).map((u) => u.id);

    if (unitIds.length === 0) {
      return res.json({
        success: true,
        data: {
          totalContent: 0,
          completedContent: 0,
          percentage: 0,
          progress: [],
        },
      });
    }

    // Get all published content for these units
    const { data: allContent, error: contentErr } = await supabase
      .from("content")
      .select("id")
      .in("unit_id", unitIds)
      .eq("is_published", true);

    if (contentErr) throw new Error("Failed to fetch content");

    const contentIds = (allContent || []).map((c) => c.id);

    // Get user progress for these content items
    const { data: progress, error: progressErr } = await supabase
      .from("user_progress")
      .select("id, content_id, completed, time_spent, completed_at")
      .eq("user_id", userId)
      .in("content_id", contentIds);

    if (progressErr) throw new Error("Failed to fetch progress");

    const completedCount = (progress || []).filter((p) => p.completed).length;

    // Live values (always correct, recomputed every request).
    const liveTotal = contentIds.length;
    const liveCompleted = completedCount;
    const livePercentage =
      liveTotal > 0 ? Math.round((liveCompleted / liveTotal) * 100) : 0;

    // Headline numbers prefer the rollup ONLY if it exists AND its content
    // count matches what's currently published — otherwise the rollup is
    // stale relative to admin content edits and we'd show wrong totals.
    const useRollup =
      rollup &&
      typeof rollup.total_content === "number" &&
      rollup.total_content === liveTotal;

    res.json({
      success: true,
      data: {
        totalContent: useRollup ? rollup.total_content : liveTotal,
        completedContent: useRollup ? rollup.completed_content : liveCompleted,
        percentage: useRollup ? rollup.completion_pct : livePercentage,
        weaknessScore: rollup?.weakness_score ?? null,
        lastStudiedAt: rollup?.last_studied_at ?? null,
        progress: (progress || []).map((p) => ({
          id: p.id,
          contentId: p.content_id,
          completed: p.completed,
          timeSpent: p.time_spent,
          completedAt: p.completed_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/progress
 * Mark content as completed or create/update a progress entry.
 * Body: { contentId, timeSpent }
 */
async function createProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { contentId, timeSpent = 0 } = req.body;

    // Verify content exists
    const { data: content, error: contentErr } = await supabase
      .from("content")
      .select("id")
      .eq("id", contentId)
      .single();

    if (contentErr || !content) throw new NotFoundError("Content");

    // Upsert progress (create or update)
    const { data: existing } = await supabase
      .from("user_progress")
      .select("id, time_spent")
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .single();

    let result;
    if (existing) {
      // Update: accumulate time spent, mark completed
      const { data, error } = await supabase
        .from("user_progress")
        .update({
          completed: true,
          time_spent: existing.time_spent + timeSpent,
          last_accessed: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new Error("Failed to update progress");
      result = data;
    } else {
      // Create new progress entry
      const { data, error } = await supabase
        .from("user_progress")
        .insert({
          user_id: userId,
          content_id: contentId,
          completed: true,
          time_spent: timeSpent,
          last_accessed: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error("Failed to create progress");
      result = data;
    }

    res.status(existing ? 200 : 201).json({
      success: true,
      data: {
        id: result.id,
        contentId: result.content_id,
        completed: result.completed,
        timeSpent: result.time_spent,
        lastAccessed: result.last_accessed,
        completedAt: result.completed_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/progress/:id
 * Update a specific progress entry.
 */
async function updateProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { completed, timeSpent } = req.body;

    // Verify ownership
    const { data: existing, error: findErr } = await supabase
      .from("user_progress")
      .select("id, time_spent")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (findErr || !existing) throw new NotFoundError("Progress entry");

    const updateData = { last_accessed: new Date().toISOString() };
    if (completed !== undefined) {
      updateData.completed = completed;
      if (completed) updateData.completed_at = new Date().toISOString();
    }
    if (timeSpent !== undefined) {
      updateData.time_spent = timeSpent;
    }

    const { data, error } = await supabase
      .from("user_progress")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error("Failed to update progress");

    res.json({
      success: true,
      data: {
        id: data.id,
        contentId: data.content_id,
        completed: data.completed,
        timeSpent: data.time_spent,
        lastAccessed: data.last_accessed,
        completedAt: data.completed_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProgress,
  getSubjectProgress,
  createProgress,
  updateProgress,
};
