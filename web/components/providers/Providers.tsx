"use client";

import { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { SWRConfig } from "swr";
import { ThemeInitializer } from "@/components/providers/ThemeInitializer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        dedupingInterval: 5000,
      }}
    >
      <ThemeInitializer />
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
            },
          }}
          richColors
          closeButton
        />
      </AuthProvider>
    </SWRConfig>
  );
}
