-- ============================================================
-- Phase 2: pg_cron aggregation. Routes ALL content→subject lookups via
-- units.subject_id only (this DB has no content.subject_id column).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ──────────────────────────────────────────────
-- aggregate_daily_user_stats(target_day)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION aggregate_daily_user_stats(target_day DATE)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE rows_upserted INTEGER;
BEGIN
  WITH
  reading AS (
    SELECT user_id,
           COALESCE(SUM(active_seconds),0)::INTEGER AS active_seconds,
           COUNT(*)::INTEGER                         AS reading_sessions
    FROM reading_sessions
    WHERE started_at >= target_day::timestamptz
      AND started_at <  (target_day+1)::timestamptz
    GROUP BY user_id),
  sessions AS (
    SELECT user_id, COUNT(*)::INTEGER AS study_sessions
    FROM study_sessions
    WHERE started_at >= target_day::timestamptz
      AND started_at <  (target_day+1)::timestamptz
    GROUP BY user_id),
  completions AS (
    SELECT user_id, COUNT(*)::INTEGER AS content_completed
    FROM user_progress
    WHERE completed = true
      AND completed_at >= target_day::timestamptz
      AND completed_at <  (target_day+1)::timestamptz
    GROUP BY user_id),
  quizzes AS (
    SELECT user_id,
           COUNT(*)::INTEGER                          AS quiz_attempts,
           COALESCE(SUM(score),0)::INTEGER            AS quiz_correct,
           COALESCE(SUM(total_questions),0)::INTEGER  AS quiz_total_questions
    FROM quiz_attempts
    WHERE attempted_at >= target_day::timestamptz
      AND attempted_at <  (target_day+1)::timestamptz
    GROUP BY user_id),
  flashcards AS (
    SELECT user_id,
           COUNT(*)::INTEGER                                          AS flashcards_reviewed,
           COUNT(*) FILTER (WHERE rating='confident')::INTEGER        AS flashcards_confident
    FROM flashcard_reviews
    WHERE reviewed_at >= target_day::timestamptz
      AND reviewed_at <  (target_day+1)::timestamptz
    GROUP BY user_id),
  combined AS (
    SELECT user_id FROM reading
    UNION SELECT user_id FROM sessions
    UNION SELECT user_id FROM completions
    UNION SELECT user_id FROM quizzes
    UNION SELECT user_id FROM flashcards)
  INSERT INTO daily_user_stats AS d (
    user_id, day, active_seconds, reading_sessions, study_sessions,
    content_completed, quiz_attempts, quiz_correct, quiz_total_questions,
    flashcards_reviewed, flashcards_confident, updated_at)
  SELECT c.user_id, target_day,
    COALESCE(r.active_seconds,0), COALESCE(r.reading_sessions,0),
    COALESCE(s.study_sessions,0), COALESCE(p.content_completed,0),
    COALESCE(q.quiz_attempts,0), COALESCE(q.quiz_correct,0),
    COALESCE(q.quiz_total_questions,0),
    COALESCE(f.flashcards_reviewed,0), COALESCE(f.flashcards_confident,0),
    NOW()
  FROM combined c
  LEFT JOIN reading     r ON r.user_id=c.user_id
  LEFT JOIN sessions    s ON s.user_id=c.user_id
  LEFT JOIN completions p ON p.user_id=c.user_id
  LEFT JOIN quizzes     q ON q.user_id=c.user_id
  LEFT JOIN flashcards  f ON f.user_id=c.user_id
  ON CONFLICT (user_id, day) DO UPDATE SET
    active_seconds       = EXCLUDED.active_seconds,
    reading_sessions     = EXCLUDED.reading_sessions,
    study_sessions       = EXCLUDED.study_sessions,
    content_completed    = EXCLUDED.content_completed,
    quiz_attempts        = EXCLUDED.quiz_attempts,
    quiz_correct         = EXCLUDED.quiz_correct,
    quiz_total_questions = EXCLUDED.quiz_total_questions,
    flashcards_reviewed  = EXCLUDED.flashcards_reviewed,
    flashcards_confident = EXCLUDED.flashcards_confident,
    updated_at           = NOW();

  GET DIAGNOSTICS rows_upserted = ROW_COUNT;
  RETURN rows_upserted;
