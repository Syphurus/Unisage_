/**
 * @fileoverview Payment state machine service.
 *
 * All state transitions go through DB-side functions (RPCs) so atomicity,
 * version checks, and event/audit writes happen in one transaction. The
 * service layer never mutates `payments` directly with multiple statements.
 */

const crypto = require("crypto");
const Razorpay = require("razorpay");
const { supabase } = require("../../config/database");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const {
  AppError,
  AuthError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} = require("../../utils/errors");
const providerRegistry = require("./providers");
const entitlementService = require("../entitlements/entitlement.service");
const audit = require("../audit/audit.service");
const couponService = require("../coupons/coupon.service");

const REFERENCE_CODE_LENGTH = 12;
const MIN_RAZORPAY_AMOUNT_PAISE = 100;

let razorpayClient = null;

function getRazorpayClient() {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

function generateReferenceCode() {
  // Base32-ish, unambiguous (no 0/O/1/I).
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(REFERENCE_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < REFERENCE_CODE_LENGTH; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function normalizeUtr(utr) {
  if (typeof utr !== "string") return null;
  return utr.trim().toUpperCase();
}

async function cancelOpenPaymentsForNewCheckout({ userId, req }) {
  const { data: openRows, error: selectError } = await supabase
    .from("payments")
    .select("id, status")
    .eq("user_id", userId)
    .in("status", ["awaiting_submission", "pending_verification"]);
  if (selectError) throw selectError;
  if (!openRows?.length) return;

  const ids = openRows.map((row) => row.id);
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: "cancelled",
      notes: "Superseded by a new Razorpay checkout attempt",
    })
    .in("id", ids);
  if (updateError) throw updateError;

  await couponService.releaseCouponReservations({
    paymentIds: ids,
    reason: "superseded_by_new_checkout",
  });

  const { error: eventError } = await supabase.from("payment_events").insert(
    openRows.map((row) => ({
      payment_id: row.id,
      event_type: "superseded_by_new_checkout",
      from_status: row.status,
      to_status: "cancelled",
      actor_type: "user",
      actor_id: userId,
      metadata: { provider: "razorpay" },
    }))
  );
  if (eventError) throw eventError;

  audit.recordSafe({
    ...audit.fromReq(req),
    action: "payment.superseded_by_new_checkout",
    targetType: "payment",
    targetId: ids.join(","),
    metadata: { paymentIds: ids, provider: "razorpay" },
  });
}

function mapPgError(err, fallbackMessage) {
  const code = err?.code || err?.details || null;
  const message = err?.message || String(err);
  if (typeof message === "string") {
    if (message.includes("invalid transition")) {
      return new ConflictError("Invalid payment state transition");
    }
    if (message.includes("version conflict") || code === "40001") {
      return new ConflictError(
        "Payment was modified by another action — refresh and retry"
      );
    }
    if (message.includes("payment not found") || code === "P0002") {
      return new NotFoundError("Payment");
    }
    if (message.includes("forbidden")) {
      return new ForbiddenError("Forbidden");
    }
    if (message.includes("intent expired")) {
      return new ConflictError("Payment intent has expired — start a new one");
    }
  }
  return new AppError(fallbackMessage || message, 500, "PAYMENT_RPC_FAILED");
}

// ────────────────────────────────────────────────────────────
// Plans
// ────────────────────────────────────────────────────────────
async function listActivePlans() {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, code, name, description, amount_inr_paise, duration_days, scopes"
    )
    .eq("is_active", true)
    .order("amount_inr_paise", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getPlanById(planId) {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, code, name, description, amount_inr_paise, duration_days, scopes, is_active"
    )
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) throw new NotFoundError("Plan");
  return data;
}

