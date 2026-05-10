"use client";

/**
 * Payment modal: full client-side payment flow against a manual UPI backend.
 *
 *   1. Fetch plans → user picks the (only) plan
 *   2. POST /payments/intent → display QR + amount + reference code
 *   3. User pays in their UPI app, types UTR, optionally uploads screenshot
 *   4. POST /payments/:id/submit → status becomes "pending_verification"
 *   5. EntitlementsProvider's 10s poll detects approval; modal closes.
 *
 * Backend is authoritative for every state — this component never grants
 * access locally.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  paymentsApi,
  PaymentsApiError,
  type IntentResponse,
  type Plan,
} from "@/lib/api/payments";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type Step =
  | "select_plan"
  | "show_qr"
  | "awaiting_review"
  | "approved"
  | "rejected";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Scope context — used to refresh on close. */
  scope?: "predictor" | "analysis";
}

export function PaymentModal({ open, onOpenChange, scope }: PaymentModalProps) {
  const { refresh: refreshEntitlements } = useEntitlements();

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [step, setStep] = useState<Step>("select_plan");
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pollFailures, setPollFailures] = useState(0);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep("select_plan");
    setIntent(null);
    setUtr("");
    setProof(null);
    setPollFailures(0);
  }, [open]);

  // Load plans on open
  useEffect(() => {
    if (!open || plans !== null) return;
    paymentsApi
      .listPlans()
      .then(setPlans)
      .catch((e: PaymentsApiError) => toast.error(e.message));
  }, [open, plans]);

  // Once submitted, poll the payment status (and entitlements) until approved or rejected.
  useEffect(() => {
    if (step !== "awaiting_review" || !intent) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const p = await paymentsApi.getOne(intent.payment.id);
        if (cancelled) return;
        if (p.status === "approved") {
          setStep("approved");
          refreshEntitlements();
          toast.success("Payment approved! Premium unlocked.");
        } else if (
          p.status === "rejected" ||
          p.status === "revoked" ||
          p.status === "expired" ||
          p.status === "cancelled"
        ) {
          setStep("rejected");
        }
        setPollFailures(0);
      } catch {
        if (!cancelled) setPollFailures((n) => n + 1);
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, intent, refreshEntitlements]);

  const startIntent = useCallback(async (plan: Plan) => {
    setSubmitting(true);
    try {
      const res = await paymentsApi.createIntent(plan.id);
      setIntent(res);
      setStep("show_qr");
    } catch (e) {
      const err = e as PaymentsApiError;
      if (err.code === "CONFLICT") {
        toast.error(
          "You already have an open payment. Cancel it from /billing to start a new one."
        );
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, []);

  const submitProof = useCallback(async () => {
    if (!intent) return;
    if (!/^[A-Za-z0-9]{8,32}$/.test(utr.trim())) {
      toast.error("UTR should be 8-32 alphanumeric characters");
      return;
    }
    setSubmitting(true);
    try {
      await paymentsApi.submitProof(intent.payment.id, utr.trim(), proof);
      setStep("awaiting_review");
    } catch (e) {
      const err = e as PaymentsApiError;
      if (err.code === "CONFLICT") {
        toast.error("This UTR is already linked to another payment.");
      } else if (err.code === "VALIDATION_ERROR") {
        toast.error(err.message);
      } else if (err.code === "FILE_TOO_LARGE") {
        toast.error("Proof must be under 5 MB");
      } else if (err.code === "UNSUPPORTED_MEDIA") {
        toast.error("Proof must be a JPG, PNG, WEBP, or PDF");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }, [intent, utr, proof]);

  const cancelIntent = useCallback(async () => {
    if (!intent) return;
    try {
      await paymentsApi.cancel(intent.payment.id);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [intent, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:max-w-lg border-white/[0.08] bg-[rgb(var(--bg))] p-0 sm:rounded-card text-[rgb(var(--fg))] [&>button]:hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-cap text-mint-400">
              <Sparkles className="h-3 w-3" />
              UNISAGE PREMIUM
            </div>
            <h2 className="mt-2 text-[20px] lg:text-[22px] font-semibold leading-tight tracking-[-0.01em]">
              {step === "select_plan"
                ? "Unlock premium"
                : step === "show_qr"
                  ? "Pay & submit proof"
                  : step === "awaiting_review"
                    ? "Payment under review"
                    : step === "approved"
                      ? "Premium unlocked"
                      : "Payment closed"}
            </h2>
            {step === "select_plan" && (
              <p className="mt-1 text-[12.5px] text-chalk-400">
                {scope === "predictor"
                  ? "Paper Predictor + Study Analysis."
                  : scope === "analysis"
                    ? "Study Analysis + Paper Predictor."
                    : "Paper Predictor + Study Analysis."}
              </p>
            )}
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

        <div className="px-6 pb-6 pt-5">
          {step === "select_plan" && (
            <PlanStep
              plans={plans}
              onSelect={startIntent}
              submitting={submitting}
            />
          )}
          {step === "show_qr" && intent && (
            <QrStep
              intent={intent}
              utr={utr}
              proof={proof}
              setUtr={setUtr}
              setProof={setProof}
              submitting={submitting}
              onCancel={cancelIntent}
              onSubmit={submitProof}
            />
          )}
          {step === "awaiting_review" && intent && (
            <AwaitingStep
              intent={intent}
              pollFailures={pollFailures}
              onClose={() => onOpenChange(false)}
            />
          )}
          {step === "approved" && (
            <ApprovedStep onClose={() => onOpenChange(false)} />
          )}
          {step === "rejected" && (
            <RejectedStep onRestart={() => setStep("select_plan")} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Steps
// ──────────────────────────────────────────────

function PlanStep({
  plans,
  onSelect,
  submitting,
}: {
  plans: Plan[] | null;
  onSelect: (p: Plan) => void;
  submitting: boolean;
}) {
  if (!plans) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-chalk-400" />
      </div>
    );
  }
  if (plans.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-chalk-400">
        No plans are currently available. Please try again later.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {plans.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          disabled={submitting}
          className="group relative w-full overflow-hidden rounded-card border border-white/[0.08] bg-[rgb(var(--bg-elev))] p-5 text-left transition-all hover:border-mint-500/40 hover:bg-[rgb(var(--bg-subtle))] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500">
                {p.scopes.join(" · ")} · {p.durationDays} DAYS
              </p>
              <h3 className="mt-1.5 text-[16px] font-semibold tracking-[-0.005em] text-[rgb(var(--fg))]">
                {p.name}
              </h3>
              {p.description && (
                <p className="mt-1 text-[12.5px] text-chalk-400 leading-relaxed">
                  {p.description}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[28px] font-bold leading-none tracking-[-0.01em] text-[rgb(var(--fg))] tabular-nums">
                ₹{p.amountInr}
              </p>
              <p className="mt-1 text-[10.5px] uppercase tracking-cap text-chalk-500">
                one-time
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-mint-400 opacity-0 transition-opacity group-hover:opacity-100">
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>
      ))}
      <p className="pt-1 text-center text-[11px] uppercase tracking-cap text-chalk-500">
        Manual UPI · approval usually within a few hours
      </p>
    </div>
  );
}

function QrStep({
  intent,
  utr,
  proof,
  setUtr,
  setProof,
  submitting,
  onCancel,
  onSubmit,
}: {
  intent: IntentResponse;
  utr: string;
  proof: File | null;
  setUtr: (s: string) => void;
  setProof: (f: File | null) => void;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const ins = intent.provider.instructions;
  return (
    <div className="space-y-5">
      {/* QR + amount card */}
      <div className="overflow-hidden rounded-card border border-white/[0.08] bg-[rgb(var(--bg-elev))]">
        <div className="grid grid-cols-1 sm:grid-cols-[200px,1fr]">
          <div className="grid place-items-center bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ins.qrImageDataUrl}
              alt="UPI payment QR"
              className="h-44 w-44"
            />
          </div>
          <div className="flex flex-col justify-between gap-4 p-5">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500">
                AMOUNT
              </p>
              <p className="mt-1 text-[36px] font-bold leading-none tracking-[-0.02em] text-[rgb(var(--fg))] tabular-nums">
                ₹{ins.amountInr}
              </p>
              <p className="mt-2 text-[12.5px] text-chalk-400">
                to {ins.payeeName}
              </p>
              <p className="font-mono text-[12px] text-chalk-300">{ins.vpa}</p>
            </div>
            <a
              href={ins.upiUri}
              className="inline-flex w-fit items-center gap-1 text-[12.5px] font-medium text-mint-400 hover:underline"
            >
              Open in UPI app <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="border-t border-white/[0.06] bg-black/20 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                REFERENCE CODE · INCLUDED AS NOTE
              </p>
              <code className="mt-0.5 block truncate font-mono text-[13px] text-[rgb(var(--fg))]">
                {ins.note}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(ins.note);
                toast.success("Copied reference");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-chalk-300 hover:bg-white/[0.06] hover:text-[rgb(var(--fg))]"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-chalk-400">
        After paying, paste the UTR (transaction ID) from your UPI app below.
        Approval is manual and usually takes a few hours.
      </p>

      <div className="space-y-2">
        <label
          htmlFor="utr"
          className="block text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500"
        >
          UTR / TRANSACTION ID
        </label>
        <input
          id="utr"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="e.g. 412345678901"
          maxLength={32}
          className="w-full rounded-[12px] border border-white/[0.08] bg-[rgb(var(--bg-elev))] px-4 py-3 font-mono text-[14px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="proof"
          className="block text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500"
        >
          PAYMENT PROOF · OPTIONAL · ≤ 5 MB
        </label>
        <label
          htmlFor="proof"
          className="flex cursor-pointer items-center gap-2 rounded-[12px] border border-dashed border-white/[0.12] bg-[rgb(var(--bg-elev))] px-4 py-3 text-[13px] text-chalk-300 transition-colors hover:border-mint-500/40 hover:text-[rgb(var(--fg))]"
        >
          <Upload className="h-4 w-4" />
          {proof ? (
            <span className="truncate">{proof.name}</span>
          ) : (
            <span>Attach JPG, PNG, WEBP, or PDF</span>
          )}
        </label>
        <input
          id="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => setProof(e.target.files?.[0] || null)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-card border border-white/[0.08] bg-transparent px-4 py-2.5 text-[13px] font-medium text-chalk-300 transition-colors hover:bg-white/[0.04] hover:text-[rgb(var(--fg))] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !utr}
          className="inline-flex items-center gap-2 rounded-card bg-mint-500 px-5 py-2.5 text-[13px] font-semibold text-ink-950 shadow-[0_8px_24px_-10px_rgba(31,184,144,0.6)] transition-all hover:bg-mint-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit for review
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function AwaitingStep({
  intent,
  pollFailures,
  onClose,
}: {
  intent: IntentResponse;
  pollFailures: number;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-3">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-500/10">
        <Clock className="h-6 w-6 text-amber-400" />
      </div>
      <p className="text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500">
        PENDING REVIEW
      </p>
      <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.005em] text-[rgb(var(--fg))]">
        Payment submitted
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-chalk-400">
        Reference{" "}
        <code className="font-mono text-chalk-200">
          {intent.provider.instructions.referenceCode}
        </code>
        . We&rsquo;ll verify your payment and unlock premium — usually within a
        few hours. You can close this window; we&rsquo;ll keep polling in the
        background.
      </p>
      {pollFailures > 3 && (
        <p className="mt-3 text-[11px] text-amber-300">
          Having trouble checking status. Refresh later or visit /billing.
        </p>
      )}
      <button
        onClick={onClose}
        className="mt-6 rounded-card border border-white/[0.08] bg-transparent px-5 py-2.5 text-[13px] font-medium text-chalk-200 hover:bg-white/[0.04]"
      >
        Close
      </button>
    </div>
  );
}

function ApprovedStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-3">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-mint-500/15">
        <CheckCircle2 className="h-7 w-7 text-mint-400" />
      </div>
      <p className="text-[10.5px] font-semibold uppercase tracking-cap text-mint-400">
        APPROVED
      </p>
      <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.005em] text-[rgb(var(--fg))]">
        Premium unlocked
      </h3>
      <p className="mt-2 text-[13px] text-chalk-400">
        Reload the page to start using premium features.
      </p>
      <button
        onClick={() => {
          onClose();
          if (typeof window !== "undefined") window.location.reload();
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-card bg-mint-500 px-5 py-2.5 text-[13px] font-semibold text-ink-950 shadow-[0_8px_24px_-10px_rgba(31,184,144,0.6)] hover:bg-mint-400"
      >
        Reload
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function RejectedStep({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="text-center py-3">
      <p className="text-[13px] text-chalk-300">
        This payment was closed. You can start a new payment if you&rsquo;d
        like.
      </p>
      <button
        onClick={onRestart}
        className="mt-5 inline-flex items-center gap-2 rounded-card bg-mint-500 px-5 py-2.5 text-[13px] font-semibold text-ink-950 hover:bg-mint-400"
      >
        Start a new payment
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
