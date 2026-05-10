/**
 * Web payments API client.
 *
 * Standalone fetch wrapper (does not use the shared axios client) so we can:
 *   - send Idempotency-Key headers
 *   - send multipart for proof upload
 *   - surface backend error.code (ENTITLEMENT_REQUIRED, VERSION_CONFLICT, …)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type EntitlementScope = "predictor" | "analysis";

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

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountInrPaise: number;
  amountInr: string;
  durationDays: number;
  scopes: EntitlementScope[];
}

export interface UserPayment {
  id: string;
  referenceCode: string;
  status: PaymentStatus;
  amountInrPaise: number;
  amountInr: string;
  scopes: EntitlementScope[];
  durationDays: number;
  version: number;
  intentExpiresAt: string;
  submissionExpiresAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  revokedAt: string | null;
  rejectReason: string | null;
  revokeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntentInstructions {
  upiUri: string;
  qrImageDataUrl: string;
  vpa: string;
  payeeName: string;
  amountInr: string;
  amountPaise: number;
  referenceCode: string;
  note: string;
  userMessage: string;
}

export interface IntentResponse {
  payment: UserPayment;
  plan: Plan;
  provider: { provider: string; instructions: IntentInstructions };
}

export interface EntitlementSummary {
  scopes: Array<{ scope: EntitlementScope; expiresAt: string }>;
}

export class PaymentsApiError extends Error {
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

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  opts: {
    body?: unknown;
    formData?: FormData;
    idempotencyKey?: string;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = { ...authHeader() };
  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
    // Content-Type set by browser for multipart
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const res = await fetch(`${API_URL}${path}`, { method, headers, body });
  const json = await readJson(res);

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    // Don't redirect here — calling code may want to handle gracefully.
  }

  if (!res.ok) {
    const code = json?.error?.code || "REQUEST_FAILED";
    const message = json?.error?.message || `Request failed (${res.status})`;
    throw new PaymentsApiError(res.status, code, message, json?.error?.details);
  }
  return (json?.data as T) ?? (json as T);
}

export const paymentsApi = {
  listPlans: () => request<Plan[]>("GET", "/api/payments/plans"),

  createIntent: (planId: string) =>
    request<IntentResponse>("POST", "/api/payments/intent", {
      body: { planId },
      idempotencyKey: newIdempotencyKey(),
    }),

  submitProof: (paymentId: string, utr: string, proof: File | null) => {
    const fd = new FormData();
    fd.append("utr", utr);
    if (proof) fd.append("proof", proof);
    return request<{ paymentId: string; status: PaymentStatus }>(
      "POST",
      `/api/payments/${paymentId}/submit`,
      { formData: fd, idempotencyKey: newIdempotencyKey() }
    );
  },

  cancel: (paymentId: string) =>
    request<{ paymentId: string; status: PaymentStatus }>(
      "POST",
      `/api/payments/${paymentId}/cancel`
    ),

  getOne: (paymentId: string) =>
    request<UserPayment>("GET", `/api/payments/${paymentId}`),

  listMine: () => request<UserPayment[]>("GET", "/api/payments/mine"),

  myEntitlements: () =>
    request<EntitlementSummary>("GET", "/api/payments/me/entitlements"),
};