END;$$;


-- ──────────────────────────────────────────────
-- recompute_user_streaks()
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_user_streaks()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE rows_upserted INTEGER;
BEGIN
  WITH study_days AS (
    SELECT user_id, day FROM daily_user_stats
    WHERE active_seconds >= 300
       OR quiz_attempts > 0
       OR flashcards_reviewed >= 5),
  numbered AS (
    SELECT user_id, day,
           day - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day))::INTEGER AS run_anchor
    FROM study_days),
  runs AS (
    SELECT user_id, run_anchor,
           MIN(day) AS run_start, MAX(day) AS run_end,
           COUNT(*)::INTEGER AS run_length
    FROM numbered GROUP BY user_id, run_anchor),
  longest AS (
    SELECT user_id, MAX(run_length) AS longest_streak FROM runs GROUP BY user_id),
  current_run AS (
    SELECT DISTINCT ON (user_id) user_id, run_length, run_end
    FROM runs
    WHERE run_end >= (CURRENT_DATE - INTERVAL '1 day')::date
    ORDER BY user_id, run_end DESC)
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_day, updated_at)
  SELECT l.user_id, COALESCE(c.run_length,0), l.longest_streak, c.run_end, NOW()
  FROM longest l LEFT JOIN current_run c ON c.user_id=l.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak  = EXCLUDED.current_streak,
    longest_streak  = EXCLUDED.longest_streak,
    last_active_day = EXCLUDED.last_active_day,
    updated_at      = NOW();

  GET DIAGNOSTICS rows_upserted = ROW_COUNT;
  RETURN rows_upserted;
END;$$;


