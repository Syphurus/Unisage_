"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  paymentsApi,
  ApiError,
  STATUS_BADGE,
  type PaymentDetail,
} from "@/lib/payments";
import { useAuth } from "@/lib/hooks/useAuth";
import { hasAnyPermission } from "@/lib/access";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Ban,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canRevoke = hasAnyPermission(user?.permissions, ["payments.revoke"]);

  const { data, error, isLoading, mutate } = useSWR<PaymentDetail>(
    params.id ? `payment-detail:${params.id}` : null,
    () => paymentsApi.getOne(params.id),
    { refreshInterval: 15_000 }
  );

  const [confirm, setConfirm] = useState<
    | { kind: "approve"; note: string }
    | { kind: "reject"; reason: string }
    | { kind: "cancel" }
    | { kind: "revoke"; reason: string }
    | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div>
        <TopBar title="Payment" />
        <div className="p-6 text-[rgb(var(--muted))]">Loading…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div>
        <TopBar title="Payment" />
        <div className="p-6">
          <p className="text-red-600">Failed to load: {error?.message}</p>
          <Link
            href="/dashboard/payments"
            className="text-sm underline mt-2 inline-block"
          >
            ← Back to queue
          </Link>
        </div>
      </div>
    );
  }

  const { payment, user: payer, events, upload } = data;
  const badge = STATUS_BADGE[payment.status];
  const canActOnPending = payment.status === "pending_verification";
  const canCancelOpen =
    payment.status === "created" || payment.status === "awaiting_submission";
  const canRevokeNow = payment.status === "approved" && canRevoke;

  async function doConfirm() {
    if (!confirm) return;
    setSubmitting(true);
    try {
      if (confirm.kind === "approve") {
        await paymentsApi.approve(payment.id, payment.version, confirm.note);
        toast.success("Payment approved. Entitlement granted.");
      } else if (confirm.kind === "reject") {
        await paymentsApi.reject(payment.id, payment.version, confirm.reason);
        toast.success("Payment rejected.");
      } else if (confirm.kind === "cancel") {
        await paymentsApi.cancel(payment.id, payment.version);
        toast.success("Payment cancelled.");
      } else if (confirm.kind === "revoke") {
        const res = await paymentsApi.revoke(
          payment.id,
          payment.version,
          confirm.reason
        );
        toast.success(
          `Payment revoked. ${res.entitlements_revoked} entitlement(s) revoked.`
        );
      }
      setConfirm(null);
      await mutate();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "CONFLICT" || err.status === 409) {
        toast.error("Payment was modified by another admin. Refreshing…");
        await mutate();
      } else {
        toast.error(err.message || "Action failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <TopBar title="Payment detail">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </TopBar>

      <div className="p-6 space-y-4 max-w-5xl">
        {/* Summary */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                >
                  {badge.label}
                </span>
                <span className="font-mono text-sm">
                  {payment.referenceCode}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(payment.referenceCode);
                      toast.success("Reference copied");
                    }}
                    className="ml-1 inline-flex items-center text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
                <span className="text-xs text-[rgb(var(--muted))]">
                  v{payment.version}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold">₹{payment.amountInr}</h2>
              <p className="text-sm text-[rgb(var(--muted))]">
                {payment.scopes.join(" + ")} · {payment.durationDays} days
              </p>
            </div>
            <div className="flex gap-2">
              {canActOnPending && (
                <>
                  <Button
                    onClick={() => setConfirm({ kind: "approve", note: "" })}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirm({ kind: "reject", reason: "" })}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Reject
                  </Button>
                </>
              )}
              {canCancelOpen && (
                <Button
                  variant="outline"
                  onClick={() => setConfirm({ kind: "cancel" })}
                >
                  <Ban className="mr-2 h-4 w-4 text-gray-600" />
                  Cancel
                </Button>
              )}
              {canRevokeNow && (
                <Button
                  variant="outline"
                  onClick={() => setConfirm({ kind: "revoke", reason: "" })}
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                  Revoke
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payer */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Payer</h3>
            {payer ? (
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={payer.full_name} />
                <Row label="Email" value={payer.email} mono />
                <Row label="User ID" value={payer.id} mono small />
              </dl>
            ) : (
              <p className="text-[rgb(var(--muted))] text-sm">User missing</p>
            )}
          </Card>

          {/* Payment fields */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Payment</h3>
            <dl className="space-y-2 text-sm">
              <Row label="UTR" value={payment.utr || "—"} mono />
              <Row label="Provider" value={payment.provider} />
              <Row
                label="Created"
                value={new Date(payment.createdAt).toLocaleString()}
              />
              <Row
                label="Intent expires"
                value={new Date(payment.intentExpiresAt).toLocaleString()}
              />
              {payment.submissionExpiresAt && (
                <Row
                  label="Submission window ends"
                  value={new Date(payment.submissionExpiresAt).toLocaleString()}
                />
              )}
              {payment.approvedAt && (
                <Row
                  label="Approved at"
                  value={new Date(payment.approvedAt).toLocaleString()}
                />
              )}
              {payment.rejectedAt && (
                <Row
                  label="Rejected at"
                  value={new Date(payment.rejectedAt).toLocaleString()}
                />
              )}
              {payment.revokedAt && (
                <Row
                  label="Revoked at"
                  value={new Date(payment.revokedAt).toLocaleString()}
                />
              )}
              {payment.rejectReason && (
                <Row label="Reject reason" value={payment.rejectReason} />
              )}
              {payment.revokeReason && (
                <Row label="Revoke reason" value={payment.revokeReason} />
              )}
              {payment.notes && <Row label="Note" value={payment.notes} />}
            </dl>
          </Card>
        </div>

        {/* Proof */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Payment proof</h3>
            {upload?.signedUrl && (
              <a
                href={upload.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                Open in new tab <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {!upload ? (
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              No proof was uploaded.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-[rgb(var(--muted))] flex flex-wrap gap-3">
                <span>{upload.mimeType}</span>
                <span>{(upload.sizeBytes / 1024).toFixed(1)} KB</span>
                <span className="font-mono">
                  sha256: {upload.sha256.slice(0, 16)}…
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  URL expires in ~60s — refresh to re-issue
                </span>
              </div>
              {upload.signedUrl ? (
                upload.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={upload.signedUrl}
                    alt="Payment proof"
                    className="max-h-[600px] rounded border border-[rgb(var(--border))]"
                  />
                ) : (
                  <iframe
                    title="Payment proof"
                    src={upload.signedUrl}
                    className="w-full h-[600px] rounded border border-[rgb(var(--border))]"
                  />
                )
              ) : (
                <p className="text-sm text-red-600">
                  Could not generate signed URL — try refreshing.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Event timeline */}
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Timeline</h3>
          <ol className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 text-sm border-l-2 border-[rgb(var(--border))] pl-3"
              >
                <span className="text-xs text-[rgb(var(--muted))] w-40 shrink-0">
                  {new Date(e.created_at).toLocaleString()}
                </span>
                <span className="font-medium">{e.event_type}</span>
                <span className="text-xs text-[rgb(var(--muted))]">
                  by {e.actor_type}
                  {e.from_status ? ` · ${e.from_status} → ${e.to_status}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <DialogContent>
          {confirm?.kind === "approve" && (
            <>
              <DialogHeader>
                <DialogTitle>Approve this payment?</DialogTitle>
                <DialogDescription>
                  This will grant {payment.scopes.join(" + ")} for{" "}
                  {payment.durationDays} days. The user gains access immediately
                  and this action is audit-logged.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Optional note (visible to admins only)"
                value={confirm.note}
                onChange={(e) =>
                  setConfirm({ ...confirm, note: e.target.value })
                }
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={doConfirm}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? "Approving…" : "Confirm approve"}
                </Button>
              </div>
            </>
          )}
          {confirm?.kind === "reject" && (
            <>
              <DialogHeader>
                <DialogTitle>Reject this payment?</DialogTitle>
                <DialogDescription>
                  The user will see the rejection reason. They can submit a new
                  payment afterwards.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Reason (required, ≥ 3 chars)"
                value={confirm.reason}
                onChange={(e) =>
                  setConfirm({ ...confirm, reason: e.target.value })
                }
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={doConfirm}
                  disabled={submitting || confirm.reason.trim().length < 3}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {submitting ? "Rejecting…" : "Confirm reject"}
                </Button>
              </div>
            </>
          )}
          {confirm?.kind === "revoke" && (
            <>
              <DialogHeader>
                <DialogTitle>Revoke this payment?</DialogTitle>
                <DialogDescription>
                  This will revoke all entitlements granted by this payment.
                  Access is lost on the user&rsquo;s next request. The payment
                  record is preserved.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Reason (required, ≥ 3 chars)"
                value={confirm.reason}
                onChange={(e) =>
                  setConfirm({ ...confirm, reason: e.target.value })
                }
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={doConfirm}
                  disabled={submitting || confirm.reason.trim().length < 3}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {submitting ? "Revoking…" : "Confirm revoke"}
                </Button>
              </div>
            </>
          )}
          {confirm?.kind === "cancel" && (
            <>
              <DialogHeader>
                <DialogTitle>Cancel this payment?</DialogTitle>
                <DialogDescription>
                  This will move the payment to cancelled and close the open
                  intent. The user can start a fresh checkout afterwards.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={doConfirm}
                  disabled={submitting}
                  className="bg-gray-800 hover:bg-gray-900"
                >
                  {submitting ? "Cancelling…" : "Confirm cancel"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <dt className="text-[rgb(var(--muted))] w-36 shrink-0">{label}</dt>
      <dd
        className={`${mono ? "font-mono" : ""} ${small ? "text-xs" : ""} break-all`}
      >
        {value}
      </dd>
    </div>
  );
}
