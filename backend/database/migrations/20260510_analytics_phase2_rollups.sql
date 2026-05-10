-- ============================================================
-- Phase 2: Denormalized rollup tables.
-- Read paths (dashboards, "weak subjects", streaks) hit ONLY these tables,
-- so dashboard latency stays O(indexed lookup) instead of O(table scan).
-- Cron jobs (migration 003) populate these from the ingestion tables nightly.
--
-- All tables are pure caches — they can be truncated and rebuilt from the
-- source tables at any time. Existing data in source tables is never touched.
-- ============================================================

-- ──────────────────────────────────────────────
-- daily_user_stats
--
-- One row per (user, calendar day) summarising that day's behaviour.
-- Day boundaries are UTC for consistency; UI can render in local TZ.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_user_stats (
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                  DATE NOT NULL,
  active_seconds       INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  reading_sessions     INTEGER NOT NULL DEFAULT 0,
  study_sessions       INTEGER NOT NULL DEFAULT 0,
  content_completed    INTEGER NOT NULL DEFAULT 0,
  quiz_attempts        INTEGER NOT NULL DEFAULT 0,
  quiz_correct         INTEGER NOT NULL DEFAULT 0,
  quiz_total_questions INTEGER NOT NULL DEFAULT 0,
  flashcards_reviewed  INTEGER NOT NULL DEFAULT 0,
  flashcards_confident INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_daily_user_stats_day
  ON daily_user_stats (day DESC);


-- ──────────────────────────────────────────────
-- user_streaks
--
-- Cached current/longest consecutive-day streak per user. Recomputed nightly
-- from daily_user_stats. A "study day" is any day with active_seconds >=
-- STREAK_MIN_ACTIVE_SECONDS (defined in the cron function — keeps the rule
-- in one place).
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak  INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak  INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_active_day DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- subject_progress
--
-- Denormalized completion + engagement signals per (user, subject).
-- This is what powers "weak subjects, study these first" without needing
-- to scan content + user_progress on every request.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subject_progress (
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id          UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_content       INTEGER NOT NULL DEFAULT 0,
  completed_content   INTEGER NOT NULL DEFAULT 0,
  completion_pct      SMALLINT NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  total_active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (total_active_seconds >= 0),
  quiz_attempts       INTEGER NOT NULL DEFAULT 0,
  quiz_correct        INTEGER NOT NULL DEFAULT 0,
  quiz_total_questions INTEGER NOT NULL DEFAULT 0,
  -- Average quiz percentage over all attempts on this subject's quizzes.
  -- NULL when no quizzes attempted yet — distinct from 0%.
  avg_quiz_pct        SMALLINT CHECK (avg_quiz_pct IS NULL OR avg_quiz_pct BETWEEN 0 AND 100),
  flashcards_reviewed INTEGER NOT NULL DEFAULT 0,
  flashcards_confident INTEGER NOT NULL DEFAULT 0,
  -- Composite weakness score (0–100, higher = weaker, study this first).
  -- Computed in cron from completion + quiz accuracy + recency.
  weakness_score      SMALLINT NOT NULL DEFAULT 0 CHECK (weakness_score BETWEEN 0 AND 100),
  last_studied_at     TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_progress_user_weakness
  ON subject_progress (user_id, weakness_score DESC);

CREATE INDEX IF NOT EXISTS idx_subject_progress_user_completion
  ON subject_progress (user_id, completion_pct);


-- ──────────────────────────────────────────────
-- quiz_question_stats
--
-- Per-question rollup, populated from quiz_attempts.per_question. Powers
-- "which questions trip students up" in the admin analytics view.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_question_stats (
  content_id      UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  question_index  INTEGER NOT NULL CHECK (question_index >= 0),
  attempts        INTEGER NOT NULL DEFAULT 0,
  correct         INTEGER NOT NULL DEFAULT 0,
  total_response_ms BIGINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (content_id, question_index)
);


-- ──────────────────────────────────────────────
-- platform_daily_stats
--
-- Single-row-per-day platform rollup so the admin dashboard never scans
-- quiz_attempts/study_sessions to compute averages. Today's row is updated
-- by the same nightly cron, but the admin endpoint also tops it up with
-- "today so far" via a small live query.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_daily_stats (
  day                  DATE PRIMARY KEY,
  total_users          INTEGER NOT NULL DEFAULT 0,
  active_users         INTEGER NOT NULL DEFAULT 0,
  new_users            INTEGER NOT NULL DEFAULT 0,
  total_subjects       INTEGER NOT NULL DEFAULT 0,
  total_published      INTEGER NOT NULL DEFAULT 0,
  reading_active_seconds BIGINT NOT NULL DEFAULT 0,
  quiz_attempts        INTEGER NOT NULL DEFAULT 0,
  quiz_correct         INTEGER NOT NULL DEFAULT 0,
  quiz_total_questions INTEGER NOT NULL DEFAULT 0,
  flashcards_reviewed  INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- RLS: rollups are read by the backend service-role key, so we leave RLS
-- enabled with no public policies. Direct client reads should go through
-- the API.
-- ──────────────────────────────────────────────
ALTER TABLE daily_user_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_daily_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own daily stats') THEN
    CREATE POLICY "Users can read own daily stats" ON daily_user_stats
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own streaks') THEN
    CREATE POLICY "Users can read own streaks" ON user_streaks
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own subject progress') THEN
    CREATE POLICY "Users can read own subject progress" ON subject_progress
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
