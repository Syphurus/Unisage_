"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[rgb(var(--muted))]">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight text-[rgb(var(--fg))]">
            {value}
          </p>
          {change && (
            <p
              className={cn("text-xs font-medium", {
                "text-emerald-600": changeType === "positive",
                "text-red-600": changeType === "negative",
                "text-[rgb(var(--muted))]": changeType === "neutral",
              })}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[rgb(var(--border))] bg-brand-50 p-3">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
      </div>
    </Card>
  );
}
