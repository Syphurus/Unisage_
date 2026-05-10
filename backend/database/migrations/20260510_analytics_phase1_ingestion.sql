-- ============================================================
-- Phase 1: Learning analytics ingestion layer.
-- Additive only — no destructive changes. Existing data preserved.
--
-- New tables:
--   reading_sessions    — per-content active-time tracking
--   flashcard_reviews   — persists flashcard rating decisions
--   learning_events     — generic event stream (capped retention via pg_cron in 003)
--
-- Existing-table changes (additive columns + indexes):
--   quiz_attempts.per_question   JSONB  (nullable, optional per-question breakdown)
--   user_progress: composite + completion indexes
--   quiz_attempts.attempted_at, study_sessions.started_at indexes for date-range reads
--
-- Idempotent: safe to re-run. Uses IF NOT EXISTS / DO blocks.
-- ============================================================

-- ──────────────────────────────────────────────
-- reading_sessions
--
-- One row per active reading "session" on a piece of content. The frontend
-- heartbeat upserts this row (one in-flight session per (user, content) pair),
-- accumulating active_seconds and updating max_scroll_pct / sections_viewed.
-- The session is "ended" when the client flushes on pagehide or the row is
-- idle long enough (cron will reap stale rows).
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id      UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  -- Accumulated *active* (not wall-clock) seconds. Pages hidden / user idle do not count.
  active_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  -- Furthest scroll the reader reached (0–100).
  max_scroll_pct  SMALLINT NOT NULL DEFAULT 0 CHECK (max_scroll_pct BETWEEN 0 AND 100),
  -- Section IDs the reader observed (IntersectionObserver hits, dedup'd client-side).
  sections_viewed JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_meta     JSONB
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_started
  ON reading_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_content
  ON reading_sessions (content_id);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_subject_started
  ON reading_sessions (subject_id, started_at DESC)
  WHERE subject_id IS NOT NULL;

-- Fast lookup for the "in-flight" session the heartbeat will upsert into.
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_content_open
  ON reading_sessions (user_id, content_id)
  WHERE ended_at IS NULL;


-- ──────────────────────────────────────────────
-- flashcard_reviews
--
-- One row per card per review. The viewer batches a session's worth of
-- reviews into a single POST (one INSERT-many) when the user finishes,
-- so write amplification stays bounded.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id    UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  card_index    INTEGER NOT NULL CHECK (card_index >= 0),
  rating        TEXT NOT NULL CHECK (rating IN ('forgot', 'shaky', 'confident')),
  response_ms   INTEGER CHECK (response_ms IS NULL OR response_ms >= 0),
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_reviewed
  ON flashcard_reviews (user_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_content
  ON flashcard_reviews (content_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_content
  ON flashcard_reviews (user_id, content_id, reviewed_at DESC);


-- ──────────────────────────────────────────────
-- learning_events
--
-- Generic, lightweight event capture. Intentionally schema-light: payload
-- is JSONB. A nightly cron (migration 003) deletes events older than 30
-- days after they have been folded into rollup tables. Used for things
-- like 'section_viewed', 'bookmark_add', 'subject_open' that don't have a
-- dedicated table.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learning_events (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id    UUID REFERENCES content(id) ON DELETE SET NULL,
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  type          TEXT NOT NULL,
  payload       JSONB,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_occurred
  ON learning_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_type_occurred
  ON learning_events (type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_subject_occurred
  ON learning_events (subject_id, occurred_at DESC)
  WHERE subject_id IS NOT NULL;


-- ──────────────────────────────────────────────
-- quiz_attempts: per-question breakdown
--
-- Adds a nullable JSONB column that the frontend already has the data for.
-- Existing rows remain NULL — readers must tolerate that. Shape:
--   [{ "i": 0, "selected": 2, "correct": false, "ms": 4321 }, ...]
-- ──────────────────────────────────────────────
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS per_question JSONB;


-- ──────────────────────────────────────────────
-- Extra indexes on existing tables — for date-range and "completed" reads
-- that the analytics layer is about to lean on.
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_progress_user_completed
  ON user_progress (user_id, completed)
  WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_user_progress_user_last_accessed
  ON user_progress (user_id, last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_attempted
  ON quiz_attempts (user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_content_attempted
  ON quiz_attempts (content_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started
  ON study_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_subject
  ON study_sessions (subject_id);

CREATE INDEX IF NOT EXISTS idx_users_last_active
  ON users (last_active DESC);


-- ──────────────────────────────────────────────
-- RLS — match the project's existing pattern.
-- Backend uses the service role key (bypasses RLS), so policies here only
-- gate any future direct-from-client reads. We default to "owner only".
-- ──────────────────────────────────────────────
ALTER TABLE reading_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own reading sessions') THEN
    CREATE POLICY "Users can manage own reading sessions" ON reading_sessions
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own flashcard reviews') THEN
    CREATE POLICY "Users can manage own flashcard reviews" ON flashcard_reviews
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own learning events') THEN
    CREATE POLICY "Users can manage own learning events" ON learning_events
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
