"use client";

import { useCallback, useMemo, useState } from "react";
import { paymentsApi, type CouponValidationResponse, type Plan } from "@/lib/api/payments";

type CouponState = "idle" | "validating" | "applied" | "invalid";

export function useCoupon(plan: Plan | null) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<CouponState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [quote, setQuote] = useState<CouponValidationResponse | null>(null);

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  const resetCoupon = useCallback(() => {
    setCode("");
    setState("idle");
    setMessage(null);
    setQuote(null);
  }, []);

  const clearAppliedCoupon = useCallback(() => {
    setState("idle");
    setMessage(null);
    setQuote(null);
  }, []);

  const applyCoupon = useCallback(async () => {
    if (!plan) {
      setState("invalid");
      setMessage("Premium plan is not available yet.");
      return null;
    }
    if (!normalizedCode) {
      setState("invalid");
      setMessage("Enter a coupon code.");
      setQuote(null);
      return null;
    }

    setState("validating");
    setMessage(null);
    try {
      const response = await paymentsApi.validateCoupon(plan.id, normalizedCode);
      setMessage(response.message);
      if (!response.valid) {
        setState("invalid");
        setQuote(null);
        return response;
      }
      setState("applied");
      setQuote(response);
      setCode(response.couponCode);
      return response;
    } catch (err) {
      setState("invalid");
      setQuote(null);
      setMessage(err instanceof Error ? err.message : "Could not validate coupon.");
      return null;
    }
  }, [normalizedCode, plan]);

  return {
    code,
    setCode,
    normalizedCode,
    state,
    message,
    quote,
    appliedCouponCode: quote?.valid ? quote.couponCode : null,
    isValidating: state === "validating",
    applyCoupon,
    clearAppliedCoupon,
    resetCoupon,
  };
}
