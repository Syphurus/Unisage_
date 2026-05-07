"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface TopBarProps {
  title?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/90 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--fg))]">
            {title}
          </h1>
        )}
        {children}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[rgb(var(--muted))] transition-colors hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--fg))]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs">
                {user?.fullName?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <span className="hidden font-medium sm:inline-block">
                {user?.fullName || "Admin"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-[rgb(var(--muted))]">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
