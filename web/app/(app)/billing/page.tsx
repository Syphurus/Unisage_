"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentModal } from "@/components/billing/PaymentModal";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { useAuth } from "@/lib/hooks/useAuth";

export default function BillingPage() {
  const { user } = useAuth();
  const { scopes, refresh } = useEntitlements();
  const [modalOpen, setModalOpen] = useState(false);

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
          Secure checkout for Paper Predictor and Study Analysis.
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
                    {scope === "predictor"
                      ? "Paper Predictor"
                      : "Study Analysis"}
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

      {!hasAny ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">UniSage Premium</h2>
            <p className="text-sm text-muted-foreground">
              Paper Predictor + Study Analysis
            </p>
            <p className="text-3xl font-bold">₹199</p>
            <p className="text-xs text-muted-foreground">
              Secure Razorpay checkout
            </p>
            <Button className="mt-1" onClick={() => setModalOpen(true)}>
              Unlock Premium
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Your current access is listed above. Premium is already active for
            this account.
          </CardContent>
        </Card>
      )}

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
