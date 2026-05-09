"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStats, useQuizAttempts } from "@/lib/hooks/useProgress";
import { useTheme } from "@/lib/hooks/useTheme";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  SectionHeader,
  StatTile,
} from "@/components/unisage/primitives";
import {
  Bell,
  Bookmark,
  ChevronRight,
  GraduationCap,
  LogOut,
  Moon,
  Plug,
  Sun,
  User,
} from "lucide-react";

export default function YouPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { stats } = useSessionStats();
  const { attempts } = useQuizAttempts();

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const meta = [
    user?.college?.name || user?.collegeCode,
    user?.branch?.name || user?.branchCode,
    user?.semester ? `Sem ${user.semester}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen">
      <TopHeader title="Profile" showTheme />

      <section className="px-5 md:px-8 lg:px-12">
        <div className="flex items-start gap-4 lg:gap-6">
          <span className="grid h-16 w-16 lg:h-20 lg:w-20 place-items-center rounded-[16px] bg-mint-500 text-[24px] lg:text-[28px] font-black text-ink-950">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-bold text-[rgb(var(--fg))]">
              {user?.fullName || "Guest"}
            </p>
            <p className="mt-0.5 text-[12px] text-chalk-400">{meta || "—"}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>
            STREAK · {stats?.currentStreak ?? 0}d
          </Pill>
          <Pill>
            RANK · {(attempts?.length ?? 0) > 0 ? "04" : "—"}
          </Pill>
        </div>
      </section>

      <div className="lg:px-12 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
      <section className="px-5 pt-7 md:px-8 lg:px-0">
        <SectionHeader title="Mission stats" />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:gap-4">
          <StatTile
            value={`${Math.floor((stats?.totalStudyMinutes ?? 0) / 60)}h ${(stats?.totalStudyMinutes ?? 0) % 60}m`}
            label="Time invested"
          />
          <StatTile
            value={stats?.completedContent ?? 0}
            label="Content done"
          />
          <StatTile
            value={`${Math.round(stats?.averageQuizScore ?? 0)}%`}
            label="Avg recall"
            tone="mint"
          />
          <StatTile
            value={stats?.totalSessions ?? 0}
            label="Sessions"
          />
        </div>
      </section>

      <section className="px-5 pt-7 md:px-8 lg:px-0">
        <SectionHeader title="Settings" />
        <ul className="mt-3 divide-y divide-white/[0.04] rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))]">
          <SettingsRow
            icon={theme === "dark" ? Sun : Moon}
            title="Theme"
            subtitle={theme === "dark" ? "Dark" : "Light"}
            onClick={toggleTheme}
          />
          <SettingsRow
            icon={Bell}
            title="Notifications"
            subtitle="Daily 6:00 · enabled"
          />
          <SettingsRow
            icon={GraduationCap}
            title="Academic profile"
            subtitle={meta || "Set up"}
            href="/onboarding"
          />
          <SettingsRow
            icon={Bookmark}
            title="Bookmarks"
            subtitle="Saved content"
            href="/bookmarks"
          />
          <SettingsRow
            icon={Plug}
            title="Connected accounts"
            subtitle="Google · UPES SSO"
          />
          <SettingsRow
            icon={LogOut}
            title="Sign out"
            subtitle="Log out of UniSage"
            onClick={logout}
            destructive
          />
        </ul>
      </section>
      </div>

      <p className="mt-8 mb-2 text-center text-[10px] uppercase tracking-cap text-chalk-500">
        UniSage · build v2.6
      </p>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  href,
  destructive,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${
          destructive
            ? "bg-flame-500/10 text-flame-500"
            : "bg-white/[0.04] text-chalk-300"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[14px] font-medium ${destructive ? "text-flame-500" : "text-[rgb(var(--fg))]"}`}
        >
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-chalk-400">{subtitle}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-chalk-500" />
    </div>
  );
  if (href) {
    return (
      <li>
        <Link href={href} className="block hover:bg-white/[0.02]">
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        onClick={onClick}
        className="block w-full text-left hover:bg-white/[0.02]"
      >
        {inner}
      </button>
    </li>
  );
}