-- ──────────────────────────────────────────────
-- recompute_subject_progress(target_user)
--   FIX: this DB has no content.subject_id — every content row is reached
--   via units.subject_id. All joins below go through units.
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_subject_progress(target_user UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE rows_upserted INTEGER;
BEGIN
  WITH user_subject AS (
    -- From user_progress → content → units
    SELECT DISTINCT up.user_id, u.subject_id
    FROM user_progress up
    JOIN content c ON c.id = up.content_id
    JOIN units   u ON u.id = c.unit_id
    WHERE u.subject_id IS NOT NULL
      AND (target_user IS NULL OR up.user_id = target_user)
    UNION
    SELECT DISTINCT user_id, subject_id
    FROM reading_sessions
    WHERE subject_id IS NOT NULL
      AND (target_user IS NULL OR user_id = target_user)
    UNION
    SELECT DISTINCT user_id, subject_id
    FROM study_sessions
    WHERE subject_id IS NOT NULL
      AND (target_user IS NULL OR user_id = target_user)
  ),
  subject_totals AS (
    SELECT s.id AS subject_id,
           COUNT(c.id)::INTEGER AS total_content
    FROM subjects s
    LEFT JOIN units   u ON u.subject_id = s.id
    LEFT JOIN content c ON c.unit_id    = u.id AND c.is_published = true
    GROUP BY s.id
  ),
  completions AS (
    SELECT us.user_id, us.subject_id,
           COUNT(*) FILTER (WHERE up.completed = true)::INTEGER AS completed_content,
           MAX(up.last_accessed)                                AS last_progress_at
    FROM user_subject us
    JOIN units   u ON u.subject_id = us.subject_id
    JOIN content c ON c.unit_id    = u.id AND c.is_published = true
    LEFT JOIN user_progress up
      ON up.user_id = us.user_id AND up.content_id = c.id
    GROUP BY us.user_id, us.subject_id
  ),
  reading AS (
    SELECT user_id, subject_id,
           COALESCE(SUM(active_seconds),0)::INTEGER AS total_active_seconds,
           MAX(started_at)                          AS last_reading_at
    FROM reading_sessions
    WHERE subject_id IS NOT NULL
      AND (target_user IS NULL OR user_id = target_user)
    GROUP BY user_id, subject_id
  ),
  quiz_perf AS (
    SELECT qa.user_id, u.subject_id,
           COUNT(*)::INTEGER                              AS quiz_attempts,
           COALESCE(SUM(qa.score),0)::INTEGER             AS quiz_correct,
           COALESCE(SUM(qa.total_questions),0)::INTEGER   AS quiz_total_questions,
           MAX(qa.attempted_at)                            AS last_quiz_at
    FROM quiz_attempts qa
    JOIN content c ON c.id = qa.content_id
    JOIN units   u ON u.id = c.unit_id
    WHERE u.subject_id IS NOT NULL
      AND (target_user IS NULL OR qa.user_id = target_user)
    GROUP BY qa.user_id, u.subject_id
  ),
  flash AS (
    SELECT fr.user_id, u.subject_id,
           COUNT(*)::INTEGER                                          AS flashcards_reviewed,
           COUNT(*) FILTER (WHERE fr.rating='confident')::INTEGER     AS flashcards_confident,
           MAX(fr.reviewed_at)                                        AS last_flash_at
    FROM flashcard_reviews fr
    JOIN content c ON c.id = fr.content_id
    JOIN units   u ON u.id = c.unit_id
    WHERE u.subject_id IS NOT NULL
      AND (target_user IS NULL OR fr.user_id = target_user)
    GROUP BY fr.user_id, u.subject_id
  ),
  joined AS (
    SELECT us.user_id, us.subject_id,
      COALESCE(st.total_content,0)        AS total_content,
      COALESCE(co.completed_content,0)    AS completed_content,
      COALESCE(re.total_active_seconds,0) AS total_active_seconds,
      COALESCE(qp.quiz_attempts,0)        AS quiz_attempts,
      COALESCE(qp.quiz_correct,0)         AS quiz_correct,
      COALESCE(qp.quiz_total_questions,0) AS quiz_total_questions,
      COALESCE(fl.flashcards_reviewed,0)  AS flashcards_reviewed,
      COALESCE(fl.flashcards_confident,0) AS flashcards_confident,
      GREATEST(co.last_progress_at, re.last_reading_at, qp.last_quiz_at, fl.last_flash_at) AS last_studied_at
    FROM user_subject us
    LEFT JOIN subject_totals st ON st.subject_id = us.subject_id
    LEFT JOIN completions    co ON co.user_id = us.user_id AND co.subject_id = us.subject_id
    LEFT JOIN reading        re ON re.user_id = us.user_id AND re.subject_id = us.subject_id
    LEFT JOIN quiz_perf      qp ON qp.user_id = us.user_id AND qp.subject_id = us.subject_id
    LEFT JOIN flash          fl ON fl.user_id = us.user_id AND fl.subject_id = us.subject_id
  ),
  scored AS (
    SELECT j.*,
      CASE WHEN j.total_content > 0
           THEN LEAST(100, ROUND((j.completed_content::numeric / j.total_content) * 100))
           ELSE 0 END::SMALLINT AS completion_pct,
      CASE WHEN j.quiz_total_questions > 0
           THEN LEAST(100, ROUND((j.quiz_correct::numeric / j.quiz_total_questions) * 100))
           ELSE NULL END::SMALLINT AS avg_quiz_pct
    FROM joined j
  )
  INSERT INTO subject_progress (
    user_id, subject_id, total_content, completed_content, completion_pct,
    total_active_seconds, quiz_attempts, quiz_correct, quiz_total_questions,
    avg_quiz_pct, flashcards_reviewed, flashcards_confident,
    weakness_score, last_studied_at, updated_at)
  SELECT
    s.user_id, s.subject_id, s.total_content, s.completed_content, s.completion_pct,
    s.total_active_seconds, s.quiz_attempts, s.quiz_correct, s.quiz_total_questions,
    s.avg_quiz_pct, s.flashcards_reviewed, s.flashcards_confident,
    LEAST(100, GREATEST(0, ROUND(
        0.50 * (100 - s.completion_pct)
      + 0.35 * COALESCE(100 - s.avg_quiz_pct, 50)
      + 0.15 * CASE
          WHEN s.last_studied_at IS NULL THEN 100
          ELSE LEAST(100, GREATEST(0,
            EXTRACT(EPOCH FROM (NOW() - s.last_studied_at)) / 86400.0 / 14.0 * 100))
        END
    )))::SMALLINT,
    s.last_studied_at, NOW()
  FROM scored s
  ON CONFLICT (user_id, subject_id) DO UPDATE SET
    total_content        = EXCLUDED.total_content,
    completed_content    = EXCLUDED.completed_content,
    completion_pct       = EXCLUDED.completion_pct,
    total_active_seconds = EXCLUDED.total_active_seconds,
    quiz_attempts        = EXCLUDED.quiz_attempts,
    quiz_correct         = EXCLUDED.quiz_correct,
    quiz_total_questions = EXCLUDED.quiz_total_questions,
    avg_quiz_pct         = EXCLUDED.avg_quiz_pct,
    flashcards_reviewed  = EXCLUDED.flashcards_reviewed,
    flashcards_confident = EXCLUDED.flashcards_confident,
    weakness_score       = EXCLUDED.weakness_score,
    last_studied_at      = EXCLUDED.last_studied_at,
    updated_at           = NOW();

  GET DIAGNOSTICS rows_upserted = ROW_COUNT;
  RETURN rows_upserted;
END;$$;


-- ──────────────────────────────────────────────
-- recompute_quiz_question_stats()
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_quiz_question_stats()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE rows_upserted INTEGER;
BEGIN
  WITH expanded AS (
    SELECT qa.content_id,
           (q->>'i')::INTEGER       AS question_index,
           COALESCE((q->>'correct')::BOOLEAN, false) AS is_correct,
           COALESCE((q->>'ms')::INTEGER, 0)          AS response_ms
    FROM quiz_attempts qa
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(qa.per_question, '[]'::jsonb)) AS q
    WHERE qa.per_question IS NOT NULL),
  agg AS (
    SELECT content_id, question_index,
           COUNT(*)::INTEGER                                      AS attempts,
           COUNT(*) FILTER (WHERE is_correct)::INTEGER            AS correct,
           COALESCE(SUM(response_ms),0)::BIGINT                   AS total_response_ms
    FROM expanded
    WHERE question_index IS NOT NULL AND question_index >= 0
    GROUP BY content_id, question_index)
  INSERT INTO quiz_question_stats (content_id, question_index, attempts, correct, total_response_ms, updated_at)
  SELECT content_id, question_index, attempts, correct, total_response_ms, NOW()
  FROM agg
  ON CONFLICT (content_id, question_index) DO UPDATE SET
    attempts          = EXCLUDED.attempts,
    correct           = EXCLUDED.correct,
    total_response_ms = EXCLUDED.total_response_ms,
    updated_at        = NOW();

  GET DIAGNOSTICS rows_upserted = ROW_COUNT;
  RETURN rows_upserted;
