"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertCircle, ArrowRight, BadgeIndianRupee, Loader2, Sparkles, X } from "lucide-react";
import { CouponCard } from "@/components/billing/CouponCard";
import { paymentsApi, type Plan } from "@/lib/api/payments";
import { useCoupon } from "@/lib/hooks/useCoupon";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", cb: (response: RazorpayFailedResponse) => void) => void;
    };
  }
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailedResponse {
  error?: {
    description?: string;
    reason?: string;
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  config?: {
    display?: {
      hide?: Array<{ method: string }>;
    };
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope?: "predictor" | "analysis";
}

export function PaymentModal({ open, onOpenChange, scope }: PaymentModalProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || plans.length) return;
    let cancelled = false;
    setLoadingPlans(true);
    setError(null);
    paymentsApi
      .listPlans()
      .then((rows) => {
        if (!cancelled) setPlans(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Could not load premium plan.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, plans.length]);

  const selectedPlan = useMemo(() => {
    if (!plans.length) return null;
    if (!scope) return plans[0];
    return plans.find((plan) => plan.scopes.includes(scope)) || plans[0];
  }, [plans, scope]);

  const coupon = useCoupon(selectedPlan);

  useEffect(() => {
    coupon.resetCoupon();
  }, [selectedPlan?.id]);

  const pricing = useMemo(() => {
    const originalAmountPaise = selectedPlan?.amountInrPaise || 0;
    const originalAmount = selectedPlan?.amountInr || "0.00";
    if (coupon.quote?.valid) {
      return coupon.quote;
    }
    return {
      originalAmountPaise,
      originalAmount,
      discountPaise: 0,
      discount: "0.00",
      finalAmountPaise: originalAmountPaise,
      finalAmount: originalAmount,
      couponCode: null,
    };
  }, [coupon.quote, selectedPlan]);

  const handlePay = async () => {
    if (!selectedPlan) {
      setError("Premium plan is not available yet.");
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setError("Razorpay checkout is still loading. Try again in a moment.");
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const order = await paymentsApi.createRazorpayOrder(
        selectedPlan.id,
        coupon.appliedCouponCode
      );
      const checkout = new window.Razorpay({
        key: order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: order.prefill,
        theme: { color: "#1fb890" },
        config: {
          display: {
            hide: [],
          },
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setError("Payment cancelled. You can try again when ready.");
          },
        },
        handler: async (response) => {
          try {
            await paymentsApi.verifyRazorpayPayment({
              paymentId: order.paymentId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            onOpenChange(false);
            router.push("/premium/success");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setPaying(false);
          }
        },
      });

      checkout.on("payment.failed", (response) => {
        setPaying(false);
        setError(
          response.error?.description ||
            response.error?.reason ||
            "Payment failed. Please try again."
        );
      });

      checkout.open();
    } catch (err) {
      setPaying(false);
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Could not load Razorpay checkout.")}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg border-white/[0.08] bg-[rgb(var(--bg))] p-0 sm:rounded-card text-[rgb(var(--fg))] [&>button]:hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-cap text-mint-400">
              <Sparkles className="h-3 w-3" />
              UNISAGE PREMIUM
            </div>
            <h2 className="mt-2 text-[20px] lg:text-[22px] font-semibold leading-tight tracking-[-0.01em]">
              Secure Razorpay checkout
            </h2>
            <p className="mt-1 text-[12.5px] text-chalk-400">
              {scope === "predictor"
                ? "Unlock Paper Predictor and keep the rest of the app protected."
                : scope === "analysis"
                  ? "Unlock Study Analysis and keep the rest of the app protected."
                  : "Unlock premium access with Razorpay."}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-8 w-8 place-items-center rounded-full text-chalk-400 transition-colors hover:bg-white/[0.05] hover:text-[rgb(var(--fg))]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px w-full bg-white/[0.06]" />

        <div className="px-6 pb-6 pt-5 space-y-5">
          <div className="rounded-card border border-white/[0.08] bg-[rgb(var(--bg-elev))] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500">
                  {selectedPlan?.name || "Hosted checkout"}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-chalk-300">
                  Complete payment through Razorpay. Once the payment is processed,
                  entitlements will refresh automatically.
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-mint-300/20 bg-mint-300/10 text-mint-200">
                <BadgeIndianRupee className="h-5 w-5" />
              </span>
            </div>
          </div>

          <CouponCard
            code={coupon.code}
            onCodeChange={(value) => {
              coupon.setCode(value);
              if (coupon.state === "applied") coupon.clearAppliedCoupon();
            }}
            onApply={coupon.applyCoupon}
            onRemove={coupon.resetCoupon}
            state={coupon.state}
            message={coupon.message}
            disabled={paying || loadingPlans || !selectedPlan}
          />

          <div className="rounded-card border border-white/[0.08] bg-black/20 p-4">
            <div className="flex items-center justify-between text-[13px] text-chalk-300">
              <span>Subtotal</span>
              <span>₹{pricing.originalAmount}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[13px] text-emerald-200">
              <span>Coupon Discount</span>
              <span>-₹{pricing.discount}</span>
            </div>
            <div className="my-3 h-px bg-white/[0.08]" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[rgb(var(--fg))]">
                Final Total
              </span>
              <span className="text-[22px] font-semibold tracking-[-0.01em] text-[rgb(var(--fg))]">
                ₹{pricing.finalAmount}
              </span>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-card border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying || loadingPlans || !selectedPlan || coupon.isValidating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-card bg-mint-500 px-5 py-3.5 text-[14px] font-semibold text-ink-950 shadow-[0_12px_32px_-12px_rgba(31,184,144,0.6)] transition-all hover:bg-mint-400 active:translate-y-px"
          >
            {paying || loadingPlans ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {paying ? "Opening checkout" : "Loading plan"}
              </>
            ) : (
              <>
                Pay {selectedPlan ? `₹${pricing.finalAmount}` : "with Razorpay"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] uppercase tracking-cap text-chalk-500">
            Powered by Razorpay · secure hosted checkout
          </p>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
