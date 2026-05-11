-- ============================================================
-- UniSage — Custom Coupons
-- Run this in the Supabase SQL Editor after payments/entitlements.
-- Idempotent: safe to re-run.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
  value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
  max_discount_inr_paise BIGINT CHECK (max_discount_inr_paise IS NULL OR max_discount_inr_paise >= 0),
  min_purchase_inr_paise BIGINT NOT NULL DEFAULT 0 CHECK (min_purchase_inr_paise >= 0),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  per_user_usage_limit INTEGER CHECK (per_user_usage_limit IS NULL OR per_user_usage_limit > 0),
  allowed_email_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  first_purchase_only BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_code_format_chk CHECK (code = upper(code) AND code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$')
);

CREATE INDEX IF NOT EXISTS coupons_active_code_idx ON coupons (code, active);
CREATE INDEX IF NOT EXISTS coupons_expiry_idx ON coupons (expires_at) WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON coupons;
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PAYMENT COUPON FIELDS
-- ============================================================
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS original_amount_inr_paise BIGINT,
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_inr_paise BIGINT NOT NULL DEFAULT 0 CHECK (coupon_discount_inr_paise >= 0);

UPDATE payments
  SET original_amount_inr_paise = amount_inr_paise
  WHERE original_amount_inr_paise IS NULL;

ALTER TABLE payments
  ALTER COLUMN original_amount_inr_paise SET NOT NULL;

CREATE INDEX IF NOT EXISTS payments_coupon_idx ON payments (coupon_id) WHERE coupon_id IS NOT NULL;

-- ============================================================
-- COUPON REDEMPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  discount_inr_paise BIGINT NOT NULL CHECK (discount_inr_paise > 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'redeemed', 'released')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id)
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_status_idx
  ON coupon_redemptions (coupon_id, status);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_coupon_status_idx
  ON coupon_redemptions (user_id, coupon_id, status);

DROP TRIGGER IF EXISTS trg_coupon_redemptions_updated_at ON coupon_redemptions;
CREATE TRIGGER trg_coupon_redemptions_updated_at BEFORE UPDATE ON coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ATOMIC RESERVATION / RELEASE / REDEEM RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION reserve_coupon_redemption(
  p_coupon_id UUID,
  p_payment_id UUID,
  p_user_id UUID,
  p_discount_inr_paise BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_user_usage INTEGER;
  v_redemption_id UUID;
BEGIN
  IF p_discount_inr_paise <= 0 THEN
    RAISE EXCEPTION 'coupon discount must be positive' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_coupon.active IS NOT TRUE THEN
    RAISE EXCEPTION 'coupon is inactive' USING ERRCODE = 'P0001';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= NOW() THEN
    RAISE EXCEPTION 'coupon expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'coupon usage limit reached' USING ERRCODE = 'P0001';
  END IF;

  IF v_coupon.per_user_usage_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage
      FROM coupon_redemptions
      WHERE coupon_id = p_coupon_id
        AND user_id = p_user_id
        AND status IN ('reserved', 'redeemed');

    IF v_user_usage >= v_coupon.per_user_usage_limit THEN
      RAISE EXCEPTION 'per-user coupon usage limit reached' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE coupons
    SET used_count = used_count + 1
    WHERE id = p_coupon_id;

  INSERT INTO coupon_redemptions (
    coupon_id,
    user_id,
    payment_id,
    discount_inr_paise,
    status
  )
  VALUES (
    p_coupon_id,
    p_user_id,
    p_payment_id,
    p_discount_inr_paise,
    'reserved'
  )
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object('redemption_id', v_redemption_id, 'status', 'reserved');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_coupon_reservations(
  p_payment_ids UUID[],
  p_reason TEXT DEFAULT 'released'
) RETURNS JSONB AS $$
DECLARE
  v_coupon_id UUID;
  v_release_count INTEGER := 0;
BEGIN
  FOR v_coupon_id IN
    SELECT coupon_id
      FROM coupon_redemptions
      WHERE payment_id = ANY(p_payment_ids)
        AND status = 'reserved'
      FOR UPDATE
  LOOP
    UPDATE coupons
      SET used_count = GREATEST(used_count - 1, 0)
      WHERE id = v_coupon_id;
    v_release_count := v_release_count + 1;
  END LOOP;

  UPDATE coupon_redemptions
    SET status = 'released',
        released_at = NOW(),
        release_reason = p_reason
    WHERE payment_id = ANY(p_payment_ids)
      AND status = 'reserved';

  RETURN jsonb_build_object('released', v_release_count);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION redeem_coupon_reservation(
  p_payment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_redemption coupon_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO v_redemption
    FROM coupon_redemptions
    WHERE payment_id = p_payment_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('redeemed', false, 'reason', 'no_coupon');
  END IF;

  IF v_redemption.status = 'redeemed' THEN
    RETURN jsonb_build_object('redeemed', true, 'redemption_id', v_redemption.id);
  END IF;

  IF v_redemption.status <> 'reserved' THEN
    RAISE EXCEPTION 'coupon reservation is not active' USING ERRCODE = 'P0001';
  END IF;

  UPDATE coupon_redemptions
    SET status = 'redeemed',
        redeemed_at = NOW()
    WHERE id = v_redemption.id;

  RETURN jsonb_build_object('redeemed', true, 'redemption_id', v_redemption.id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- EXAMPLE SEED COUPONS
-- Fixed coupon values are stored in paise. Percentage coupon values are percent.
-- ============================================================
INSERT INTO coupons (
  code,
  type,
  value,
  max_discount_inr_paise,
  min_purchase_inr_paise,
  usage_limit,
  per_user_usage_limit,
  allowed_email_domains,
  first_purchase_only,
  active,
  expires_at
)
VALUES
  ('SAVE50', 'percentage', 50, 50000, 9900, 1000, 1, ARRAY[]::TEXT[], false, true, NOW() + INTERVAL '180 days'),
  ('FIRST100', 'fixed', 10000, NULL, 19900, 500, 1, ARRAY[]::TEXT[], true, true, NOW() + INTERVAL '90 days'),
  ('UPES25', 'percentage', 25, 25000, 19900, 2000, 1, ARRAY['upes.ac.in']::TEXT[], false, true, NOW() + INTERVAL '365 days')
ON CONFLICT (code) DO NOTHING;
