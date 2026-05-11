/**
 * @fileoverview Custom coupon validation and reservation service.
 *
 * Razorpay never receives coupon metadata. The application owns validation,
 * discount calculation, reservation, and redemption; Razorpay receives only the
 * final payable amount in paise.
 */

const { supabase } = require("../../config/database");
const {
  ConflictError,
  ValidationError,
  NotFoundError,
} = require("../../utils/errors");

const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

function normalizeCouponCode(code) {
  if (typeof code !== "string") return "";
  return code.trim().toUpperCase();
}

function formatInrPaise(paise) {
  return (Number(paise || 0) / 100).toFixed(2);
}

function calculateDiscountPaise(coupon, amountPaise) {
  const originalAmount = Math.max(0, Number(amountPaise || 0));
  let discount = 0;

  if (coupon.type === "fixed") {
    discount = Number(coupon.value || 0);
  } else if (coupon.type === "percentage") {
    discount = Math.floor((originalAmount * Number(coupon.value || 0)) / 100);
  }

  if (coupon.max_discount_inr_paise !== null && coupon.max_discount_inr_paise !== undefined) {
    discount = Math.min(discount, Number(coupon.max_discount_inr_paise));
  }

  return Math.max(0, Math.min(originalAmount, discount));
}

async function getPlan(planId) {
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, amount_inr_paise, duration_days, scopes, is_active")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) throw new NotFoundError("Plan");
  return data;
}

async function getCouponByCode(couponCode) {
  const code = normalizeCouponCode(couponCode);
  if (!COUPON_CODE_PATTERN.test(code)) {
    return null;
  }

  const { data, error } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, max_discount_inr_paise, min_purchase_inr_paise, " +
        "usage_limit, used_count, per_user_usage_limit, allowed_email_domains, " +
        "first_purchase_only, active, expires_at"
    )
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function countSuccessfulUserPayments(userId) {
  const { count, error } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "approved");
  if (error) throw error;
  return count || 0;
}

async function countUserCouponUsage({ couponId, userId }) {
  const { count, error } = await supabase
    .from("coupon_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId)
    .eq("user_id", userId)
    .in("status", ["reserved", "redeemed"]);
  if (error) throw error;
  return count || 0;
}

function isEmailDomainAllowed(coupon, email) {
  const domains = Array.isArray(coupon.allowed_email_domains)
    ? coupon.allowed_email_domains
    : [];
  if (!domains.length) return true;
  const domain = String(email || "").split("@")[1]?.toLowerCase();
  return Boolean(domain && domains.map((d) => String(d).toLowerCase()).includes(domain));
}

async function buildCouponQuote({ user, planId, couponCode }) {
  const code = normalizeCouponCode(couponCode);
  const plan = await getPlan(planId);
  const originalAmountPaise = Number(plan.amount_inr_paise);

  const invalid = (message) => ({
    valid: false,
    couponCode: code,
    originalAmountPaise,
    originalAmount: formatInrPaise(originalAmountPaise),
    discountPaise: 0,
    discount: "0.00",
    finalAmountPaise: originalAmountPaise,
    finalAmount: formatInrPaise(originalAmountPaise),
    message,
  });

  if (!code) return invalid("Enter a coupon code");

  const coupon = await getCouponByCode(code);
  if (!coupon) return invalid("Coupon code is invalid");
  if (!coupon.active) return invalid("Coupon is inactive");
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return invalid("Coupon expired");
  }
  if (
    coupon.min_purchase_inr_paise !== null &&
    coupon.min_purchase_inr_paise !== undefined &&
    originalAmountPaise < Number(coupon.min_purchase_inr_paise)
  ) {
    return invalid(
      `Minimum purchase of ₹${formatInrPaise(coupon.min_purchase_inr_paise)} required`
    );
  }
  if (
    coupon.usage_limit !== null &&
    coupon.usage_limit !== undefined &&
    Number(coupon.used_count || 0) >= Number(coupon.usage_limit)
  ) {
    return invalid("Coupon usage limit reached");
  }
  if (!isEmailDomainAllowed(coupon, user.email)) {
    return invalid("Coupon is not eligible for your email");
  }
  if (coupon.first_purchase_only) {
    const successfulPayments = await countSuccessfulUserPayments(user.id);
    if (successfulPayments > 0) return invalid("Coupon is valid only on your first purchase");
  }
  if (
    coupon.per_user_usage_limit !== null &&
    coupon.per_user_usage_limit !== undefined
  ) {
    const userUsage = await countUserCouponUsage({ couponId: coupon.id, userId: user.id });
    if (userUsage >= Number(coupon.per_user_usage_limit)) {
      return invalid("You have already used this coupon");
    }
  }

  const discountPaise = calculateDiscountPaise(coupon, originalAmountPaise);
  if (discountPaise <= 0) return invalid("Coupon does not apply to this plan");

  const finalAmountPaise = Math.max(0, originalAmountPaise - discountPaise);
  return {
    valid: true,
    couponId: coupon.id,
    couponCode: coupon.code,
    originalAmountPaise,
    originalAmount: formatInrPaise(originalAmountPaise),
    discountPaise,
    discount: formatInrPaise(discountPaise),
    finalAmountPaise,
    finalAmount: formatInrPaise(finalAmountPaise),
    message: "Coupon applied successfully",
  };
}

