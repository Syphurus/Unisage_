"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { paymentsApi } from "@/lib/api/payments";
import { useEntitlements } from "@/lib/hooks/useEntitlements";

export default function PremiumSuccessPage() {
  const router = useRouter();
  const { refresh } = useEntitlements();
  const [status, setStatus] = useState<"polling" | "success" | "timeout">(
    "polling"
  );

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      for (let i = 0; i < 12 && !cancelled; i++) {
        try {
          const res = await paymentsApi.myEntitlements();
          const unlocked = res.scopes.some(
            (s) => s.scope === "predictor" || s.scope === "analysis"
          );
          if (unlocked) {
            if (cancelled) return;
            setStatus("success");
            await refresh();
            setTimeout(() => {
              if (!cancelled) router.replace("/predictor");
            }, 1500);
            return;
          }
        } catch {
          // network blip — keep retrying
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) setStatus("timeout");
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center px-6 bg-[rgb(var(--bg))]">
      <div className="max-w-md w-full rounded-card border border-white/[0.08] bg-[rgb(var(--bg-elev))] p-8 text-center">
        {status === "polling" && (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-mint-500/15">
              <Loader2 className="h-5 w-5 animate-spin text-mint-400" />
            </div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Payment received
            </h1>
            <p className="mt-2 text-sm text-chalk-400">
              Activating your access — this takes just a moment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-mint-500/15">
              <CheckCircle2 className="h-5 w-5 text-mint-400" />
            </div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              You&rsquo;re premium!
            </h1>
            <p className="mt-2 text-sm text-chalk-400">
              Redirecting to Paper Predictor…
            </p>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white/[0.05]">
              <CheckCircle2 className="h-5 w-5 text-chalk-300" />
            </div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Taking longer than usual
            </h1>
            <p className="mt-2 text-sm text-chalk-400">
              Your payment went through. Access may take a minute to activate.
            </p>
            <button
              onClick={() => router.replace("/predictor")}
              className="mt-6 inline-flex items-center gap-2 rounded-card bg-mint-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-mint-400"
            >
              Go to Predictor <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
