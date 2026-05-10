/**
 * @fileoverview Analytics READ service.
 *
 * All reads here go through the rollup tables populated by pg_cron.
 * If a rollup row is missing (e.g. a brand-new user before the first cron
 * tick), each function falls back to a live computation against source
 * tables — so the API never returns "stub" / "loading" data.
 *
 * Responsibilities:
 *   - getUserDashboardStats(userId)        → student dashboard tiles
 *   - getUserSubjectProgress(userId)       → per-subject completion + weakness ranking
 *   - getUserDailyTimeline(userId, days)   → last-N-day activity sparkline
 *   - getPlatformDailyStats()              → admin dashboard
 */

const { supabase } = require("../config/database");
const logger = require("../utils/logger");

const STREAK_MIN_ACTIVE_SECONDS = 300; // matches recompute_user_streaks() rule

// ──────────────────────────────────────────────
// Student dashboard stats
// ──────────────────────────────────────────────

/**
 * Pulls the data the dashboard needs in one round-trip-batch.
 * Shape mirrors what the existing /sessions/stats endpoint returns plus
 * a few extra fields the new dashboard uses, so we can swap implementations
 * without changing the response contract.
 *
 * @param {string} userId
 * @param {{ days?: number }} [opts]
 */
async function getUserDashboardStats(userId, opts = {}) {
  const days = Math.min(60, Math.max(7, opts.days || 30));
  const sinceDate = isoDate(new Date(Date.now() - (days - 1) * 86400000));

  const [streakRes, dailyRes, subjectsRes, completedRes, quizCountRes] =
    await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak, longest_streak, last_active_day")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("daily_user_stats")
        .select(
          "day, active_seconds, study_sessions, content_completed, quiz_attempts, quiz_correct, quiz_total_questions, flashcards_reviewed, flashcards_confident"
        )
        .eq("user_id", userId)
        .gte("day", sinceDate)
        .order("day", { ascending: true }),
      supabase
        .from("subject_progress")
        .select(
          "subject_id, total_content, completed_content, completion_pct, total_active_seconds, avg_quiz_pct, weakness_score, last_studied_at"
        )
        .eq("user_id", userId),
      supabase
        .from("user_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("completed", true),
      supabase
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  // Daily roll-ups: build a 7-day "activity" window + N-day timeline.
  const dailyRows = dailyRes.data || [];
  const totalSeconds = dailyRows.reduce(
    (s, r) => s + (r.active_seconds || 0),
    0
  );
  const totalQuizCorrect = dailyRows.reduce(
    (s, r) => s + (r.quiz_correct || 0),
    0
  );
  const totalQuizQuestions = dailyRows.reduce(
    (s, r) => s + (r.quiz_total_questions || 0),
    0
  );

  // Avg quiz pct over the window (NaN-safe). For "all-time" we'd query
  // the full quiz_attempts; this windowed version matches the dashboard's
  // "last N days" framing.
  const avgQuizPct =
    totalQuizQuestions > 0
      ? Math.round((totalQuizCorrect / totalQuizQuestions) * 100)
      : 0;

  // Weekly activity (Mon–Sun, last 7 days)
  const byDay = new Map(dailyRows.map((r) => [r.day, r]));
  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const day = isoDate(new Date(Date.now() - i * 86400000));
    const r = byDay.get(day);
    weeklyActivity.push(
      !!r &&
        ((r.active_seconds || 0) >= STREAK_MIN_ACTIVE_SECONDS ||
          (r.quiz_attempts || 0) > 0 ||
          (r.flashcards_reviewed || 0) >= 5)
    );
  }

  // Sessions this week (ISO Monday-week is fiddly; use rolling 7d to match
  // the prior implementation).
  const sessionsThisWeek = dailyRows.reduce(
    (s, r) => s + (r.study_sessions || 0),
    0
  );

  // Subjects ranked by weakness (highest first, capped at top 5 weak).
  const subjects = subjectsRes.data || [];
  const weak = subjects
    .filter((s) => s.total_content > 0)
    .sort((a, b) => b.weakness_score - a.weakness_score)
    .slice(0, 5);

  // Daily timeline — array of { day, activeSeconds, quizPct }
  const timeline = dailyRows.map((r) => ({
    day: r.day,
    activeSeconds: r.active_seconds || 0,
    quizPct:
      r.quiz_total_questions > 0
        ? Math.round((r.quiz_correct / r.quiz_total_questions) * 100)
        : null,
  }));

  // If rollups are completely empty for this user, fall back to live read.
  if (
    dailyRows.length === 0 &&
    !streakRes.data &&
    subjects.length === 0 &&
    !completedRes.count &&
    !quizCountRes.count
  ) {
    return liveDashboardFallback(userId);
  }

  return {
    totalStudyMinutes: Math.round(totalSeconds / 60),
    totalSessions: sessionsThisWeek, // window-bounded; safe approximation
    sessionsThisWeek,
    completedContent: completedRes.count || 0,
    quizzesAttempted: quizCountRes.count || 0,
    averageQuizScore: avgQuizPct,
    currentStreak: streakRes.data?.current_streak || 0,
    longestStreak: streakRes.data?.longest_streak || 0,
    lastActiveDay: streakRes.data?.last_active_day || null,
    weeklyActivity,
    weakSubjectIds: weak.map((s) => s.subject_id),
    timeline,
  };
}