END;$$;


-- ──────────────────────────────────────────────
-- recompute_platform_daily_stats(target_day)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recompute_platform_daily_stats(target_day DATE)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO platform_daily_stats (
    day, total_users, active_users, new_users,
    total_subjects, total_published, reading_active_seconds,
    quiz_attempts, quiz_correct, quiz_total_questions, flashcards_reviewed, updated_at)
  SELECT target_day,
    (SELECT COUNT(*)::INTEGER FROM users),
    (SELECT COUNT(*)::INTEGER FROM users
       WHERE last_active >= (target_day - INTERVAL '6 days')::timestamptz
         AND last_active <  (target_day + 1)::timestamptz),
    (SELECT COUNT(*)::INTEGER FROM users
       WHERE created_at >= target_day::timestamptz
         AND created_at <  (target_day + 1)::timestamptz),
    (SELECT COUNT(*)::INTEGER FROM subjects WHERE is_active = true),
    (SELECT COUNT(*)::INTEGER FROM content  WHERE is_published = true),
    (SELECT COALESCE(SUM(active_seconds),0)::BIGINT FROM reading_sessions
       WHERE started_at >= target_day::timestamptz AND started_at < (target_day+1)::timestamptz),
    (SELECT COUNT(*)::INTEGER FROM quiz_attempts
       WHERE attempted_at >= target_day::timestamptz AND attempted_at < (target_day+1)::timestamptz),
    (SELECT COALESCE(SUM(score),0)::INTEGER FROM quiz_attempts
       WHERE attempted_at >= target_day::timestamptz AND attempted_at < (target_day+1)::timestamptz),
    (SELECT COALESCE(SUM(total_questions),0)::INTEGER FROM quiz_attempts
       WHERE attempted_at >= target_day::timestamptz AND attempted_at < (target_day+1)::timestamptz),
    (SELECT COUNT(*)::INTEGER FROM flashcard_reviews
       WHERE reviewed_at >= target_day::timestamptz AND reviewed_at < (target_day+1)::timestamptz),
    NOW()
  ON CONFLICT (day) DO UPDATE SET
    total_users            = EXCLUDED.total_users,
    active_users           = EXCLUDED.active_users,
    new_users              = EXCLUDED.new_users,
    total_subjects         = EXCLUDED.total_subjects,
    total_published        = EXCLUDED.total_published,
    reading_active_seconds = EXCLUDED.reading_active_seconds,
    quiz_attempts          = EXCLUDED.quiz_attempts,
    quiz_correct           = EXCLUDED.quiz_correct,
    quiz_total_questions   = EXCLUDED.quiz_total_questions,
    flashcards_reviewed    = EXCLUDED.flashcards_reviewed,
    updated_at             = NOW();
