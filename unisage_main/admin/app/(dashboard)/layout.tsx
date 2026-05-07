"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { useAuth } from "@/lib/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { canAccessPath } from "@/lib/access";

function DashboardAccessGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !canAccessPath(pathname, user.permissions)) {
      router.replace("/dashboard");
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading || (user && !canAccessPath(pathname, user.permissions))) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        {/* Content area — offset matches sidebar width, gracefully transitions */}
        <main className="flex-1 ml-[240px] transition-all duration-300 peer-[[data-collapsed]]:ml-[68px]">
          <DashboardAccessGate>{children}</DashboardAccessGate>
        </main>
      </div>
    </AuthProvider>
  );
}
