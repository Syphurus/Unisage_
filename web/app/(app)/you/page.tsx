"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSessionStats, useQuizAttempts } from "@/lib/hooks/useProgress";
import { useTheme } from "@/lib/hooks/useTheme";
import { MobileTopBar, PageHeader } from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
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
      <MobileTopBar title="Profile" />

      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <PageHeader title="Profile" />
        </Section>
      </PageContainer>

      {/* Identity */}
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 pb-6">
          <div className="lg:col-span-2 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-7 flex items-start gap-4 lg:gap-5">
            <span className="grid h-16 w-16 lg:h-20 lg:w-20 shrink-0 place-items-center rounded-[16px] bg-mint-500 text-[24px] lg:text-[28px] font-black text-ink-950">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] lg:text-[24px] font-bold text-[rgb(var(--fg))]">
                {user?.fullName || "Guest"}
              </p>
              <p className="mt-1 text-[13px] text-chalk-400">{meta || "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>STREAK · {stats?.currentStreak ?? 0}d</Pill>
                <Pill>
                  RANK · {(attempts?.length ?? 0) > 0 ? "04" : "—"}
                </Pill>
                {user?.email && (
                  <Pill className="!normal-case !tracking-normal !text-chalk-300">
                    {user.email}
                  </Pill>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 grid grid-cols-2 gap-3">
            <StatTile
              value={`${Math.floor((stats?.totalStudyMinutes ?? 0) / 60)}h`}
              label="Time"
            />
            <StatTile
              value={stats?.completedContent ?? 0}
              label="Content"
            />
            <StatTile
              value={`${Math.round(stats?.averageQuizScore ?? 0)}%`}
              label="Recall"
              tone="mint"
            />
            <StatTile
              value={stats?.totalSessions ?? 0}
              label="Sessions"
            />
          </div>
        </div>
      </PageContainer>

      {/* Settings */}
      <PageContainer>
        <Section density="compact">
          <SectionHeader title="Settings" />
          <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
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
        </Section>
      </PageContainer>

      <PageContainer>
        <p className="py-8 text-center text-[10px] uppercase tracking-cap text-chalk-500">
          UniSage · build v2.6
        </p>
      </PageContainer>
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
    <div className="flex items-center gap-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] px-4 py-4 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${
          destructive
            ? "bg-flame-500/10 text-flame-500"
            : "bg-white/[0.04] text-chalk-300"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[14px] font-semibold ${destructive ? "text-flame-500" : "text-[rgb(var(--fg))]"}`}
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
        <Link href={href} className="block">
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button onClick={onClick} className="block w-full text-left">
        {inner}
      </button>
    </li>
  );
}
