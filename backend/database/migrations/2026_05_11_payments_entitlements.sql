-- ============================================================
-- UniSage — Payments & Entitlements
-- Run this entire file in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'created',
    'awaiting_submission',
    'pending_verification',
    'approved',
    'rejected',
    'expired',
    'cancelled',
    'revoked',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount_inr_paise BIGINT NOT NULL CHECK (amount_inr_paise > 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  scopes TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (code, name, description, amount_inr_paise, duration_days, scopes)
VALUES
  ('unisage_premium_30d', 'UniSage Premium — 30 days',
   '30-day access to Paper Predictor + Study Analysis',
   19900, 30, ARRAY['predictor','analysis'])
ON CONFLICT (code) DO NOTHING;

-- Deactivate any legacy plans from earlier drafts so they don't appear in the UI.
UPDATE plans SET is_active = false
  WHERE code IN ('predictor_30d','analysis_30d','bundle_30d');

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  amount_inr_paise BIGINT NOT NULL,
  scopes TEXT[] NOT NULL,
  duration_days INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'static_upi',
  status payment_status NOT NULL DEFAULT 'created',
  utr_normalized TEXT,
  proof_upload_id UUID,
  notes TEXT,
  reject_reason TEXT,
  revoke_reason TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  intent_expires_at TIMESTAMPTZ NOT NULL,
  submission_expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_by UUID,
  revoked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_status_idx ON payments (user_id, status);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments (status, created_at DESC);

-- Prevent the same UTR from being claimed by two live (pending/approved) payments.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_live_utr_uidx
  ON payments (utr_normalized)
  WHERE utr_normalized IS NOT NULL
    AND status IN ('pending_verification', 'approved');

-- One open intent per user (forces user to cancel/expire before starting a new one).
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_open_intent_uidx
  ON payments (user_id)
  WHERE status IN ('awaiting_submission', 'pending_verification');

-- ============================================================
-- PAYMENT_EVENTS (append-only history)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status payment_status,
  to_status payment_status,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','admin','system')),
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_events_payment_idx ON payment_events (payment_id, created_at);

-- ============================================================
-- PAYMENT_UPLOADS (proof of payment)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  storage_bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_uploads_sha_idx ON payment_uploads (sha256);
CREATE INDEX IF NOT EXISTS payment_uploads_payment_idx ON payment_uploads (payment_id);

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_proof_upload_fkey,
  ADD CONSTRAINT payments_proof_upload_fkey
  FOREIGN KEY (proof_upload_id) REFERENCES payment_uploads(id) ON DELETE SET NULL;

-- ============================================================
-- ENTITLEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scope TEXT NOT NULL,
  source_payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entitlements_user_scope_idx
  ON entitlements (user_id, scope)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS entitlements_expiry_idx
  ON entitlements (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS entitlement_events (
  id BIGSERIAL PRIMARY KEY,
  entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','admin','system')),
  actor_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS entitlement_events_ent_idx ON entitlement_events (entitlement_id, created_at);

-- ============================================================
-- IDEMPOTENCY KEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_idempotency_keys (
  key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, endpoint, key)
);
CREATE INDEX IF NOT EXISTS payment_idempotency_expires_idx ON payment_idempotency_keys (expires_at);

-- ============================================================
-- AUDIT_LOGS (platform-wide, append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','admin','system')),
  actor_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id, created_at DESC);

-- ============================================================
-- SECURITY_EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('info','warn','suspicious','critical')),
  category TEXT NOT NULL,
  user_id UUID,
  ip INET,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS security_events_sev_idx ON security_events (severity, created_at DESC);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_entitlements_updated_at ON entitlements;
CREATE TRIGGER trg_entitlements_updated_at BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Append-only enforcement: forbid UPDATE/DELETE on event tables
-- ============================================================
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'rows in % are append-only', TG_TABLE_NAME;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_events_no_update ON payment_events;
CREATE TRIGGER payment_events_no_update BEFORE UPDATE OR DELETE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
DROP TRIGGER IF EXISTS entitlement_events_no_update ON entitlement_events;
CREATE TRIGGER entitlement_events_no_update BEFORE UPDATE OR DELETE ON entitlement_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ============================================================
-- RPCs (atomic transitions)
-- All callable via supabase.rpc(...) under service_role.
-- ============================================================

-- approve_payment: atomic payment→approved + entitlement INSERT(s) + events
CREATE OR REPLACE FUNCTION approve_payment(
  p_payment_id UUID,
  p_admin_id UUID,
  p_expected_version INTEGER,
  p_note TEXT
) RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_expires TIMESTAMPTZ;
  v_scope TEXT;
  v_ent_id UUID;
  v_ent_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_payment.status <> 'pending_verification' THEN
    RAISE EXCEPTION 'invalid transition from %', v_payment.status USING ERRCODE = 'P0001';
  END IF;
  IF v_payment.version <> p_expected_version THEN
    RAISE EXCEPTION 'version conflict' USING ERRCODE = '40001';
  END IF;

  v_expires := v_now + make_interval(days => v_payment.duration_days);

  UPDATE payments SET
    status = 'approved',
    approved_at = v_now,
    approved_by = p_admin_id,
    notes = COALESCE(p_note, notes),
    version = version + 1
  WHERE id = p_payment_id;

  FOREACH v_scope IN ARRAY v_payment.scopes LOOP
    INSERT INTO entitlements (user_id, scope, source_payment_id, granted_at, expires_at)
    VALUES (v_payment.user_id, v_scope, v_payment.id, v_now, v_expires)
    RETURNING id INTO v_ent_id;

    INSERT INTO entitlement_events (entitlement_id, event_type, actor_type, actor_id, metadata)
    VALUES (v_ent_id, 'granted', 'admin', p_admin_id,
            jsonb_build_object('payment_id', v_payment.id, 'scope', v_scope, 'expires_at', v_expires));

    v_ent_ids := array_append(v_ent_ids, v_ent_id);
  END LOOP;

  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type, actor_id, metadata)
  VALUES (v_payment.id, 'approved', 'pending_verification', 'approved', 'admin', p_admin_id,
          jsonb_build_object('note', p_note, 'entitlement_ids', to_jsonb(v_ent_ids)));

  RETURN jsonb_build_object('payment_id', v_payment.id, 'entitlement_ids', v_ent_ids, 'expires_at', v_expires);
