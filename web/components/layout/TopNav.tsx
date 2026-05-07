"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bell,
  Settings,
  GraduationCap,
  LayoutDashboard,
  Library,
} from "lucide-react";
import { MobileNav } from "./MobileNav";

const tabs = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Library", href: "/subjects", icon: Library },
];

export function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#EBEBF5] bg-white">
      <div className="h-16 px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[#0D1B2A]"
          >
            <div className="h-8 w-8 rounded-full bg-[#0D1B2A] flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[14px]">UniSage</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium",
                    isActive
                      ? "bg-[#F4F4FC] text-[#0D1B2A]"
                      : "text-[#707891] hover:text-[#0D1B2A]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden md:inline-flex text-[#707891] hover:text-[#0D1B2A]">
            <Bell className="h-4 w-4" />
          </button>
          <button className="hidden md:inline-flex text-[#707891] hover:text-[#0D1B2A]">
            <Settings className="h-4 w-4" />
          </button>
          <Avatar className="h-9 w-9 border border-[#EBEBF5]">
            <AvatarFallback className="bg-[#E2EAF8] text-[#0D1B2A] text-[12px] font-semibold">
              {user ? getInitials(user.fullName || "S") : "S"}
            </AvatarFallback>
          </Avatar>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
