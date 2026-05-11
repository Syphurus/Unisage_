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

## Phase A: Payments & Entitlements (2026-05-11)

`2026_05_11_payments_entitlements.sql` — manual UPI payment + entitlement
gate for Paper Predictor and Analytics.

`20260512_custom_coupons.sql` — application-owned coupons for Razorpay checkout.
Adds `coupons`, `coupon_redemptions`, payment coupon fields, atomic reservation
RPCs, admin `coupons.manage` permission, and sample coupons (`SAVE50`,
`FIRST100`, `UPES25`).

### Deploy steps

1. **Run the migration** in Supabase SQL Editor (idempotent).
2. **Create a private storage bucket**:
   - Supabase dashboard → Storage → **New bucket**
   - Name: `payment-proofs` (must match `PAYMENT_PROOF_BUCKET` env)
   - **Public: OFF.** Leaving this on exposes user payment screenshots.
3. **Set backend env vars** — see `backend/.env.example` for the full list.
   Required new vars: `UPI_VPA`, `UPI_PAYEE_NAME`. Optional:
   `PAYMENT_PROOF_BUCKET` (default `payment-proofs`),
   `PAYMENT_INTENT_TTL_HOURS` (24), `PAYMENT_SUBMISSION_TTL_HOURS` (72),
   `RUN_BACKGROUND_JOBS` (true).
4. **Restart the backend.** Expiry jobs start automatically.

### What the migration creates

- Enum `payment_status` (9 states; see §4 of the design doc).
- Tables: `plans` (seeded with one plan: `unisage_premium_30d` — ₹199, 30 days, covers both `predictor` and `analysis` scopes; any earlier draft plans are auto-deactivated),
  `payments`, `payment_events` (append-only), `payment_uploads`,
  `entitlements`, `entitlement_events` (append-only),
  `payment_idempotency_keys`, `audit_logs` (append-only), `security_events`.
- Partial unique indexes:
  - one live UTR per `payments.utr_normalized` while
    `status IN ('pending_verification','approved')` — DB-level dedup.
  - one open intent per user while
    `status IN ('awaiting_submission','pending_verification')`.
- RPC functions (single-transaction state transitions):
  `approve_payment`, `reject_payment`, `revoke_payment`, `submit_proof`,
  `cancel_payment`, `expire_stale_intents`, `expire_stale_submissions`,
  `expire_old_entitlements`, `purge_expired_idempotency_keys`.
- Append-only triggers on `payment_events`, `entitlement_events`, `audit_logs`.
- RLS enabled on every new table; no anon/auth policies → only the
  service-role can read/write.
- Auto-seeds `payments.review` and `payments.revoke` permissions onto every
  `role='admin'` user (handles both `TEXT[]` and `JSONB` column shapes).

### Smoke test (on staging)

```sh
# 1. List plans
curl -H "Authorization: Bearer $USER_JWT" /api/payments/plans

# 2. Create intent
curl -X POST /api/payments/intent \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H 'Content-Type: application/json' \
  -d '{"planId":"<plan-uuid>"}'

# 3. Submit proof
curl -X POST /api/payments/<id>/submit \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Idempotency-Key: $(uuidgen)" \
  -F 'utr=BANK1234567890' \
  -F 'proof=@receipt.png'

# 4. Confirm 402 BEFORE approval
curl -H "Authorization: Bearer $USER_JWT" /api/analytics/me
# → 402 ENTITLEMENT_REQUIRED

# 5. Admin approves
curl -X POST /api/admin/payments/<id>/approve \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "If-Match: 1" \
  -H 'Content-Type: application/json' \
  -d '{"expectedVersion":1}'

# 6. Confirm 200 AFTER approval
curl -H "Authorization: Bearer $USER_JWT" /api/analytics/me
# → 200
```

### Rollback

Money may have changed hands. Don't drop tables. Use the API:
- `POST /api/admin/payments/<id>/revoke` to revoke individual approved payments
  (preserves audit trail and revokes derived entitlements atomically).
- For mass revoke: `UPDATE entitlements SET revoked_at = NOW(), revoke_reason='operational rollback' WHERE revoked_at IS NULL;`
  then call `entitlement.service.invalidateAll()` or restart the backend.

### Operational notes

- **Background jobs** run on the API instance (`setInterval`-based). On
  horizontal scale-out, set `RUN_BACKGROUND_JOBS=false` on all instances
  except one.
- **Signed-URL TTL** for proof viewing is 60s. Admin UI must re-fetch on
  each view; do not cache the URL.
- **Auto-seeded permissions** are additive (never remove existing values).
  Re-running the migration tops up admins who were created after the
  initial run.