async function assertValidCouponQuote(args) {
  const quote = await buildCouponQuote(args);
  if (!quote.valid) throw new ValidationError(quote.message);
  return quote;
}

async function reserveCouponForPayment({ couponId, paymentId, userId, discountPaise }) {
  const { data, error } = await supabase.rpc("reserve_coupon_redemption", {
    p_coupon_id: couponId,
    p_payment_id: paymentId,
    p_user_id: userId,
    p_discount_inr_paise: discountPaise,
  });
  if (error) {
    throw new ValidationError(error.message || "Coupon could not be reserved");
  }
  return data;
}

async function releaseCouponReservations({ paymentIds, reason }) {
  if (!Array.isArray(paymentIds) || !paymentIds.length) return null;
  const { data, error } = await supabase.rpc("release_coupon_reservations", {
    p_payment_ids: paymentIds,
    p_reason: reason || "released",
  });
  if (error) throw error;
  return data;
}

async function redeemCouponReservation({ paymentId }) {
  const { data, error } = await supabase.rpc("redeem_coupon_reservation", {
    p_payment_id: paymentId,
  });
  if (error) throw error;
  return data;
}

function serializeCouponRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    maxDiscountInrPaise: row.max_discount_inr_paise,
    maxDiscount: row.max_discount_inr_paise === null ? null : formatInrPaise(row.max_discount_inr_paise),
    minPurchaseInrPaise: row.min_purchase_inr_paise,
    minPurchase: formatInrPaise(row.min_purchase_inr_paise),
    usageLimit: row.usage_limit,
    usedCount: row.used_count,
    perUserUsageLimit: row.per_user_usage_limit,
    allowedEmailDomains: row.allowed_email_domains || [],
    firstPurchaseOnly: row.first_purchase_only,
    active: row.active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function couponPayload(input) {
  const payload = {};
  if (input.code !== undefined) payload.code = normalizeCouponCode(input.code);
  if (input.type !== undefined) payload.type = input.type;
  if (input.value !== undefined) payload.value = input.value;
  if (input.maxDiscountInrPaise !== undefined) {
    payload.max_discount_inr_paise = input.maxDiscountInrPaise;
  }
  if (input.minPurchaseInrPaise !== undefined) {
    payload.min_purchase_inr_paise = input.minPurchaseInrPaise;
  }
  if (input.usageLimit !== undefined) payload.usage_limit = input.usageLimit;
  if (input.perUserUsageLimit !== undefined) {
    payload.per_user_usage_limit = input.perUserUsageLimit;
  }
  if (input.allowedEmailDomains !== undefined) {
    payload.allowed_email_domains = input.allowedEmailDomains;
  }
  if (input.firstPurchaseOnly !== undefined) {
    payload.first_purchase_only = input.firstPurchaseOnly;
  }
  if (input.active !== undefined) payload.active = input.active;
  if (input.expiresAt !== undefined) payload.expires_at = input.expiresAt;
  return payload;
}

