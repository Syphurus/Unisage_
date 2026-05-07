"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/api";
import { getToken, setToken, removeToken, type User } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount: check if we have a valid token and load user
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      setIsLoading(false);
      return;
    }

    apiClient<User>("/auth/me")
      .then((res) => {
        if (res.data.role !== "admin") {
          removeToken();
          setUser(null);
          router.replace("/login");
        } else {
          setUser(res.data);
        }
      })
      .catch(() => {
        removeToken();
        setUser(null);
        router.replace("/login");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiClient<{ user: User; token: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );

      if (res.data.user.role !== "admin") {
        throw new Error("Only admin accounts can access this dashboard");
      }

      setToken(res.data.token);
      setUser(res.data.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {isLoading ? null : user ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