// ────────────────────────────────────────────────────────────
// Intent creation
// ────────────────────────────────────────────────────────────
async function createIntent({ user, planId, req }) {
  const plan = await getPlanById(planId);

  const referenceCode = generateReferenceCode();
  const intentTtlHours = env.PAYMENT_INTENT_TTL_HOURS;
  const intentExpiresAt = new Date(
    Date.now() + intentTtlHours * 60 * 60 * 1000
  ).toISOString();

  const provider = providerRegistry.getDefault();

  const insertPayload = {
    reference_code: referenceCode,
    user_id: user.id,
    plan_id: plan.id,
    original_amount_inr_paise: plan.amount_inr_paise,
    amount_inr_paise: plan.amount_inr_paise,
    scopes: plan.scopes,
    duration_days: plan.duration_days,
    provider: provider.id,
    status: "awaiting_submission",
    intent_expires_at: intentExpiresAt,
  };

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert(insertPayload)
    .select(
      "id, reference_code, status, amount_inr_paise, scopes, duration_days, intent_expires_at, created_at, version"
    )
    .single();

  if (error) {
    // 23505 = unique_violation; the partial unique index forbids two open intents per user.
    if (error.code === "23505") {
      throw new ConflictError(
        "You already have an open payment. Cancel or complete it before starting a new one."
      );
    }
    throw error;
  }

  // Append intent.created event (best-effort; payment exists either way).
  await supabase.from("payment_events").insert({
    payment_id: inserted.id,
    event_type: "intent.created",
    to_status: "awaiting_submission",
    actor_type: "user",
    actor_id: user.id,
    metadata: { plan_code: plan.code, reference_code: referenceCode },
  });

  audit.recordSafe({
    ...audit.fromReq(req),
    action: "payment.intent.created",
    targetType: "payment",
    targetId: inserted.id,
    metadata: { planId: plan.id, referenceCode },
  });

  const instructions = await provider.createIntentInstructions({
    userId: user.id,
    plan,
    referenceCode,
  });

  return {
    payment: {
      id: inserted.id,
      referenceCode: inserted.reference_code,
      status: inserted.status,
      amountInrPaise: inserted.amount_inr_paise,
      amountInr: (inserted.amount_inr_paise / 100).toFixed(2),
      scopes: inserted.scopes,
      durationDays: inserted.duration_days,
      intentExpiresAt: inserted.intent_expires_at,
      version: inserted.version,
    },
    plan: {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      amountInrPaise: plan.amount_inr_paise,
      durationDays: plan.duration_days,
      scopes: plan.scopes,
    },
    provider: instructions,
  };
}

// ────────────────────────────────────────────────────────────
// Razorpay Standard Checkout
// ────────────────────────────────────────────────────────────
async function createRazorpayOrder({ user, planId, couponCode, req }) {
  const plan = await getPlanById(planId);
  const couponQuote = couponCode
    ? await couponService.assertValidCouponQuote({ user, planId, couponCode })
    : null;
  const originalAmountPaise = Number(plan.amount_inr_paise);
  const discountPaise = couponQuote?.discountPaise || 0;
  const finalAmountPaise = Math.max(0, originalAmountPaise - discountPaise);

  if (finalAmountPaise < MIN_RAZORPAY_AMOUNT_PAISE) {
    throw new ValidationError("Amount must be at least 100 paise");
  }

  await cancelOpenPaymentsForNewCheckout({ userId: user.id, req });

  const referenceCode = generateReferenceCode();
  const intentTtlHours = env.PAYMENT_INTENT_TTL_HOURS;
  const intentExpiresAt = new Date(
    Date.now() + intentTtlHours * 60 * 60 * 1000
  ).toISOString();

  const insertPayload = {
    reference_code: referenceCode,
    user_id: user.id,
    plan_id: plan.id,
    original_amount_inr_paise: originalAmountPaise,
    coupon_id: couponQuote?.couponId || null,
    coupon_code: couponQuote?.couponCode || null,
    coupon_discount_inr_paise: discountPaise,
    amount_inr_paise: finalAmountPaise,
    scopes: plan.scopes,
    duration_days: plan.duration_days,
    provider: "razorpay",
    status: "awaiting_submission",
    intent_expires_at: intentExpiresAt,
  };

  let { data: inserted, error } = await supabase
    .from("payments")
    .insert(insertPayload)
    .select(
      "id, reference_code, status, amount_inr_paise, scopes, duration_days, intent_expires_at, created_at, version"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      await cancelOpenPaymentsForNewCheckout({ userId: user.id, req });
      const retry = await supabase
        .from("payments")
        .insert(insertPayload)
        .select(
          "id, reference_code, status, amount_inr_paise, scopes, duration_days, intent_expires_at, created_at, version"
        )
        .single();
      inserted = retry.data;
      error = retry.error;
      if (error?.code === "23505") {
        throw new ConflictError("Could not replace the previous open payment. Try again.");
      }
    }
    if (error) throw error;
  }

  try {
    if (couponQuote) {
      await couponService.reserveCouponForPayment({
        couponId: couponQuote.couponId,
        paymentId: inserted.id,
        userId: user.id,
        discountPaise,
      });
    }

    const order = await getRazorpayClient().orders.create({
      amount: finalAmountPaise,
      currency: "INR",
      receipt: referenceCode,
      notes: {
        payment_id: inserted.id,
        user_id: user.id,
        plan_id: plan.id,
        coupon_code: couponQuote?.couponCode || "",
      },
    });

    const { error: eventInsertError } = await supabase.from("payment_events").insert([
      {
        payment_id: inserted.id,
        event_type: "intent.created",
        to_status: "awaiting_submission",
        actor_type: "user",
        actor_id: user.id,
        metadata: {
          plan_code: plan.code,
          reference_code: referenceCode,
          coupon_code: couponQuote?.couponCode || null,
          original_amount: originalAmountPaise,
          discount: discountPaise,
          final_amount: finalAmountPaise,
        },
      },
      {
        payment_id: inserted.id,
        event_type: "razorpay.order.created",
        actor_type: "system",
        metadata: {
          razorpay_order_id: order.id,
          receipt: order.receipt,
          amount: order.amount,
          currency: order.currency,
        },
      },
    ]);
    if (eventInsertError) throw eventInsertError;

    audit.recordSafe({
      ...audit.fromReq(req),
      action: "payment.razorpay.order.created",
      targetType: "payment",
      targetId: inserted.id,
      metadata: {
        planId: plan.id,
        referenceCode,
        razorpayOrderId: order.id,
        couponCode: couponQuote?.couponCode || null,
        discountPaise,
        finalAmountPaise,
      },
    });

    return {
      paymentId: inserted.id,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
      name: "UniSage Premium",
      description: plan.name,
      pricing: {
        originalAmountPaise,
        originalAmount: couponService.formatInrPaise(originalAmountPaise),
        discountPaise,
        discount: couponService.formatInrPaise(discountPaise),
        finalAmountPaise,
        finalAmount: couponService.formatInrPaise(finalAmountPaise),
        couponCode: couponQuote?.couponCode || null,
      },
      prefill: {
        name: user.full_name || user.fullName || "",
        email: user.email || "",
      },
    };
  } catch (err) {
    await couponService.releaseCouponReservations({
      paymentIds: [inserted.id],
      reason: "razorpay_order_failed",
    });

    await supabase
      .from("payments")
      .update({ status: "cancelled", version: inserted.version + 1 })
      .eq("id", inserted.id)
      .eq("status", "awaiting_submission");

    const statusCode = err?.statusCode || err?.status || err?.error?.code;
    if (statusCode === 401) {
      throw new AuthError("Razorpay authentication failed");
    }

    logger.error("Razorpay order creation failed", {
      paymentId: inserted.id,
      message: err.message,
      statusCode,
    });
    throw new AppError("Failed to create Razorpay order", 500, "RAZORPAY_ORDER_FAILED");
  }
}

