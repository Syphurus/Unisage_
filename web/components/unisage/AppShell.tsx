"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/useTheme";
import { useAuth } from "@/lib/hooks/useAuth";
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
  Settings,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { ReactNode } from "react";

const NAV: { href: string; label: string; Icon: any; group?: "main" | "more" }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/learn", label: "Learn", Icon: BookOpen },
  { href: "/predictor", label: "Predictor", Icon: Activity },
  { href: "/curator", label: "Curator", Icon: InfinityIcon },
  { href: "/analytics", label: "Analytics", Icon: BarChart3, group: "more" },
  { href: "/assignments", label: "Assignments", Icon: ClipboardList, group: "more" },
  { href: "/you", label: "You", Icon: User, group: "more" },
];

const MOBILE_TABS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutGrid },
  { href: "/learn", label: "Learn", Icon: BookOpen },
  { href: "/predictor", label: "Predictor", Icon: Activity },
  { href: "/curator", label: "Curator", Icon: InfinityIcon },
  { href: "/you", label: "You", Icon: User },
];

// ─────────────────────────────────────────────────────────
// Wordmark
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

// ─────────────────────────────────────────────────────────
// Phone-frame container — for marketing + auth narrow forms
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
        "mx-auto w-full min-h-screen bg-[rgb(var(--bg))] relative",
        "max-w-[480px] md:max-w-[560px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AppShell — SaaS layout: desktop sidebar + full-bleed main,
// mobile uses bottom tabs (lg:hidden).
// ─────────────────────────────────────────────────────────
export function AppShell({
  children,
  hideTabs = false,
  bare = false,
}: {
  children: ReactNode;
  hideTabs?: boolean;
  bare?: boolean;
}) {
  if (bare) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] relative">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] relative">
      <DesktopSidebar />
      <main
        className={cn(
          "min-h-screen lg:pl-[248px] xl:pl-[268px]",
          !hideTabs && "pb-[80px] lg:pb-0",
        )}
      >
        {children}
      </main>
      {!hideTabs && <MobileBottomTabs />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Desktop sidebar (hidden on <lg)
// ─────────────────────────────────────────────────────────
function DesktopSidebar() {
  const pathname = usePathname() || "";
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className="hidden lg:flex lg:flex-col fixed top-0 left-0 z-30 h-screen w-[248px] xl:w-[268px] border-r border-white/[0.06] bg-[rgb(var(--bg-elev))]/40 backdrop-blur-xl"
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/dashboard" className="inline-flex">
          <Wordmark size="md" />
        </Link>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <button className="flex w-full items-center gap-2.5 rounded-[10px] border border-white/[0.06] bg-[rgb(var(--bg-subtle))] px-3 py-2 text-left text-[13px] text-chalk-400 hover:bg-[rgb(var(--bg-subtle))]/60 transition-colors">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1">Search</span>
          <kbd className="text-[10px] font-mono text-chalk-500">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        <NavGroup label="Workspace">
          {NAV.filter((n) => !n.group || n.group === "main").map(
            ({ href, label, Icon }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                active={pathname === href || pathname.startsWith(`${href}/`)}
              />
            ),
          )}
        </NavGroup>
        <NavGroup label="Discover">
          {NAV.filter((n) => n.group === "more").map(
            ({ href, label, Icon }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                active={pathname === href || pathname.startsWith(`${href}/`)}
              />
            ),
          )}
        </NavGroup>
      </nav>

      {/* Account */}
      <div className="border-t border-white/[0.06] px-3 py-3 flex items-center gap-2">
        <Link
          href="/you"
          className="flex flex-1 min-w-0 items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-white/[0.03] transition-colors"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-mint-500 text-[12px] font-black text-ink-950">
            {initials || "U"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[rgb(var(--fg))]">
              {user?.fullName || "Guest"}
            </p>
            <p className="truncate text-[11px] text-chalk-500">
              {user?.collegeCode || "—"} · sem {user?.semester || "—"}
            </p>
          </div>
        </Link>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-chalk-300 hover:bg-white/[0.05] transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: any;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-medium transition-colors",
        active
          ? "bg-mint-500/10 text-mint-400"
          : "text-chalk-300 hover:bg-white/[0.04] hover:text-[rgb(var(--fg))]",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          active ? "stroke-[2.2px]" : "stroke-[1.6px]",
        )}
      />
      {label}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// Mobile bottom tabs (hidden on lg+)
// ─────────────────────────────────────────────────────────
function MobileBottomTabs() {
  const pathname = usePathname() || "";
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.05] bg-[rgb(var(--bg))]/95 backdrop-blur-md"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-5">
        {MOBILE_TABS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
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

// Backwards-compat alias
export const BottomTabBar = MobileBottomTabs;

// ─────────────────────────────────────────────────────────
// PageHeader — simple meta + title block for hub pages
// ─────────────────────────────────────────────────────────
export function PageHeader({
  caption,
  title,
  description,
  actions,
  className,
}: {
  caption?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-end justify-between gap-6 flex-wrap",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {caption && (
          <div className="mb-2 text-[10.5px] md:text-[11px] font-semibold uppercase tracking-cap text-chalk-500">
            {caption}
          </div>
        )}
        {title && (
          <h1 className="text-[28px] md:text-[36px] lg:text-[40px] font-bold leading-tight tracking-[-0.015em] text-[rgb(var(--fg))]">
            {title}
          </h1>
        )}
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] md:text-[15px] text-chalk-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

// ─────────────────────────────────────────────────────────
// MobileTopBar — small back/title bar for inner pages on mobile
// (desktop pages use the sidebar + PageHeader instead)
// ─────────────────────────────────────────────────────────
export function MobileTopBar({
  back,
  title,
  rightIcon,
  onRightClick,
}: {
  back?: boolean | string;
  title?: ReactNode;
  rightIcon?: ReactNode;
  onRightClick?: () => void;
}) {
  const router = useRouter();
  const onBack = () => {
    if (typeof back === "string") router.push(back);
    else router.back();
  };
  return (
    <div className="lg:hidden flex items-center justify-between gap-3 px-5 pt-4 pb-2">
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg))] hover:bg-white/[0.05]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {title && (
          <span className="truncate text-[14px] font-semibold text-[rgb(var(--fg))]">
            {title}
          </span>
        )}
      </div>
      {rightIcon && (
        <button
          onClick={onRightClick}
          className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
        >
          {rightIcon}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// LEGACY: TopHeader — used by older pages. Maps to new
// PageHeader on desktop and MobileTopBar on mobile.
// ─────────────────────────────────────────────────────────
export function TopHeader({
  caption,
  title,
  back,
  rightIcon,
  showTheme = false,
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
    <>
      {/* Mobile: classic header */}
      <header
        className={cn(
          "lg:hidden px-5 pt-4 pb-3 md:px-8 md:pt-6",
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
              <h1 className="text-[28px] md:text-[32px] font-bold leading-tight tracking-[-0.01em] text-[rgb(var(--fg))]">
                {title}
              </h1>
            )}
          </div>
        )}
      </header>

      {/* Desktop: render as PageHeader within the page padding */}
      <div className="hidden lg:block px-10 xl:px-14 pt-10">
        <PageHeader caption={caption} title={title} />
      </div>
    </>
  );
}
