"use client";

/**
 * Entitlement provider. Polls /api/payments/me/entitlements while mounted
 * so revocations propagate within ~60 seconds. The backend remains the
 * single source of truth — this hook never makes access decisions on its
 * own, it merely reflects what the backend reports.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  paymentsApi,
  PaymentsApiError,
  type EntitlementScope,
  type EntitlementSummary,
} from "@/lib/api/payments";
import { useAuth } from "@/lib/hooks/useAuth";

interface EntitlementsContextValue {
  scopes: Map<EntitlementScope, string>;
  has: (scope: EntitlementScope) => boolean;
  expiresAt: (scope: EntitlementScope) => string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<EntitlementsContextValue | null>(null);

const POLL_MS = 60_000;

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<EntitlementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      setIsLoading(false);
      return;
    }
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      setData(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await paymentsApi.myEntitlements();
      setData(res);
    } catch (err) {
      if (err instanceof PaymentsApiError && err.status === 401) {
        setData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial + polling fetch
  useEffect(() => {
    refresh();
    if (!user) return;
    if (typeof window !== "undefined" && !localStorage.getItem("token")) return;
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refresh]);

  const value = useMemo<EntitlementsContextValue>(() => {
    const m = new Map<EntitlementScope, string>();
    (data?.scopes || []).forEach((s) => m.set(s.scope, s.expiresAt));
    return {
      scopes: m,
      has: (scope) => m.has(scope),
      expiresAt: (scope) => m.get(scope) ?? null,
      isLoading,
      refresh,
    };
  }, [data, isLoading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsContextValue {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useEntitlements must be used within EntitlementsProvider");
  return v;
}
