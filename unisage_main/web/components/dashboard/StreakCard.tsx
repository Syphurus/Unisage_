"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMotivationalMessage } from "@/lib/constants";
import { Flame } from "lucide-react";
import { ThreeDCard } from "@/components/shared/ThreeDCard";

interface StreakCardProps {
  currentStreak: number;
  weeklyActivity?: boolean[]; // last 7 days, true = studied
}

export function StreakCard({
  currentStreak = 0,
  weeklyActivity = [false, false, false, false, false, false, false],
}: StreakCardProps) {
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const message = getMotivationalMessage(currentStreak);

  return (
    <ThreeDCard className="h-full">
      <Card className="relative overflow-hidden border border-amber-200/70 bg-[rgb(var(--surface))] shadow-soft">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-amber-600">
                Current Streak
              </p>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                >
                  <Flame className="h-7 w-7 text-orange-500" />
                </motion.div>
                <span className="text-3xl font-extrabold text-[rgb(var(--fg))]">
                  {currentStreak}-day{currentStreak !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-2 max-w-sm text-sm text-[rgb(var(--muted))]">
                {message}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-right shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/80">
                Momentum
              </p>
              <p className="text-lg font-bold text-[rgb(var(--fg))]">
                {Math.min(currentStreak * 14, 100)}%
              </p>
            </div>
          </div>

          {/* Mini week calendar */}
          <div className="mt-5 flex items-center gap-2">
            {weeklyActivity.map((active, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    active
                      ? "bg-gradient-to-br from-orange-400 to-amber-400 text-white shadow-sm"
                      : "border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--muted))]"
                  )}
                >
                  {active ? "✓" : ""}
                </div>
                <span className="text-[10px] font-medium text-[rgb(var(--muted))]">
                  {dayLabels[i]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ThreeDCard>
  );
}
