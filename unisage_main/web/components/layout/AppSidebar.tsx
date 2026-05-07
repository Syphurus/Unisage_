"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  BookOpen,
  Layers,
  FileText,
  RectangleHorizontal,
  GraduationCap,
  BarChart3,
  Bot,
  HelpCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const navItems = [
  { label: "Subjects", href: "/subjects", icon: BookOpen },
  { label: "Units", href: "/subjects", icon: Layers },
  { label: "Notes", href: "/subjects", icon: FileText },
  { label: "Flashcards", href: "/subjects", icon: RectangleHorizontal },
  { label: "Quizzes", href: "/quizzes", icon: GraduationCap },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const weeklyDone = 12;
  const weeklyTarget = 15;

  return (
    <aside className="hidden lg:flex lg:w-[220px] lg:shrink-0 lg:flex-col border-r border-[#EBEBF5] bg-white min-h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-[#EBEBF5]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#0D1B2A] text-white flex items-center justify-center text-[11px] font-bold">
            {getInitials(user?.fullName || "US")}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#0D1B2A]">UniSage</p>
            <p className="text-[10px] text-[#98A0B8]">The Digital Curator</p>
          </div>
        </div>
      </div>

      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium border-l-2 transition-colors",
                active
                  ? "border-l-[#00B4A6] bg-[#EAF8F7] text-[#0D1B2A]"
                  : "border-l-transparent text-[#5D6580] hover:bg-[#F4F4FC] hover:text-[#0D1B2A]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3 space-y-3 border-t border-[#EBEBF5]">
        <div className="rounded-xl border border-[#EBEBF5] bg-[#F9F9FF] p-2.5">
          <p className="text-[10px] font-bold uppercase text-[#707891]">
            Weekly Goal
          </p>
          <p className="text-[13px] font-semibold text-[#0D1B2A] mt-1">
            {weeklyDone}/{weeklyTarget} Quizzes
          </p>
          <Progress
            value={(weeklyDone / weeklyTarget) * 100}
            className="mt-2"
          />
        </div>

        <button className="w-full text-left text-[12px] text-[#707891] hover:text-[#0D1B2A] inline-flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5" />
          Help Center
        </button>
        <button
          onClick={logout}
          className="w-full text-left text-[12px] text-[#707891] hover:text-[#0D1B2A] inline-flex items-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
