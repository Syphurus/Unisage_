/**
 * Client-side auth helpers.
 * Token is stored in localStorage and mirrored to a cookie so middleware can gate routes.
 */

const TOKEN_COOKIE = "auth-token";

function setCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
  setCookie(token);
}

export function removeToken() {
  localStorage.removeItem("token");
  clearCookie();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "student" | "admin";
  permissions?: string[];
  year: number;
  enrollmentNumber?: string;
  college?: { name: string; code: string } | null;
  branch?: { name: string; code: string } | null;
  createdAt?: string;
  lastActive?: string;
}