async function verifyRazorpayPayment({
  user,
  paymentId,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
  req,
}) {
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(razorpaySignature, "hex");
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    audit.security({
      severity: "suspicious",
      category: "razorpay_signature_mismatch",
      userId: user.id,
      ip: req?.ip,
      metadata: { paymentId, razorpayOrderId, razorpayPaymentId },
    });
    throw new ValidationError("Payment signature verification failed");
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .select(ADMIN_PAYMENT_FIELDS)
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!payment) throw new NotFoundError("Payment");
  if (payment.provider !== "razorpay") {
    throw new ValidationError("Payment was not created for Razorpay checkout");
  }

  if (payment.status === "approved") {
    return { paymentId, status: "approved" };
  }
  if (payment.status !== "awaiting_submission") {
    throw new ConflictError("Payment is not awaiting Razorpay verification");
  }
  if (payment.intent_expires_at && new Date(payment.intent_expires_at) < new Date()) {
    throw new ConflictError("Payment intent has expired — start a new one");
  }

  const { data: events, error: eventError } = await supabase
    .from("payment_events")
    .select("metadata, created_at")
    .eq("payment_id", paymentId)
    .eq("event_type", "razorpay.order.created")
    .order("created_at", { ascending: false })
    .limit(1);
  if (eventError) throw eventError;

  const createdOrderId = events?.[0]?.metadata?.razorpay_order_id;
  if (createdOrderId !== razorpayOrderId) {
    throw new ValidationError("Razorpay order does not match this payment");
  }

  const data = await approveVerifiedRazorpayPayment({
    payment,
    razorpayOrderId,
    razorpayPaymentId,
    req,
  });

  await couponService.redeemCouponReservation({ paymentId: payment.id });

  entitlementService.invalidateUser(user.id);
  return {
    paymentId,
    status: "approved",
    expiresAt: data.expires_at,
    entitlementIds: data.entitlement_ids,
  };
}

