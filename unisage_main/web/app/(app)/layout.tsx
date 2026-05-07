"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { TopNav } from "@/components/layout/TopNav";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { RouteTransition } from "@/components/shared/RouteTransition";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const profileComplete = !!(
    user?.collegeCode &&
    user?.branchCode &&
    user?.year &&
    user?.semester
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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#0D1B2A]">
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 min-w-0">
          <TopNav />
          <main className="p-4 lg:p-8">
            <RouteTransition>{children}</RouteTransition>
          </main>
        </div>
      </div>
    </div>
  );
}

function MobileBottomTabs() {
  return null; // TopNav with hamburger handles mobile nav
}