END;$$;


-- ──────────────────────────────────────────────
-- reap_stale_reading_sessions()
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reap_stale_reading_sessions()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE rows_closed INTEGER;
BEGIN
  UPDATE reading_sessions
  SET ended_at = last_heartbeat_at
  WHERE ended_at IS NULL
    AND last_heartbeat_at < NOW() - INTERVAL '10 minutes';
  GET DIAGNOSTICS rows_closed = ROW_COUNT;
  RETURN rows_closed;
END;$$;


-- ──────────────────────────────────────────────
-- purge_old_learning_events()
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION purge_old_learning_events()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE rows_deleted INTEGER;
BEGIN
  DELETE FROM learning_events WHERE occurred_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;$$;


-- ──────────────────────────────────────────────
-- nightly_aggregate() / intraday_topup()
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nightly_aggregate()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  yesterday DATE := (NOW() - INTERVAL '1 day')::date;
  today     DATE := CURRENT_DATE;
BEGIN
  PERFORM reap_stale_reading_sessions();
  PERFORM aggregate_daily_user_stats(yesterday);
  PERFORM aggregate_daily_user_stats(today);
  PERFORM recompute_user_streaks();
  PERFORM recompute_subject_progress(NULL);
  PERFORM recompute_quiz_question_stats();
  PERFORM recompute_platform_daily_stats(yesterday);
  PERFORM recompute_platform_daily_stats(today);
  PERFORM purge_old_learning_events();
END;$$;

CREATE OR REPLACE FUNCTION intraday_topup()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM reap_stale_reading_sessions();
  PERFORM aggregate_daily_user_stats(CURRENT_DATE);
  PERFORM recompute_platform_daily_stats(CURRENT_DATE);
END;$$;


-- ──────────────────────────────────────────────
-- Schedules
-- ──────────────────────────────────────────────
SELECT cron.schedule('unisage-nightly-aggregate', '15 2 * * *',  $$ SELECT nightly_aggregate(); $$);
SELECT cron.schedule('unisage-intraday-topup',    '*/30 * * * *', $$ SELECT intraday_topup();    $$);


-- ──────────────────────────────────────────────
-- One-time bootstrap
-- ──────────────────────────────────────────────
SELECT aggregate_daily_user_stats(CURRENT_DATE);
SELECT aggregate_daily_user_stats((CURRENT_DATE - 1));
SELECT recompute_user_streaks();
SELECT recompute_subject_progress(NULL);
SELECT recompute_quiz_question_stats();
SELECT recompute_platform_daily_stats(CURRENT_DATE);
