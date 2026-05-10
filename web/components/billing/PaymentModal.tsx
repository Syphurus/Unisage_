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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  paymentsApi,
  PaymentsApiError,
  type IntentResponse,
  type Plan,
} from "@/lib/api/payments";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Upload,
} from "lucide-react";

type Step = "select_plan" | "show_qr" | "awaiting_review" | "approved" | "rejected";

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
          "You already have an open payment. Cancel it from your payments list to start a new one."
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock UniSage Premium</DialogTitle>
          <DialogDescription>
            {scope === "predictor"
              ? "Paper Predictor and Analysis are premium features."
              : scope === "analysis"
                ? "Study Analysis is a premium feature."
                : "Unlock Paper Predictor and Study Analysis."}
          </DialogDescription>
        </DialogHeader>

        {step === "select_plan" && (
          <div className="space-y-3">
            {!plans ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No plans are currently available. Please try again later.
              </p>
            ) : (
              plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => startIntent(p)}
                  disabled={submitting}
                  className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className="text-2xl font-bold">₹{p.amountInr}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.scopes.join(" + ")} · {p.durationDays} days
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {step === "show_qr" && intent && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={intent.provider.instructions.qrImageDataUrl}
                alt="UPI payment QR"
                width={240}
                height={240}
                className="mx-auto rounded-md"
              />
              <p className="mt-3 text-2xl font-bold">
                ₹{intent.provider.instructions.amountInr}
              </p>
              <p className="text-xs text-muted-foreground">
                to {intent.provider.instructions.payeeName} ·{" "}
                <span className="font-mono">
                  {intent.provider.instructions.vpa}
                </span>
              </p>
              <a
                href={intent.provider.instructions.upiUri}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open in UPI app <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Reference code (note)</p>
              <div className="flex items-center justify-between">
                <code className="font-mono text-sm">
                  {intent.provider.instructions.note}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      intent.provider.instructions.note
                    );
                    toast.success("Copied");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              After paying, enter the UTR (transaction ID) from your UPI app
              below. Approval is manual and typically takes a few hours.
            </p>

            <div className="space-y-2">
              <Label htmlFor="utr">UTR / Transaction ID</Label>
              <Input
                id="utr"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 412345678901"
                className="font-mono"
                maxLength={32}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof">Screenshot (optional, ≤ 5 MB)</Label>
              <label
                htmlFor="proof"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary"
              >
                <Upload className="h-4 w-4" />
                {proof ? proof.name : "Choose a JPG, PNG, WEBP, or PDF"}
              </label>
              <input
                id="proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setProof(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={cancelIntent} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitProof} disabled={submitting || !utr}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit for review"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "awaiting_review" && intent && (
          <div className="space-y-3 py-2 text-center">
            <Clock className="mx-auto h-10 w-10 text-amber-500" />
            <h3 className="font-semibold">Payment under review</h3>
            <p className="text-sm text-muted-foreground">
              Your payment{" "}
              <code className="font-mono">
                {intent.provider.instructions.referenceCode}
              </code>{" "}
              has been submitted. We&rsquo;ll verify it and unlock premium —
              usually within a few hours. You can close this window.
            </p>
            {pollFailures > 3 && (
              <p className="text-xs text-amber-700">
                Having trouble checking status — please refresh later.
              </p>
            )}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        {step === "approved" && (
          <div className="space-y-3 py-2 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h3 className="font-semibold">Approved! Premium unlocked.</h3>
            <p className="text-sm text-muted-foreground">
              Access is active. Refresh the page to start using premium
              features.
            </p>
            <Button
              onClick={() => {
                onOpenChange(false);
                if (typeof window !== "undefined") window.location.reload();
              }}
            >
              Reload
            </Button>
          </div>
        )}

        {step === "rejected" && intent && (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm">
              This payment was{" "}
              <span className="font-medium">
                {intent.payment.status === "rejected" ? "rejected" : "closed"}
              </span>
              . You can start a new payment.
            </p>
            <Button onClick={() => setStep("select_plan")}>Start a new payment</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
