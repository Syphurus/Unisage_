"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/unisage/AppShell";

const HIDE_TABS_ROUTES = ["/onboarding"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";

  const profileComplete = !!(
    user?.collegeCode &&
    user?.branchCode &&
    user?.year &&
    user?.semester &&
    (user.semester < 4 || user.specialization)
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    if (!isLoading && user && !profileComplete && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [isLoading, user, profileComplete, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const hideTabs = HIDE_TABS_ROUTES.some((r) => pathname.startsWith(r));
  const bare = pathname.startsWith("/onboarding");

  return (
    <AppShell hideTabs={hideTabs} bare={bare}>
      {children}
    </AppShell>
  );
}
