// ============================================
// UniSage Mobile — Auth Context & Hook
// ============================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { router } from "expo-router";
import api, { setOnUnauthorized } from "../api";
import storage from "../storage";
import { STORAGE_KEYS } from "../constants";
import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "../secure-store";
import type { User, LoginPayload, SignupPayload, AuthTokens } from "../types";

// ---- Types ----
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// ---- Provider ----
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount (check for existing token)
  useEffect(() => {
    loadUser();
    // Register 401 handler so API interceptor can trigger logout
    setOnUnauthorized(() => {
      handleUnauthorized();
    });
  }, []);

  /** Attempt to restore session from stored JWT */
  const loadUser = useCallback(async () => {
    try {
      const token = await getSecureItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        setIsLoading(false);
        return;
      }
      const response: any = await api.get("/api/auth/me");
      setUser(response.data);
    } catch {
      // Token invalid/expired — clear it
      await deleteSecureItem(STORAGE_KEYS.TOKEN);
      await storage.remove(STORAGE_KEYS.USER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Handle 401 — clear state and redirect to login */
  const handleUnauthorized = useCallback(async () => {
    await deleteSecureItem(STORAGE_KEYS.TOKEN);
    await storage.remove(STORAGE_KEYS.USER);
    setUser(null);
    router.replace("/(auth)/login");
  }, []);

  /** Login with email + password */
  const login = useCallback(async (payload: LoginPayload) => {
    const response: any = await api.post("/api/auth/login", payload);
    const { token, user: userData } = response.data as AuthTokens;
    await setSecureItem(STORAGE_KEYS.TOKEN, token);
    await storage.set(STORAGE_KEYS.USER, userData);
    setUser(userData);
    router.replace("/(tabs)");
  }, []);

  /** Create a new account */
  const signup = useCallback(async (payload: SignupPayload) => {
    const response: any = await api.post("/api/auth/signup", payload);
    const { token, user: userData } = response.data as AuthTokens;
    await setSecureItem(STORAGE_KEYS.TOKEN, token);
    await storage.set(STORAGE_KEYS.USER, userData);
    setUser(userData);
    router.replace("/(tabs)");
  }, []);

  /** Logout — clear token, cache, redirect */
  const logout = useCallback(async () => {
    await deleteSecureItem(STORAGE_KEYS.TOKEN);
    await storage.remove(STORAGE_KEYS.USER);
    await storage.remove(STORAGE_KEYS.CACHED_SUBJECTS);
    await storage.remove(STORAGE_KEYS.CACHED_PROGRESS);
    setUser(null);
    router.replace("/(auth)/login");
  }, []);

  /** Re-fetch user data (pull-to-refresh, etc.) */
  const refreshUser = useCallback(async () => {
    try {
      const response: any = await api.get("/api/auth/me");
      setUser(response.data);
      await storage.set(STORAGE_KEYS.USER, response.data);
    } catch {
      // silent fail
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- Hook ----
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
