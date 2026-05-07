/**
 * API client for communicating with the Node.js backend.
 * All requests include the JWT token from localStorage.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

/** Standard API response shape */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Fetch wrapper that:
 *  - prefixes the backend URL
 *  - injects the JWT Bearer token
 *  - parses JSON
 *  - throws with a user-friendly message on error
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  // Get token from localStorage (client-side only)
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token");
  }

  const incomingHeaders = (options?.headers as Record<string, string>) || {};
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...incomingHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
  }

  if (!res.ok) {
    const message = json?.error?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json as ApiResponse<T>;
}

/* ─── Convenience helpers ────────────────────────────── */

export const api = {
  get: <T = unknown>(url: string) => apiClient<T>(url),

  post: <T = unknown>(url: string, body: unknown) =>
    apiClient<T>(url, {
      method: "POST",
      body:
        typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : JSON.stringify(body),
    }),

  put: <T = unknown>(url: string, body: unknown) =>
    apiClient<T>(url, {
      method: "PUT",
      body:
        typeof FormData !== "undefined" && body instanceof FormData
          ? body
          : JSON.stringify(body),
    }),

  delete: <T = unknown>(url: string) => apiClient<T>(url, { method: "DELETE" }),
};