async function approveVerifiedRazorpayPayment({
  payment,
  razorpayOrderId,
  razorpayPaymentId,
  req,
}) {
  const { data, error } = await supabase.rpc("approve_razorpay_payment", {
    p_payment_id: payment.id,
    p_user_id: payment.user_id,
    p_expected_version: payment.version,
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId,
  });
  if (error) throw mapPgError(error, "Failed to approve Razorpay payment");

  audit.recordSafe({
    ...audit.fromReq(req),
    action: "payment.razorpay.verified",
    targetType: "payment",
    targetId: payment.id,
    metadata: {
      razorpayOrderId,
      razorpayPaymentId,
      entitlementIds: data?.entitlement_ids || [],
    },
  });

  return data;
}

// ────────────────────────────────────────────────────────────
// Submit proof
// ────────────────────────────────────────────────────────────
async function submitProof({ user, paymentId, utr, upload, req }) {
  const utrNormalized = normalizeUtr(utr);
  if (!utrNormalized || !/^[A-Z0-9]{8,32}$/.test(utrNormalized)) {
    throw new ValidationError("UTR must be 8-32 alphanumeric characters");
  }

  const { data, error } = await supabase.rpc("submit_proof", {
    p_payment_id: paymentId,
    p_user_id: user.id,
    p_utr_normalized: utrNormalized,
    p_upload: upload || null,
    p_submission_ttl_hours: env.PAYMENT_SUBMISSION_TTL_HOURS,
  });

  if (error) {
    // 23505 = duplicate utr (partial unique index)
    if (error.code === "23505") {
      audit.security({
        severity: "suspicious",
        category: "duplicate_utr",
        userId: user.id,
        ip: req?.ip,
        metadata: { paymentId, utr: utrNormalized },
      });
      throw new ConflictError(
        "This UTR is already associated with another live payment"
      );
    }
    throw mapPgError(error, "Failed to submit proof");
  }

  audit.recordSafe({
    ...audit.fromReq(req),
    action: "payment.proof.submitted",
    targetType: "payment",
    targetId: paymentId,
    metadata: { utr: utrNormalized, uploadId: data?.upload_id || null },
  });

  return data;
}

// ────────────────────────────────────────────────────────────
// Cancel (user-side)
// ────────────────────────────────────────────────────────────
async function cancel({ user, paymentId, req }) {
  const { data, error } = await supabase.rpc("cancel_payment", {
    p_payment_id: paymentId,
    p_user_id: user.id,
  });
  if (error) throw mapPgError(error, "Failed to cancel payment");

  await couponService.releaseCouponReservations({
    paymentIds: [paymentId],
    reason: "user_cancelled_payment",
  });

  audit.recordSafe({
    ...audit.fromReq(req),
    action: "payment.cancelled",
    targetType: "payment",
    targetId: paymentId,
  });

  return data;
}

async function adminCancel({ admin, paymentId, expectedVersion, req }) {
  const { data, error } = await supabase.rpc("admin_cancel_payment", {
    p_payment_id: paymentId,
    p_admin_id: admin.id,
    p_expected_version: expectedVersion,
  });
  if (error) throw mapPgError(error, "Failed to cancel payment");

  await couponService.releaseCouponReservations({
    paymentIds: [paymentId],
    reason: "admin_cancelled_payment",
  });

  await audit.record({
    ...audit.fromReq(req),
    action: "payment.cancel",
    targetType: "payment",
    targetId: paymentId,
    metadata: { cancelledBy: "admin" },
  });

  return data;
}

// ────────────────────────────────────────────────────────────
// Admin actions
// ────────────────────────────────────────────────────────────
async function approve({ admin, paymentId, expectedVersion, note, req }) {
  const { data, error } = await supabase.rpc("approve_payment", {
    p_payment_id: paymentId,
    p_admin_id: admin.id,
    p_expected_version: expectedVersion,
    p_note: note || null,
  });
  if (error) throw mapPgError(error, "Failed to approve payment");

  // Invalidate entitlement cache so the user gains access immediately.
  // Fetch the payment to know the user_id (lightweight).
  const { data: row } = await supabase
    .from("payments")
    .select("user_id")
    .eq("id", paymentId)
    .single();
  if (row?.user_id) entitlementService.invalidateUser(row.user_id);

  await audit.record({
    ...audit.fromReq(req),
    action: "payment.approve",
    targetType: "payment",
    targetId: paymentId,
    metadata: { note: note || null, entitlements: data?.entitlement_ids || [] },
  });

  return data;
}