END $$ LANGUAGE plpgsql;

-- reject_payment
CREATE OR REPLACE FUNCTION reject_payment(
  p_payment_id UUID,
  p_admin_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002'; END IF;
  IF v_payment.status <> 'pending_verification' THEN
    RAISE EXCEPTION 'invalid transition from %', v_payment.status USING ERRCODE = 'P0001';
  END IF;
  IF v_payment.version <> p_expected_version THEN
    RAISE EXCEPTION 'version conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE payments SET
    status = 'rejected',
    rejected_at = NOW(),
    rejected_by = p_admin_id,
    reject_reason = p_reason,
    version = version + 1
  WHERE id = p_payment_id;

  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type, actor_id, metadata)
  VALUES (v_payment.id, 'rejected', 'pending_verification', 'rejected', 'admin', p_admin_id,
          jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('payment_id', v_payment.id);
END $$ LANGUAGE plpgsql;

-- revoke_payment: revoke active entitlements granted by this payment
CREATE OR REPLACE FUNCTION revoke_payment(
  p_payment_id UUID,
  p_admin_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_count INTEGER;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002'; END IF;
  IF v_payment.status <> 'approved' THEN
    RAISE EXCEPTION 'only approved payments can be revoked' USING ERRCODE = 'P0001';
  END IF;
  IF v_payment.version <> p_expected_version THEN
    RAISE EXCEPTION 'version conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE entitlements
    SET revoked_at = v_now,
        revoke_reason = p_reason,
        version = version + 1
    WHERE source_payment_id = p_payment_id AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO entitlement_events (entitlement_id, event_type, actor_type, actor_id, metadata)
    SELECT id, 'revoked', 'admin', p_admin_id, jsonb_build_object('reason', p_reason)
    FROM entitlements WHERE source_payment_id = p_payment_id AND revoked_at = v_now;

  UPDATE payments SET
    status = 'revoked',
    revoked_at = v_now,
    revoked_by = p_admin_id,
    revoke_reason = p_reason,
    version = version + 1
  WHERE id = p_payment_id;

  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type, actor_id, metadata)
  VALUES (v_payment.id, 'revoked', 'approved', 'revoked', 'admin', p_admin_id,
          jsonb_build_object('reason', p_reason, 'entitlements_revoked', v_count));

  RETURN jsonb_build_object('payment_id', v_payment.id, 'entitlements_revoked', v_count);
END $$ LANGUAGE plpgsql;

-- submit_proof: atomic awaiting_submission → pending_verification + upload row + event
CREATE OR REPLACE FUNCTION submit_proof(
  p_payment_id UUID,
  p_user_id UUID,
  p_utr_normalized TEXT,
  p_upload JSONB,            -- {storage_bucket, storage_key, mime_type, size_bytes, sha256} or NULL
  p_submission_ttl_hours INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_upload_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002'; END IF;
  IF v_payment.user_id <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_payment.status <> 'awaiting_submission' THEN
    RAISE EXCEPTION 'invalid transition from %', v_payment.status USING ERRCODE = 'P0001';
  END IF;
  IF v_payment.intent_expires_at < v_now THEN
    RAISE EXCEPTION 'intent expired' USING ERRCODE = 'P0001';
  END IF;

  IF p_upload IS NOT NULL THEN
    INSERT INTO payment_uploads (payment_id, storage_bucket, storage_key, mime_type, size_bytes, sha256)
    VALUES (
      p_payment_id,
      p_upload->>'storage_bucket',
      p_upload->>'storage_key',
      p_upload->>'mime_type',
      (p_upload->>'size_bytes')::INTEGER,
      p_upload->>'sha256'
    )
    RETURNING id INTO v_upload_id;
  END IF;

  UPDATE payments SET
    status = 'pending_verification',
    utr_normalized = p_utr_normalized,
    proof_upload_id = v_upload_id,
    submission_expires_at = v_now + make_interval(hours => p_submission_ttl_hours),
    version = version + 1
  WHERE id = p_payment_id;

  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type, actor_id, metadata)
  VALUES (p_payment_id, 'proof.submitted', 'awaiting_submission', 'pending_verification', 'user', p_user_id,
          jsonb_build_object('utr', p_utr_normalized, 'upload_id', v_upload_id));

  RETURN jsonb_build_object('payment_id', p_payment_id, 'upload_id', v_upload_id);
END $$ LANGUAGE plpgsql;

-- cancel_payment (user-side, only from awaiting_submission)
CREATE OR REPLACE FUNCTION cancel_payment(
  p_payment_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002'; END IF;
  IF v_payment.user_id <> p_user_id THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF v_payment.status NOT IN ('created','awaiting_submission') THEN
    RAISE EXCEPTION 'invalid transition from %', v_payment.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE payments SET status = 'cancelled', version = version + 1 WHERE id = p_payment_id;

  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type, actor_id)
  VALUES (p_payment_id, 'cancelled', v_payment.status, 'cancelled', 'user', p_user_id);

  RETURN jsonb_build_object('payment_id', p_payment_id);
END $$ LANGUAGE plpgsql;

-- expire_stale_intents: job-callable
CREATE OR REPLACE FUNCTION expire_stale_intents() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE payments
      SET status = 'expired', version = version + 1
      WHERE status IN ('created','awaiting_submission')
        AND intent_expires_at < NOW()
      RETURNING id, status
  )
  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type)
    SELECT id, 'expired', 'awaiting_submission', 'expired', 'system' FROM expired;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$ LANGUAGE plpgsql;