function mapCouponWriteError(error) {
  if (error?.code === "23505") {
    return new ConflictError("A coupon with this code already exists");
  }
  if (error?.code === "23514") {
    return new ValidationError("Coupon fields failed database validation");
  }
  return error;
}

async function adminListCoupons({ status = "all", query = "", limit = 50, offset = 0 }) {
  let q = supabase
    .from("coupons")
    .select("*", { count: "exact" });

  const nowIso = new Date().toISOString();
  if (status === "active") q = q.eq("active", true).or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  if (status === "inactive") q = q.eq("active", false);
  if (status === "expired") q = q.not("expires_at", "is", null).lte("expires_at", nowIso);

  const trimmed = String(query || "").trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[%_]/g, "\\$&").toUpperCase();
    q = q.ilike("code", `%${escaped}%`);
  }

  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data || []).map(serializeCouponRow), total: count || 0 };
}

async function adminCreateCoupon(input) {
  const payload = couponPayload(input);
  const { data, error } = await supabase
    .from("coupons")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw mapCouponWriteError(error);
  return serializeCouponRow(data);
}

async function adminUpdateCoupon({ couponId, input }) {
  const payload = couponPayload(input);
  const { data, error } = await supabase
    .from("coupons")
    .update(payload)
    .eq("id", couponId)
    .select("*")
    .maybeSingle();
  if (error) throw mapCouponWriteError(error);
  if (!data) throw new NotFoundError("Coupon");
  return serializeCouponRow(data);
}

async function adminGetCoupon(couponId) {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", couponId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Coupon");

  const { data: statsRows, error: statsError } = await supabase
    .from("coupon_redemptions")
    .select("status, discount_inr_paise")
    .eq("coupon_id", couponId);
  if (statsError) throw statsError;

  const stats = (statsRows || []).reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] || 0) + 1;
      if (row.status === "redeemed") {
        acc.redeemedDiscountInrPaise += Number(row.discount_inr_paise || 0);
      }
      return acc;
    },
    { total: 0, reserved: 0, redeemed: 0, released: 0, redeemedDiscountInrPaise: 0 }
  );

  return {
    coupon: serializeCouponRow(data),
    stats: {
      ...stats,
      redeemedDiscount: formatInrPaise(stats.redeemedDiscountInrPaise),
    },
  };
}

async function adminListRedemptions({ couponId, limit = 100, offset = 0 }) {
  const { data, error, count } = await supabase
    .from("coupon_redemptions")
    .select(
      "id, coupon_id, user_id, payment_id, discount_inr_paise, status, reserved_at, redeemed_at, released_at, release_reason, created_at",
      { count: "exact" }
    )
    .eq("coupon_id", couponId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  return {
    rows: (data || []).map((row) => ({
      id: row.id,
      couponId: row.coupon_id,
      userId: row.user_id,
      paymentId: row.payment_id,
      discountInrPaise: row.discount_inr_paise,
      discount: formatInrPaise(row.discount_inr_paise),
      status: row.status,
      reservedAt: row.reserved_at,
      redeemedAt: row.redeemed_at,
      releasedAt: row.released_at,
      releaseReason: row.release_reason,
      createdAt: row.created_at,
    })),
    total: count || 0,
  };
}

module.exports = {
  normalizeCouponCode,
  formatInrPaise,
  buildCouponQuote,
  assertValidCouponQuote,
  reserveCouponForPayment,
  releaseCouponReservations,
  redeemCouponReservation,
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminGetCoupon,
  adminListRedemptions,
};
