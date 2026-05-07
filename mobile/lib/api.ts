// ============================================
// UniSage Mobile — Axios API Client
// ============================================

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_CONFIG, STORAGE_KEYS } from "./constants";
import { ApiError } from "./types";
import { getSecureItem } from "./secure-store";

/** Create a pre-configured Axios instance */
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "bypass-tunnel-reminder": "true", // Required for localtunnel dev access
  },
});

// ---- Request interceptor: attach JWT ----
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getSecureItem(STORAGE_KEYS.TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore may fail on certain platforms; continue without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response interceptor: unwrap data & handle 401 ----
let onUnauthorized: (() => void) | null = null;

/** Register a callback that fires when a 401 is received (set by AuthProvider) */
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

api.interceptors.response.use(
  (response) => response.data, // unwrap — callers get `{ success, data }`
  (error: AxiosError<ApiError>) => {
    const requestUrl = error.config?.url ?? "";
    const isAuthRoute =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/signup");

    if (error.response?.status === 401 && !isAuthRoute) {
      onUnauthorized?.();
    }

    let msg: string;
    if (error.response?.data) {
      // Server responded with an error body
      msg =
        (error.response.data as ApiError)?.error?.message ??
        JSON.stringify(error.response.data);
    } else if (
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error"
    ) {
      // Device can't reach the server at all
      msg = `Cannot connect to server at ${API_CONFIG.BASE_URL}. Make sure the backend is running and your device is on the same network.`;
      console.error(
        "[API] Network error — device cannot reach:",
        API_CONFIG.BASE_URL
      );
    } else if (error.code === "ECONNABORTED") {
      msg = "Request timed out. Please check your connection and try again.";
    } else {
      msg = error.message ?? "An unexpected error occurred";
    }

    console.error(
      "[API Error]",
      error.config?.method?.toUpperCase(),
      error.config?.url,
      "→",
      msg
    );
    return Promise.reject(new Error(msg));
  }
);

export default api;

// ---- Convenience typed helpers ----

/** GET request that returns the `data` field from `{ success, data }` */
export async function fetchData<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const res: any = await api.get(url, { params });
  return res.data as T;
}

/** POST request that returns the `data` field */
export async function postData<T>(
  url: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res: any = await api.post(url, body);
  return res.data as T;
}

/** PUT request that returns the `data` field */
export async function putData<T>(
  url: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res: any = await api.put(url, body);
  return res.data as T;
}

/** DELETE request that returns the `data` field */
export async function deleteData<T>(url: string): Promise<T> {
  const res: any = await api.delete(url);
  return res.data as T;
}

/** SWR-compatible fetcher */
export const swrFetcher = async (url: string) => {
  const res: any = await api.get(url);
  return res.data;
};
