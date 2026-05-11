const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export type CouponType = "fixed" | "percentage";
export type CouponStatusFilter = "all" | "active" | "inactive" | "expired";
export type RedemptionStatus = "reserved" | "redeemed" | "released";

export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  maxDiscountInrPaise: number | null;
  maxDiscount: string | null;
  minPurchaseInrPaise: number;
  minPurchase: string;
  usageLimit: number | null;
  usedCount: number;
  perUserUsageLimit: number | null;
  allowedEmailDomains: string[];
  firstPurchaseOnly: boolean;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponMutationBody {
  code?: string;
  type?: CouponType;
  value?: number;
  maxDiscountInrPaise?: number | null;
  minPurchaseInrPaise?: number;
  usageLimit?: number | null;
  perUserUsageLimit?: number | null;
  allowedEmailDomains?: string[];
  firstPurchaseOnly?: boolean;
  active?: boolean;
  expiresAt?: string | null;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  paymentId: string;
  discountInrPaise: number;
  discount: string;
  status: RedemptionStatus;
  reservedAt: string;
  redeemedAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
}

export interface CouponListResponse {
  rows: AdminCoupon[];
  total: number;
}

export interface CouponDetailResponse {
  coupon: AdminCoupon;
  stats: {
    total: number;
    reserved: number;
    redeemed: number;
    released: number;
    redeemedDiscountInrPaise: number;
    redeemedDiscount: string;
  };
}

export interface CouponRedemptionsResponse {
  rows: CouponRedemption[];
  total: number;
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
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

export const couponsApi = {
  list: (
    params: {
      status?: CouponStatusFilter;
      q?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) => {
    const qs = new URLSearchParams();
    qs.set("status", params.status ?? "all");
    if (params.q) qs.set("q", params.q);
    qs.set("limit", String(params.limit ?? 50));
    qs.set("offset", String(params.offset ?? 0));
    return request<CouponListResponse>("GET", `/admin/coupons?${qs.toString()}`);
  },

  create: (body: CouponMutationBody) =>
    request<AdminCoupon>("POST", "/admin/coupons", body),

  update: (id: string, body: CouponMutationBody) =>
    request<AdminCoupon>("PATCH", `/admin/coupons/${id}`, body),

  getOne: (id: string) =>
    request<CouponDetailResponse>("GET", `/admin/coupons/${id}`),

  redemptions: (id: string) =>
    request<CouponRedemptionsResponse>(
      "GET",
      `/admin/coupons/${id}/redemptions?limit=50`
    ),
};
