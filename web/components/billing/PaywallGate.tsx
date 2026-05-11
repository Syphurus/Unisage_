"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { useAuth } from "@/lib/hooks/useAuth";
import type { EntitlementScope } from "@/lib/api/payments";
import { PaymentModal } from "@/components/billing/PaymentModal";

interface PaywallGateProps {
  scope: EntitlementScope;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  loading?: ReactNode;
}

const COPY: Record<EntitlementScope, { title: string; subtitle: string }> = {
  predictor: {
    title: "Paper Predictor is a premium feature",
    subtitle:
      "Topic-by-topic predictions, ranked by exam urgency and recall decay.",
  },
  analysis: {
    title: "Study Analysis is a premium feature",
    subtitle:
      "Weakness scores, time distribution, and a personalised study brief.",
  },
};

const BULLETS: Record<EntitlementScope, string[]> = {
  predictor: [
    "AI-ranked topics across every subject",
    "PYQ heat-map + repeat frequency",
    "Marks-per-minute prioritisation",
    "Updates as you complete content",
  ],
  analysis: [
    "Weak-subject detection that adapts daily",
    "Time + recall trends across the semester",
    "Per-subject mastery + decay forecast",
    "Quiz performance by question type",
  ],
};

export function PaywallGate({
  scope,
  title,
  subtitle,
  children,
  loading,
}: PaywallGateProps) {
  const { has, isLoading, refresh } = useEntitlements();
  const { user } = useAuth();
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading) return loading ?? null;
  if (has(scope)) return <>{children}</>;

  if (!user) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white/[0.05]">
          <Lock className="h-5 w-5 text-chalk-300" />
        </div>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[rgb(var(--fg))]">
          Sign in to continue
        </h2>
        <p className="mt-2 text-[13.5px] text-chalk-400">
          Log in to unlock premium features.
        </p>
        <Link href="/login" className="pill pill-mint-solid mt-5 inline-flex">
          Sign in <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto my-10 lg:my-16 max-w-3xl px-5 md:px-0">
      <div className="relative overflow-hidden rounded-card border border-white/[0.08] bg-[rgb(var(--bg-elev))] p-7 lg:p-10">
        {/* Glow accents */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-mint-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-mint-500/[0.04] blur-3xl"
          aria-hidden
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Left: copy + bullets */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-pulse-soft" />
              UNISAGE PREMIUM · LOCKED
            </div>
            <h2 className="mt-4 text-[28px] md:text-[34px] lg:text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
              {title ?? COPY[scope].title}
            </h2>
            <p className="mt-3 max-w-xl text-[14px] lg:text-[15px] leading-relaxed text-chalk-400">
              {subtitle ?? COPY[scope].subtitle}
            </p>
            <ul className="mt-6 space-y-2.5">
              {BULLETS[scope].map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-[13.5px] text-chalk-300"
                >
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-mint-400"
                    aria-hidden
                  />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-7 text-[11px] uppercase tracking-cap text-chalk-500">
              Secure Razorpay checkout · entitlements update automatically
            </p>
          </div>

          {/* Right: pricing card */}
          <div className="lg:col-span-2">
            <div className="rounded-card border border-white/[0.06] bg-black/30 p-6 lg:p-7">
              <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-cap text-mint-400">
                <Sparkles className="h-3 w-3" />
                PREMIUM ACCESS
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-[44px] lg:text-[52px] font-bold leading-none tracking-[-0.02em] text-[rgb(var(--fg))] tabular-nums">
                  ₹199
                </span>
                <span className="text-[12px] text-chalk-500">/ 30 days</span>
              </div>
              <p className="mt-1 text-[12.5px] text-chalk-400">
                Paper Predictor + Study Analysis
              </p>

              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-card bg-mint-500 px-5 py-3.5 text-[14px] font-semibold text-ink-950 shadow-[0_12px_32px_-12px_rgba(31,184,144,0.6)] transition-colors hover:bg-mint-400"
              >
                Unlock Premium
                <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                href="/billing"
                className="mt-3 inline-flex w-full items-center justify-center text-[12px] text-chalk-400 hover:text-chalk-200"
              >
                Manage billing →
              </Link>
            </div>
          </div>
        </div>
      </div>
      <PaymentModal
        open={paymentOpen}
        onOpenChange={(nextOpen) => {
          setPaymentOpen(nextOpen);
          if (!nextOpen) refresh();
        }}
        scope={scope}
      />
    </div>
  );
}
