"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { TopBar } from "@/components/layout/TopBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  paymentsApi,
  STATUS_BADGE,
  type PaymentStatus,
  type QueueResponse,
} from "@/lib/payments";
import { Card } from "@/components/ui/card";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS: Array<{ value: PaymentStatus | "all"; label: string }> = [
  { value: "pending_verification", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
  { value: "awaiting_submission", label: "Awaiting submission" },
];

export default function PaymentsQueuePage() {
  const [status, setStatus] = useState<PaymentStatus | "all">(
    "pending_verification"
  );
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const swrKey = `payments-queue:${status}:${debouncedQ}`;
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>(
    swrKey,
    () =>
      paymentsApi.queue({
        status: status === "all" ? undefined : status,
        q: debouncedQ || undefined,
        limit: 50,
      }),
    {
      onError: (err) => toast.error(err.message),
      refreshInterval: 10_000,
    }
  );

  const rows = data?.rows ?? [];

  return (
    <div>
      <TopBar title="Payments" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  status === opt.value
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface-subtle))]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/payments/audit"
              className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] underline"
            >
              Audit log →
            </Link>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--muted))]" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setDebouncedQ(e.target.value);
              }}
              placeholder="Search by reference code or UTR…"
              className="pl-9"
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>UTR</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[rgb(var(--muted))]">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-red-600">
                    Failed to load: {error.message}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[rgb(var(--muted))]">
                    No payments in this state.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => {
                  const badge = STATUS_BADGE[p.status];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.referenceCode}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell>₹{p.amountInr}</TableCell>
                      <TableCell className="text-xs">
                        {p.scopes.join(", ")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.utr || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-[rgb(var(--muted))]">
                        {new Date(p.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/payments/${p.id}`}
                          className="text-sm font-medium text-brand-600 hover:underline"
                        >
                          Open →
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <p className="text-xs text-[rgb(var(--muted))]">
          {data?.total ?? 0} total · auto-refreshes every 10s. All decisions are
          audit-logged; revocations require the <code>payments.revoke</code>{" "}
          permission.
        </p>
      </div>
    </div>
  );
}