-- expire_stale_submissions: rare; pending too long ⇒ expired (admin lost it)
CREATE OR REPLACE FUNCTION expire_stale_submissions() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE payments
      SET status = 'expired', version = version + 1
      WHERE status = 'pending_verification'
        AND submission_expires_at IS NOT NULL
        AND submission_expires_at < NOW()
      RETURNING id
  )
  INSERT INTO payment_events (payment_id, event_type, from_status, to_status, actor_type)
    SELECT id, 'expired', 'pending_verification', 'expired', 'system' FROM expired;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$ LANGUAGE plpgsql;

-- expire_old_entitlements (records event; queries already filter by expires_at)
CREATE OR REPLACE FUNCTION expire_old_entitlements() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH expired AS (
    SELECT id FROM entitlements
      WHERE revoked_at IS NULL
        AND expires_at < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM entitlement_events
            WHERE entitlement_id = entitlements.id AND event_type = 'expired'
        )
  )
  INSERT INTO entitlement_events (entitlement_id, event_type, actor_type)
    SELECT id, 'expired', 'system' FROM expired;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$ LANGUAGE plpgsql;

-- purge_expired_idempotency_keys
CREATE OR REPLACE FUNCTION purge_expired_idempotency_keys() RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM payment_idempotency_keys WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$ LANGUAGE plpgsql;