async function reject({ admin, paymentId, expectedVersion, reason, req }) {
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    throw new ValidationError("A rejection reason is required");
  }

  const { data, error } = await supabase.rpc("reject_payment", {
    p_payment_id: paymentId,
    p_admin_id: admin.id,
    p_expected_version: expectedVersion,
    p_reason: reason.trim(),
  });
  if (error) throw mapPgError(error, "Failed to reject payment");

  await audit.record({
    ...audit.fromReq(req),
    action: "payment.reject",
    targetType: "payment",
    targetId: paymentId,
    metadata: { reason: reason.trim() },
  });

  return data;
}

async function revoke({ admin, paymentId, expectedVersion, reason, req }) {
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    throw new ValidationError("A revocation reason is required");
  }

  const { data, error } = await supabase.rpc("revoke_payment", {
    p_payment_id: paymentId,
    p_admin_id: admin.id,
    p_expected_version: expectedVersion,
    p_reason: reason.trim(),
  });
  if (error) throw mapPgError(error, "Failed to revoke payment");

  const { data: row } = await supabase
    .from("payments")
    .select("user_id")
    .eq("id", paymentId)
    .single();
  if (row?.user_id) entitlementService.invalidateUser(row.user_id);

  await audit.record({
    ...audit.fromReq(req),
    action: "payment.revoke",
    targetType: "payment",
    targetId: paymentId,
    metadata: {
      reason: reason.trim(),
      entitlements_revoked: data?.entitlements_revoked || 0,
    },
  });

  return data;
}

// ────────────────────────────────────────────────────────────
// Reads
// ────────────────────────────────────────────────────────────
const USER_PAYMENT_FIELDS =
  "id, reference_code, status, amount_inr_paise, scopes, duration_days, version, " +
  "intent_expires_at, submission_expires_at, approved_at, rejected_at, revoked_at, reject_reason, revoke_reason, created_at, updated_at";

async function getUserPayment({ user, paymentId }) {
  const { data, error } = await supabase
    .from("payments")
    .select(USER_PAYMENT_FIELDS)
    .eq("id", paymentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Payment");
  return data;
}

async function listUserPayments({ user }) {
  const { data, error } = await supabase
    .from("payments")
    .select(USER_PAYMENT_FIELDS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

const ADMIN_PAYMENT_FIELDS =
  "id, reference_code, user_id, plan_id, status, amount_inr_paise, scopes, duration_days, " +
  "utr_normalized, proof_upload_id, notes, reject_reason, revoke_reason, version, " +
  "intent_expires_at, submission_expires_at, approved_at, rejected_at, revoked_at, " +
  "approved_by, rejected_by, revoked_by, created_at, updated_at, provider";

async function adminListQueue({ status, query, limit = 50, offset = 0 }) {
  let q = supabase
    .from("payments")
    .select(ADMIN_PAYMENT_FIELDS, { count: "exact" });

  if (status) q = q.eq("status", status);
  else q = q.eq("status", "pending_verification");

  if (query) {
    const trimmed = query.trim();
    if (trimmed) {
      const escaped = trimmed.replace(/[%_]/g, "\\$&");
      q = q.or(
        `reference_code.ilike.%${escaped}%,utr_normalized.ilike.%${escaped.toUpperCase()}%`
      );
    }
  }

  q = q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

async function adminGetPayment({ paymentId }) {
  const { data, error } = await supabase
    .from("payments")
    .select(ADMIN_PAYMENT_FIELDS)
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Payment");

  const { data: events } = await supabase
    .from("payment_events")
    .select(
      "id, event_type, from_status, to_status, actor_type, actor_id, metadata, created_at"
    )
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: true });

  let upload = null;
  if (data.proof_upload_id) {
    const { data: u } = await supabase
      .from("payment_uploads")
      .select(
        "id, storage_bucket, storage_key, mime_type, size_bytes, sha256, uploaded_at"
      )
      .eq("id", data.proof_upload_id)
      .maybeSingle();
    upload = u || null;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", data.user_id)
    .maybeSingle();

  return { payment: data, events: events || [], upload, user: userRow };
}

module.exports = {
  // plans
  listActivePlans,
  getPlanById,
  // user lifecycle
  createIntent,
  createRazorpayOrder,
  verifyRazorpayPayment,
  submitProof,
  cancel,
  adminCancel,
  getUserPayment,
  listUserPayments,
  // admin lifecycle
  approve,
  reject,
  revoke,
  adminListQueue,
  adminGetPayment,
  // helpers (exported for tests)
  generateReferenceCode,
  normalizeUtr,
};