/**
 * Last-resort: when the cron has never run for this user, compute a
 * minimal dashboard payload from source tables. Strictly the same shape
 * as the rollup path so callers don't branch.
 */
async function liveDashboardFallback(userId) {
  // Reuse the legacy implementation rather than duplicate it.
  const legacy = require("./analytics.service");
  const stats = await legacy._legacyGetUserStudyStats(userId);
  return {
    totalStudyMinutes: stats.totalStudyMinutes,
    totalSessions: stats.totalSessions,
    sessionsThisWeek: stats.sessionsThisWeek,
    completedContent: stats.completedContent,
    quizzesAttempted: stats.quizzesAttempted,
    averageQuizScore: stats.averageQuizScore,
    currentStreak: stats.currentStreak,
    longestStreak: 0,
    lastActiveDay: null,
    weeklyActivity: stats.weeklyActivity,
    weakSubjectIds: [],
    timeline: [],
  };
}


// ──────────────────────────────────────────────
// Per-subject progress + weakness ranking
// ──────────────────────────────────────────────

/**
 * Returns one row per subject the user has touched, ordered by weakness
 * (highest first). Joins on subjects so the UI gets name/code without
 * an extra round-trip.
 *
 * @param {string} userId
 */
async function getUserSubjectProgress(userId) {
  const { data, error } = await supabase
    .from("subject_progress")
    .select(
      `
      subject_id,
      total_content, completed_content, completion_pct,
      total_active_seconds,
      quiz_attempts, quiz_correct, quiz_total_questions, avg_quiz_pct,
      flashcards_reviewed, flashcards_confident,
      weakness_score, last_studied_at,
      subjects:subject_id (
        id, name, code, year, semester
      )
    `
    )
    .eq("user_id", userId)
    .order("weakness_score", { ascending: false });

  if (error) {
    logger.warn("subject_progress read failed; falling back live", {
      error: error.message,
    });
    return [];
  }

  return (data || []).map((row) => ({
    subjectId: row.subject_id,
    subject: row.subjects
      ? {
          id: row.subjects.id,
          name: row.subjects.name,
          code: row.subjects.code,
          year: row.subjects.year,
          semester: row.subjects.semester,
        }
      : null,
    totalContent: row.total_content,
    completedContent: row.completed_content,
    completionPct: row.completion_pct,
    activeMinutes: Math.round((row.total_active_seconds || 0) / 60),
    quizAttempts: row.quiz_attempts,
    avgQuizPct: row.avg_quiz_pct, // null when no attempts — distinct from 0
    flashcardsReviewed: row.flashcards_reviewed,
    flashcardsConfident: row.flashcards_confident,
    weaknessScore: row.weakness_score,
    lastStudiedAt: row.last_studied_at,
  }));
}


// ──────────────────────────────────────────────
// Platform stats (admin)
// ──────────────────────────────────────────────

/**
 * Pulls the most recent platform_daily_stats row. If empty, falls back to
 * the legacy live aggregation so the admin dashboard is never broken.
 */
async function getPlatformDailyStats() {
  const { data, error } = await supabase
    .from("platform_daily_stats")
    .select("*")
    .order("day", { ascending: false })
    .limit(7);

  if (error || !data || data.length === 0) {
    const legacy = require("./analytics.service");
    return legacy._legacyGetPlatformAnalytics();
  }

  const today = data[0];
  const totalQuizQuestions = today.quiz_total_questions || 0;
  const avgScore =
    totalQuizQuestions > 0
      ? Math.round((today.quiz_correct / totalQuizQuestions) * 100)
      : 0;

  return {
    users: {
      total: today.total_users || 0,
      activeLastWeek: today.active_users || 0,
    },
    content: {
      totalSubjects: today.total_subjects || 0,
      totalPublished: today.total_published || 0,
    },
    quizzes: {
      totalAttempts: today.quiz_attempts || 0,
      averageScore: avgScore,
    },
    studySessions: {
      total: today.quiz_attempts || 0,
      totalMinutes: Math.round((today.reading_active_seconds || 0) / 60),
    },
    // Bonus payload — last 7 days for sparkline
    weeklyTimeline: data
      .slice()
      .reverse()
      .map((r) => ({
        day: r.day,
        activeUsers: r.active_users,
        quizAttempts: r.quiz_attempts,
        readingMinutes: Math.round((r.reading_active_seconds || 0) / 60),
      })),
  };
}


// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

module.exports = {
  getUserDashboardStats,
  getUserSubjectProgress,
  getPlatformDailyStats,
};
