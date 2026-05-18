"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Bookmark,
  ChevronRight,
  GraduationCap,
  KeyRound,
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const validatePassword = () => {
    const nextErrors: Record<string, string> = {};

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[a-z]/.test(newPassword)) {
      nextErrors.newPassword = "Password must include at least 1 lowercase letter";
    } else if (!/[A-Z]/.test(newPassword)) {
      nextErrors.newPassword = "Password must include at least 1 uppercase letter";
    } else if (!/\d/.test(newPassword)) {
      nextErrors.newPassword = "Password must include at least 1 number";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      nextErrors.newPassword =
        "New password must be different from your current password";
    }

    return nextErrors;
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validatePassword();
    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password updated successfully");
      resetPasswordForm();
    } catch (error: unknown) {
      const message =
        (typeof error === "object" && error && "message" in error
          ? String(error.message)
          : null) ||
        (typeof error === "object" &&
        error &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data &&
        "message" in error.data
          ? String(error.data.message)
          : null) ||
        (typeof error === "object" &&
        error &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : null) ||
        "Unable to update password";
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

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
              icon={KeyRound}
              title="Change password"
              subtitle="Update your account password"
              href="#change-password"
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
        <Section density="compact" className="pb-6">
          <div
            id="change-password"
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-7"
          >
            <SectionHeader title="Change password" />
            <p className="mt-2 text-[13px] text-chalk-400">
              Keep your account secure with a fresh password.
            </p>

            <form
              className="mt-5 grid max-w-xl gap-4"
              onSubmit={handleChangePassword}
            >
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                error={passwordErrors.currentPassword}
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                error={passwordErrors.newPassword}
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                error={passwordErrors.confirmPassword}
              />

              <p className="text-[12px] text-chalk-400">
                Password must be at least 8 characters and include uppercase,
                lowercase, and a number.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" isLoading={isChangingPassword}>
                  Update password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetPasswordForm}
                  disabled={isChangingPassword}
                >
                  Clear
                </Button>
              </div>
            </form>
          </div>
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
