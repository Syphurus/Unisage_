/**
 * @fileoverview Analytics service — aggregates platform-wide statistics for admin dashboard.
 */

const { supabase } = require("../config/database");
const logger = require("../utils/logger");

/**
 * Compute platform-wide analytics.
 *
 * @returns {Promise<Object>} Analytics data
 */
async function getPlatformAnalytics() {
  try {
    // Run all queries in parallel for performance
    const [
      usersResult,
      subjectsResult,
      contentResult,
      quizAttemptsResult,
      activeUsersResult,
      studySessionsResult,
    ] = await Promise.all([
      // Total users
      supabase.from("users").select("id", { count: "exact", head: true }),
      // Total active subjects
      supabase
        .from("subjects")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // Total published content
      supabase
        .from("content")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      // Total quiz attempts
      supabase
        .from("quiz_attempts")
        .select("id, score, total_questions", { count: "exact" }),
      // Users active in last 7 days
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte(
          "last_active",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
      // Total study sessions & duration
      supabase.from("study_sessions").select("duration", { count: "exact" }),
    ]);

    // Calculate average quiz score
    let avgQuizScore = 0;
    if (quizAttemptsResult.data && quizAttemptsResult.data.length > 0) {
      const totalScore = quizAttemptsResult.data.reduce(
        (sum, a) =>
          sum +
          (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0),
        0
      );
      avgQuizScore = Math.round(totalScore / quizAttemptsResult.data.length);
    }

    // Calculate total study time
    let totalStudyMinutes = 0;
    if (studySessionsResult.data) {
      totalStudyMinutes = Math.round(
        studySessionsResult.data.reduce(
          (sum, s) => sum + (s.duration || 0),
          0
        ) / 60
      );
    }

    return {
      users: {
        total: usersResult.count || 0,
        activeLastWeek: activeUsersResult.count || 0,
      },
      content: {
        totalSubjects: subjectsResult.count || 0,
        totalPublished: contentResult.count || 0,
      },
      quizzes: {
        totalAttempts: quizAttemptsResult.count || 0,
        averageScore: avgQuizScore,
      },
      studySessions: {
        total: studySessionsResult.count || 0,
        totalMinutes: totalStudyMinutes,
      },
    };
  } catch (err) {
    logger.error("Analytics computation failed", { error: err.message });
    throw new Error("Failed to compute analytics");
  }
}

/**
 * Get study statistics for a specific user.
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function getUserStudyStats(userId) {
  const [sessionsResult, progressResult, quizResult, activityResult] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("duration, subject_id, started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("user_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("quiz_attempts")
      .select("score, total_questions")
      .eq("user_id", userId),
    // Fetch all activity dates for streak calculation
    supabase
      .from("user_progress")
      .select("last_accessed")
      .eq("user_id", userId)
      .order("last_accessed", { ascending: false })
      .limit(200),
  ]);

  // Total study time in minutes
  const totalMinutes = Math.round(
    (sessionsResult.data || []).reduce((sum, s) => sum + (s.duration || 0), 0) /
      60
  );

  // Sessions this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionsThisWeek = (sessionsResult.data || []).filter(
    (s) => s.started_at >= weekAgo
  ).length;

  // Average quiz score
  let avgScore = 0;
  const quizData = quizResult.data || [];
  if (quizData.length > 0) {
    const totalPct = quizData.reduce(
      (sum, a) =>
        sum + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0),
      0
    );
    avgScore = Math.round(totalPct / quizData.length);
  }

  // Calculate consecutive-day streak from activity dates
  // Collect unique active dates (YYYY-MM-DD) from both progress and sessions
  const activeDatesSet = new Set();
  (activityResult.data || []).forEach((p) => {
    if (p.last_accessed) {
      activeDatesSet.add(new Date(p.last_accessed).toISOString().slice(0, 10));
    }
  });
  (sessionsResult.data || []).forEach((s) => {
    if (s.started_at) {
      activeDatesSet.add(new Date(s.started_at).toISOString().slice(0, 10));
    }
  });

  // Sort dates descending and compute consecutive streak
  const sortedDates = Array.from(activeDatesSet).sort().reverse();
  let currentStreak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (sortedDates.length > 0) {
    // Streak must include today or yesterday to be active
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffMs = prev.getTime() - curr.getTime();
        const diffDays = Math.round(diffMs / 86400000);
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Weekly activity: which of the last 7 days had activity (Mon–Sun)
  const weeklyActivity = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    weeklyActivity.push(activeDatesSet.has(d));
  }

  return {
    totalStudyMinutes: totalMinutes,
    totalSessions: (sessionsResult.data || []).length,
    sessionsThisWeek,
    completedContent: progressResult.count || 0,
    quizzesAttempted: quizData.length,
    averageQuizScore: avgScore,
    currentStreak,
    weeklyActivity,
  };
}

module.exports = { getPlatformAnalytics, getUserStudyStats };
