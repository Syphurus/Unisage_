"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { ThreeDCard } from "@/components/shared/ThreeDCard";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconColor = "text-brand-600",
  iconBgColor = "bg-brand-50",
}: StatCardProps) {
  return (
    <ThreeDCard className={cn("h-full", className)}>
      <Card className="overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-soft">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-[rgb(var(--muted))] mb-1">
                {title}
              </p>
              <p className="text-2xl font-bold text-[rgb(var(--fg))]">{value}</p>
              {subtitle && (
                <p className="text-xs text-[rgb(var(--muted))] mt-1">
                  {subtitle}
                </p>
              )}
              {trend && (
                <p
                  className={cn(
                    "text-xs font-medium mt-2",
                    trend.isPositive ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                  <span className="text-[rgb(var(--muted))] ml-1">
                    vs last week
                  </span>
                </p>
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl p-3 shadow-innerSoft border border-[rgb(var(--border))]",
                iconBgColor
              )}
            >
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </ThreeDCard>
  );
}
