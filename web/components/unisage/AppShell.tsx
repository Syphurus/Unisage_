"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/useTheme";
import {
  ChevronLeft,
  Sun,
  Moon,
  LayoutGrid,
  BookOpen,
  Activity,
  Infinity as InfinityIcon,
  User,
  Bell,
  Search,
} from "lucide-react";
import { ReactNode } from "react";

// ─────────────────────────────────────────────────────────
// PhoneFrame — narrow centered column, full-bleed on mobile
// ─────────────────────────────────────────────────────────
export function PhoneFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[440px] min-h-screen bg-[rgb(var(--bg))] relative",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TopHeader — two patterns
// 1) hub: meta + h1 + right-action icons
// 2) detail: back chevron + breadcrumb + h1 + filter
// ─────────────────────────────────────────────────────────
export function TopHeader({
  caption,
  title,
  back,
  rightIcon,
  showTheme = true,
  showBell = false,
  showSearch = false,
  onRightClick,
  className,
}: {
  caption?: ReactNode;
  title?: ReactNode;
  back?: boolean | string;
  rightIcon?: ReactNode;
  showTheme?: boolean;
  showBell?: boolean;
  showSearch?: boolean;
  onRightClick?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const onBack = () => {
    if (typeof back === "string") router.push(back);
    else router.back();
  };

  return (
    <header
      className={cn(
        "px-5 pt-4 pb-3",
        // Spacer pushes safe-area; status bar of device handles its own
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {back && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg))] hover:bg-white/[0.05]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showSearch && (
            <button
              aria-label="Search"
              className="grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg-muted))] hover:bg-white/[0.05]"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          {showBell && (
            <button
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg-muted))] hover:bg-white/[0.05]"
            >
              <Bell className="h-4 w-4" />
            </button>
          )}
          {rightIcon && (
            <button
              onClick={onRightClick}
              className="grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg-muted))] hover:bg-white/[0.05]"
            >
              {rightIcon}
            </button>
          )}
          {showTheme && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg-muted))] hover:bg-white/[0.05]"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
      {(caption || title) && (
        <div className="mt-3">
          {caption && (
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              {caption}
            </div>
          )}
          {title && (
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-[rgb(var(--fg))]">
              {title}
            </h1>
          )}
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────
// BottomTabBar — 5 tabs: DASHBOARD · LEARN · PREDICTOR · CURATOR · YOU
// ─────────────────────────────────────────────────────────
const TABS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/learn", label: "Learn", Icon: BookOpen },
  { href: "/predictor", label: "Predictor", Icon: Activity },
  { href: "/curator", label: "Curator", Icon: InfinityIcon },
  { href: "/you", label: "You", Icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname() || "";
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-20 w-full max-w-[440px] -translate-x-1/2 border-t border-white/[0.05] bg-[rgb(var(--bg))]/95 px-2 backdrop-blur-md"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-[60px] flex-col items-center justify-center gap-1 transition-colors",
                  isActive
                    ? "text-mint-400"
                    : "text-chalk-400 hover:text-[rgb(var(--fg))]",
                )}
              >
                <Icon
                  className={cn(
                    "h-[20px] w-[20px]",
                    isActive ? "stroke-[2px]" : "stroke-[1.6px]",
                  )}
                />
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-[0.12em]",
                    isActive ? "text-mint-400" : "text-chalk-500",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────
// Wordmark / logo
// ─────────────────────────────────────────────────────────
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "grid place-items-center rounded-[8px] bg-mint-500 font-black text-ink-950",
          size === "sm" && "h-6 w-6 text-[12px]",
          size === "md" && "h-7 w-7 text-[14px]",
          size === "lg" && "h-9 w-9 text-[16px]",
        )}
      >
        ◆
      </span>
      <span
        className={cn(
          "font-semibold tracking-tight text-[rgb(var(--fg))]",
          size === "sm" && "text-[13px]",
          size === "md" && "text-[15px]",
          size === "lg" && "text-[18px]",
        )}
      >
        unisage
      </span>
    </div>
  );
}
