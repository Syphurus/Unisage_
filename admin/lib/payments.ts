/**
 * Admin payments API client.
 *
 * Wraps `apiClient` to surface error.code / status on failures so the UI can
 * distinguish version conflicts, validation failures, and rate limits.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface AdminPayment {
  id: string;
  referenceCode: string;
  userId: string;
  planId: string;
  status: PaymentStatus;
  amountInrPaise: number;
  amountInr: string;
  scopes: string[];
  durationDays: number;
  utr: string | null;
  proofUploadId: string | null;
  notes: string | null;
  rejectReason: string | null;
  revokeReason: string | null;
  version: number;
  provider: string;
  intentExpiresAt: string;
  submissionExpiresAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  revokedAt: string | null;
  approvedBy: string | null;
  rejectedBy: string | null;
  revokedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus =
  | "created"
  | "awaiting_submission"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "revoked"
  | "refunded";

export interface PaymentEvent {
  id: number;
  event_type: string;
  from_status: PaymentStatus | null;
  to_status: PaymentStatus | null;
  actor_type: "user" | "admin" | "system";
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaymentUpload {
  id: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  signedUrl: string | null;
}

export interface AuditLog {
  id: number;
  actor_type: "user" | "admin" | "system";
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface QueueResponse {
  rows: AdminPayment[];
  total: number;
}

export interface PaymentDetail {
  payment: AdminPayment;
  user: { id: string; email: string; full_name: string } | null;
  events: PaymentEvent[];
  upload: PaymentUpload | null;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  opts: {
    body?: unknown;
    idempotencyKey?: string;
    ifMatch?: number;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
  }

  if (!res.ok) {
    const code = json?.error?.code || "REQUEST_FAILED";
    const message = json?.error?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, code, message, json?.error?.details);
  }

  return (json?.data as T) ?? (json as T);
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const paymentsApi = {
  queue: (params: { status?: PaymentStatus; q?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    qs.set("limit", String(params.limit ?? 25));
    qs.set("offset", String(params.offset ?? 0));
    return request<QueueResponse>("GET", `/admin/payments/queue?${qs.toString()}`);
  },

  getOne: (id: string) =>
    request<PaymentDetail>("GET", `/admin/payments/${id}`),

  audit: (paymentId?: string) => {
    const qs = paymentId ? `?paymentId=${encodeURIComponent(paymentId)}` : "";
    return request<AuditLog[]>("GET", `/admin/payments/audit${qs}`);
  },

  approve: (id: string, expectedVersion: number, note?: string) =>
    request<{ payment_id: string; entitlement_ids: string[]; expires_at: string }>(
      "POST",
      `/admin/payments/${id}/approve`,
      {
        body: { note: note ?? "", expectedVersion },
        idempotencyKey: newIdempotencyKey(),
        ifMatch: expectedVersion,
      }
    ),

  reject: (id: string, expectedVersion: number, reason: string) =>
    request<{ payment_id: string }>("POST", `/admin/payments/${id}/reject`, {
      body: { reason, expectedVersion },
      idempotencyKey: newIdempotencyKey(),
      ifMatch: expectedVersion,
    }),

  revoke: (id: string, expectedVersion: number, reason: string) =>
    request<{ payment_id: string; entitlements_revoked: number }>(
      "POST",
      `/admin/payments/${id}/revoke`,
      {
        body: { reason, expectedVersion },
        idempotencyKey: newIdempotencyKey(),
        ifMatch: expectedVersion,
      }
    ),
};

export const STATUS_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  created: { label: "Created", cls: "bg-gray-100 text-gray-700" },
  awaiting_submission: { label: "Awaiting submission", cls: "bg-blue-100 text-blue-700" },
  pending_verification: { label: "Pending review", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  expired: { label: "Expired", cls: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-600" },
  revoked: { label: "Revoked", cls: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", cls: "bg-purple-100 text-purple-700" },
};
