"use client";

import useSWR from "swr";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { paymentsApi, type AuditLog } from "@/lib/payments";
import { ArrowLeft } from "lucide-react";

const ACTION_COLOR: Record<string, string> = {
  "payment.approve": "text-emerald-700 bg-emerald-50",
  "payment.reject": "text-red-700 bg-red-50",
  "payment.revoke": "text-red-700 bg-red-50",
  "payment.intent.created": "text-blue-700 bg-blue-50",
  "payment.proof.submitted": "text-amber-800 bg-amber-50",
  "payment.cancelled": "text-gray-600 bg-gray-50",
  "payment.admin.view": "text-gray-600 bg-gray-50",
};

export default function PaymentsAuditPage() {
  const { data, error, isLoading } = useSWR<AuditLog[]>(
    "payments-audit",
    () => paymentsApi.audit(),
    { refreshInterval: 30_000 }
  );

  return (
    <div>
      <TopBar title="Payments audit log">
        <Link
          href="/dashboard/payments"
          className="flex items-center gap-1 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
      </TopBar>
      <div className="p-6 max-w-5xl">
        <Card className="p-5">
          {isLoading ? (
            <p className="text-[rgb(var(--muted))]">Loading…</p>
          ) : error ? (
            <p className="text-red-600">Failed: {error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-[rgb(var(--muted))]">No audit entries yet.</p>
          ) : (
            <ol className="space-y-2">
              {data.map((row) => {
                const cls = ACTION_COLOR[row.action] || "text-gray-700 bg-gray-50";
                return (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 border-b border-[rgb(var(--border))] py-2 last:border-0"
                  >
                    <span className="text-xs text-[rgb(var(--muted))] w-44 shrink-0 font-mono">
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-mono ${cls} shrink-0`}
                    >
                      {row.action}
                    </span>
                    <span className="text-xs text-[rgb(var(--muted))] shrink-0">
                      {row.actor_type}
                      {row.actor_id ? ` · ${row.actor_id.slice(0, 8)}…` : ""}
                    </span>
                    {row.target_id && (
                      <Link
                        href={`/dashboard/payments/${row.target_id}`}
                        className="text-xs font-mono text-brand-600 hover:underline truncate"
                      >
                        {row.target_id.slice(0, 8)}…
                      </Link>
                    )}
                    {Object.keys(row.metadata || {}).length > 0 && (
                      <code className="text-xs text-[rgb(var(--muted))] truncate">
                        {JSON.stringify(row.metadata)}
                      </code>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
