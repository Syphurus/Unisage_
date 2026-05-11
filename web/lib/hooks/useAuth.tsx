"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { toast } from "sonner";
import type { User, SignupData } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

function normalizeUser(user: User | null | undefined): User | null {
  if (!user) return null;

  return {
    ...user,
    collegeCode: user.collegeCode || user.college?.code || null,
    branchCode: user.branchCode || user.branch?.code || null,
  };
}

function isProfileComplete(user: User | null) {
  if (!user) return false;
  return !!(
    (user.collegeCode || user.college?.code) &&
    (user.branchCode || user.branch?.code) &&
    user.year &&
    user.semester &&
    (user.semester < 4 || user.specialization)
  );
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await authAPI.me();
        const userData = normalizeUser(response.data?.user || response.data);
        setUser(userData);
      }
    } catch (err) {
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authAPI.login({ email, password });
      const data = response.data;
      localStorage.setItem("token", data.token);
      setUser(normalizeUser(data.user));
      toast.success("Welcome back!");
      router.push(isProfileComplete(data.user) ? "/dashboard" : "/onboarding");
    },
    [router]
  );

  const signup = useCallback(
    async (data: SignupData) => {
      const response = await authAPI.signup(data);
      const resData = response.data;
      localStorage.setItem("token", resData.token);
      setUser(normalizeUser(resData.user));
      toast.success("Account created successfully!");
      router.push(
        isProfileComplete(resData.user) ? "/dashboard" : "/onboarding"
      );
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    toast.success("Logged out successfully");
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const response = await authAPI.me();
    const userData = normalizeUser(response.data?.user || response.data);
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