-- ============================================================
-- RLS — service_role bypasses, but enable RLS so anon/auth tokens can't poke
-- ============================================================
ALTER TABLE plans                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_uploads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements                ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_idempotency_keys    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events             ENABLE ROW LEVEL SECURITY;
-- (no policies created → anon/authenticated have no access; service_role bypasses RLS)

-- ============================================================
-- Seed admin permissions: payments.review + payments.revoke
-- Handles both TEXT[] and JSONB column shapes.
-- ============================================================
DO $$
DECLARE v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'permissions';

  IF v_type IS NULL THEN
    -- column doesn't exist; create as TEXT[]
    EXECUTE 'ALTER TABLE users ADD COLUMN permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]';
    v_type := 'ARRAY';
  END IF;

  IF v_type = 'ARRAY' THEN
    EXECUTE $sql$
      UPDATE users
        SET permissions = (
          SELECT ARRAY(SELECT DISTINCT UNNEST(COALESCE(permissions, ARRAY[]::TEXT[]) || ARRAY['payments.review','payments.revoke']))
        )
        WHERE role = 'admin'
    $sql$;
  ELSIF v_type = 'jsonb' THEN
    EXECUTE $sql$
      UPDATE users
        SET permissions = (
          SELECT to_jsonb(ARRAY(
            SELECT DISTINCT value FROM (
              SELECT jsonb_array_elements_text(COALESCE(permissions, '[]'::jsonb)) AS value
              UNION ALL SELECT 'payments.review'
              UNION ALL SELECT 'payments.revoke'
            ) t
          ))
        )
        WHERE role = 'admin'
    $sql$;
  ELSIF v_type = 'json' THEN
    EXECUTE $sql$
      UPDATE users
        SET permissions = to_json(ARRAY(
          SELECT DISTINCT value FROM (
            SELECT json_array_elements_text(COALESCE(permissions, '[]'::json)) AS value
            UNION ALL SELECT 'payments.review'
            UNION ALL SELECT 'payments.revoke'
          ) t
        ))
        WHERE role = 'admin'
    $sql$;
  ELSE
    RAISE NOTICE 'Unknown permissions column type % — skipping seed; grant manually.', v_type;
  END IF;
END $$;

-- ============================================================
-- DONE.
-- Next steps (run manually in Supabase console):
--   1. Create a private storage bucket named 'payment-proofs' (Storage → New bucket → Public: OFF)
--   2. Verify env vars on backend: UPI_VPA, UPI_PAYEE_NAME, PAYMENT_PROOF_BUCKET
-- ============================================================
