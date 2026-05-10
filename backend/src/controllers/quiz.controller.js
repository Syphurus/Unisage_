/**
 * @fileoverview Quiz controller — handles quiz attempt submission and retrieval.
 */

const { supabase } = require("../config/database");
const { NotFoundError } = require("../utils/errors");

/**
 * POST /api/quiz/attempt
 * Submit a quiz attempt.
 * Body: { contentId, score, totalQuestions, answers, timeTaken }
 */
async function submitAttempt(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      contentId,
      score,
      totalQuestions,
      answers,
      timeTaken,
      perQuestion,
    } = req.body;

    // Verify content exists and is a quiz
    const { data: content, error: contentErr } = await supabase
      .from("content")
      .select("id, type")
      .eq("id", contentId)
      .single();

    if (contentErr || !content) throw new NotFoundError("Content");

    if (content.type !== "quiz") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Content is not a quiz",
        },
      });
    }

    // perQuestion is optional — older clients may not send it. Only include
    // it in the insert when present so we don't overwrite NULLs with [].
    const insertRow = {
      user_id: userId,
      content_id: contentId,
      score,
      total_questions: totalQuestions,
      answers: answers || {},
      time_taken: timeTaken || null,
    };
    if (Array.isArray(perQuestion) && perQuestion.length > 0) {
      insertRow.per_question = perQuestion;
    }

    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert(insertRow)
      .select()
      .single();

    if (error) throw new Error("Failed to submit quiz attempt");

    // Also mark as completed in user_progress
    const { data: existing } = await supabase
      .from("user_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .single();

    if (!existing) {
      await supabase.from("user_progress").insert({
        user_id: userId,
        content_id: contentId,
        completed: true,
        time_spent: timeTaken || 0,
        completed_at: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        contentId: data.content_id,
        score: data.score,
        totalQuestions: data.total_questions,
        percentage:
          data.total_questions > 0
            ? Math.round((data.score / data.total_questions) * 100)
            : 0,
        timeTaken: data.time_taken,
        attemptedAt: data.attempted_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quiz/attempts/user
 * Get all quiz attempts for the current user.
 */
async function getUserAttempts(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select(
        `
        id, score, total_questions, time_taken, attempted_at,
        content!quiz_attempts_content_id_fkey(id, title,
          units!content_unit_id_fkey(id, title,
            subjects!units_subject_id_fkey(id, name)
          )
        )
      `
      )
      .eq("user_id", userId)
      .order("attempted_at", { ascending: false });

    if (error) throw new Error("Failed to fetch quiz attempts");

    res.json({
      success: true,
      data: (data || []).map((a) => ({
        id: a.id,
        score: a.score,
        totalQuestions: a.total_questions,
        percentage:
          a.total_questions > 0
            ? Math.round((a.score / a.total_questions) * 100)
            : 0,
        timeTaken: a.time_taken,
        attemptedAt: a.attempted_at,
        content: a.content
          ? {
              id: a.content.id,
              title: a.content.title,
              unit: a.content.units || null,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quiz/attempts/content/:contentId
 * Get all quiz attempts for a specific content item by the current user.
 */
async function getContentAttempts(req, res, next) {
  try {
    const userId = req.user.id;
    const { contentId } = req.params;

    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("id, score, total_questions, answers, time_taken, attempted_at")
      .eq("user_id", userId)
      .eq("content_id", contentId)
      .order("attempted_at", { ascending: false });

    if (error) throw new Error("Failed to fetch quiz attempts");

    res.json({
      success: true,
      data: (data || []).map((a) => ({
        id: a.id,
        score: a.score,
        totalQuestions: a.total_questions,
        percentage:
          a.total_questions > 0
            ? Math.round((a.score / a.total_questions) * 100)
            : 0,
        answers: a.answers,
        timeTaken: a.time_taken,
        attemptedAt: a.attempted_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAttempt, getUserAttempts, getContentAttempts };
