/**
 * @fileoverview Custom coupon validation and reservation service.
 *
 * Razorpay never receives coupon metadata. The application owns validation,
 * discount calculation, reservation, and redemption; Razorpay receives only the
 * final payable amount in paise.
 */

const { supabase } = require("../../config/database");
const { ValidationError, NotFoundError } = require("../../utils/errors");

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

module.exports = {
  normalizeCouponCode,
  formatInrPaise,
  buildCouponQuote,
  assertValidCouponQuote,
  reserveCouponForPayment,
  releaseCouponReservations,
  redeemCouponReservation,
};
