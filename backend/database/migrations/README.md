# UniSage migrations

Migrations run in filename order. Each is idempotent (`IF NOT EXISTS` /
`ON CONFLICT` / `DO $$ ... $$` guards) — re-running a migration is a no-op.

## Phase 1 + 2: Learning Analytics (2026-05-10)

Three new files turn the platform's analytics from "computed live every
read" into "ingested → aggregated → indexed read". They are **strictly
additive** — no existing column or row is dropped or rewritten, and the
existing API contracts are preserved (the read paths just get faster).

| Order | File | What it does |
|------:|------|--------------|
| 1 | `20260510_analytics_phase1_ingestion.sql` | New tables: `reading_sessions`, `flashcard_reviews`, `learning_events`. Adds `quiz_attempts.per_question` (nullable JSONB). New indexes for date-range and completion reads. |
| 2 | `20260510_analytics_phase2_rollups.sql` | Denormalized rollup tables: `daily_user_stats`, `user_streaks`, `subject_progress`, `quiz_question_stats`, `platform_daily_stats`. Pure caches — every column derives from source tables. |
| 3 | `20260510_analytics_phase2_pgcron.sql` | Aggregation functions + pg_cron schedules. Bootstraps rollups so dashboards have data on day one. |

### Prerequisites

- `pg_cron` extension. On Supabase: **Database → Extensions → pg_cron → Enable**.
  Migration 3 will fail with `extension "pg_cron" is not available` if the
  extension is not enabled.
- The functions and cron schedules require the role running them to have
  permissions to create cron jobs. Run as the Supabase service-role
  (default in the SQL editor).

### What pg_cron will do

| Job | Schedule (UTC) | Function |
|-----|----------------|----------|
| `unisage-nightly-aggregate` | `15 2 * * *` (02:15 nightly) | `nightly_aggregate()` — rebuilds yesterday's daily_user_stats, today's top-up, streaks, subject_progress (all users), question stats, platform stats; reaps stale reading sessions; purges learning_events > 30 days. |
| `unisage-intraday-topup`    | `*/30 * * * *` (every 30 min) | `intraday_topup()` — keeps today's daily_user_stats and platform_daily_stats fresh so dashboards reflect current activity. |

To inspect / pause: `SELECT * FROM cron.job;` and `cron.unschedule('<name>')`.

### Retention

- `learning_events`: 30 days raw, then deleted by `purge_old_learning_events()`.
  Aggregated stats live indefinitely in the rollup tables.
- All other tables: indefinite.

### Read paths (post-migration)

| Endpoint | Source | Fallback |
|----------|--------|----------|
| `GET /api/sessions/stats` | `daily_user_stats` + `user_streaks` + `subject_progress` | live aggregation (preserves the legacy code path) |
| `GET /api/progress/subject/:id` | `subject_progress` for headline numbers, live for per-content array | live (always serves correct numbers when rollup row missing) |
| `GET /api/admin/analytics` | `platform_daily_stats` | live aggregation |
| `GET /api/analytics/me` | rollups | live |
| `GET /api/analytics/me/subjects` | `subject_progress` | empty array |

Fallback paths exist so a brand-new user (rollup not yet computed) does not
see "—" / 0 — the legacy live computation still works.

## Notes on existing data

### `quiz_attempts.score`

The previous frontend sent `score` as a percentage (0–100) and didn't include
`totalQuestions`, which would have failed the Joi validator and been rejected.
After this change:

- Frontend sends `score` as the **raw correct count** and includes
  `totalQuestions`. This matches the schema's intent (the controller
  computes `percentage = score / total_questions * 100` for display).
- Rollups assume the correct convention. New rows will produce correct
  averages.
- Any historical rows that somehow have inflated `score` values will be
  capped to 100% by the `LEAST(100, ...)` clause in the weakness-score
  formula, so dashboards won't show >100% even if a stray legacy row
  exists. No retroactive UPDATE is applied — existing data is preserved
  verbatim.

### Naive notes-time tracker

`NotesViewerWithTracking` previously POSTed a hard-coded 15s every 15s,
inflating tab-open-but-idle as study time. It is now backed by
`useReadingTracker` which gates accumulation on Page Visibility + 60s idle
detection. Old `user_progress.time_spent` values produced by the naive
tracker are preserved but no longer continue to grow falsely.

### Sessions API

`/api/sessions/start` and `/api/sessions/:id/end` existed but were never
called by the web. The new `useStudySession` hook wires these up on
subject-scoped pages. Existing rows in `study_sessions` (likely empty) are
preserved.
