"use client";

/**
 * Premium gate. Wraps a section of UI; renders children only if the user
 * holds the named entitlement scope, otherwise renders an upgrade card and
 * provides a payment modal trigger. Backend remains authoritative — this is
 * a UX layer, not access control.
 */

import { useState, type ReactNode } from "react";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { useAuth } from "@/lib/hooks/useAuth";
import { PaymentModal } from "./PaymentModal";
import type { EntitlementScope } from "@/lib/api/payments";
import Link from "next/link";

interface PaywallGateProps {
  scope: EntitlementScope;
  title?: string;
  subtitle?: string;
  /** Render when the user IS entitled. */
  children: ReactNode;
  /** Optional fallback while entitlement state loads. */
  loading?: ReactNode;
}

const COPY: Record<EntitlementScope, { title: string; subtitle: string }> = {
  predictor: {
    title: "Paper Predictor is a premium feature",
    subtitle:
      "Get topic-by-topic predictions for upcoming exams across every subject.",
  },
  analysis: {
    title: "Study Analysis is a premium feature",
    subtitle:
      "See your weak subjects, time distribution, and personalised study insights.",
  },
};

export function PaywallGate({
  scope,
  title,
  subtitle,
  children,
  loading,
}: PaywallGateProps) {
  const { has, isLoading } = useEntitlements();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return loading ?? null;
  }
  if (has(scope)) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <Card className="mx-auto my-12 max-w-lg">
        <CardContent className="p-6 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Sign in to continue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to unlock premium features.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mx-auto my-8 max-w-lg border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">{title ?? COPY[scope].title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle ?? COPY[scope].subtitle}
          </p>
          <p className="mt-4 text-3xl font-bold">₹199</p>
          <p className="text-xs text-muted-foreground">
            One-time · 30 days · Predictor + Analysis
          </p>
          <Button className="mt-5" onClick={() => setModalOpen(true)}>
            Unlock Premium
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Pay via any UPI app. Approval is manual and usually takes a few
            hours.
          </p>
        </CardContent>
      </Card>
      <PaymentModal open={modalOpen} onOpenChange={setModalOpen} scope={scope} />
    </>
  );
}
