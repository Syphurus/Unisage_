"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Sparkles, CheckCircle2, Clock, XCircle, Ban, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentModal } from "@/components/billing/PaymentModal";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { paymentsApi, type UserPayment } from "@/lib/api/payments";
import { useAuth } from "@/lib/hooks/useAuth";

const STATUS_DISPLAY: Record<UserPayment["status"], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  created: { label: "Created", cls: "text-gray-500 bg-gray-100", icon: Clock },
  awaiting_submission: {
    label: "Awaiting submission",
    cls: "text-blue-700 bg-blue-50",
    icon: Clock,
  },
  pending_verification: {
    label: "Pending review",
    cls: "text-amber-800 bg-amber-50",
    icon: Clock,
  },
  approved: { label: "Approved", cls: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "text-red-700 bg-red-50", icon: XCircle },
  expired: { label: "Expired", cls: "text-gray-600 bg-gray-50", icon: Ban },
  cancelled: { label: "Cancelled", cls: "text-gray-600 bg-gray-50", icon: Ban },
  revoked: { label: "Revoked", cls: "text-red-700 bg-red-50", icon: XCircle },
  refunded: { label: "Refunded", cls: "text-purple-700 bg-purple-50", icon: Shield },
};

export default function BillingPage() {
  const { user } = useAuth();
  const { scopes, refresh } = useEntitlements();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: history } = useSWR<UserPayment[]>(
    user ? "billing-history" : null,
    () => paymentsApi.listMine(),
    { refreshInterval: 15_000 }
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Sign in to manage billing.</p>
            <Button asChild className="mt-4">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAny = scopes.size > 0;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Billing & Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock Paper Predictor and Study Analysis.
        </p>
      </header>

      {/* Current entitlements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your access</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAny ? (
            <ul className="space-y-2 text-sm">
              {Array.from(scopes.entries()).map(([scope, exp]) => (
                <li key={scope} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium capitalize">
                    {scope === "predictor" ? "Paper Predictor" : "Study Analysis"}
                  </span>
                  <span className="text-muted-foreground">
                    · expires {new Date(exp).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              You don&rsquo;t have premium access yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {!hasAny && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">UniSage Premium</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paper Predictor + Study Analysis
            </p>
            <p className="mt-4 text-3xl font-bold">₹199</p>
            <p className="text-xs text-muted-foreground">One-time · 30 days</p>
            <Button className="mt-5" onClick={() => setModalOpen(true)}>
              Unlock Premium
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Pay via any UPI app. Approval is manual and usually takes a few
              hours.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {!history ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((p) => {
                const s = STATUS_DISPLAY[p.status];
                const Icon = s.icon;
                return (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}
                        >
                          <Icon className="h-3 w-3" />
                          {s.label}
                        </span>
                        <code className="font-mono text-xs text-muted-foreground">
                          {p.referenceCode}
                        </code>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString()} · ₹{p.amountInr} ·{" "}
                        {p.scopes.join(" + ")}
                      </p>
                      {p.rejectReason && (
                        <p className="mt-1 text-xs text-red-700">
                          Reason: {p.rejectReason}
                        </p>
                      )}
                    </div>
                    <span className="font-bold">₹{p.amountInr}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <PaymentModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) refresh();
        }}
      />
    </div>
  );
}
