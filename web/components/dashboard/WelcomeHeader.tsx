"use client";

import { motion } from "framer-motion";
import { getGreeting } from "@/lib/utils";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { ThreeDCard } from "@/components/shared/ThreeDCard";

interface WelcomeHeaderProps {
  name: string;
}

export function WelcomeHeader({ name }: WelcomeHeaderProps) {
  const greeting = getGreeting();
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const firstName = name.split(" ")[0];

  return (
    <ThreeDCard className="h-full" hover={false}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-[28px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/92 p-6 shadow-soft backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Focus mode
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--fg))]">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="mt-1 text-[rgb(var(--muted))]">{today}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 text-right">
            <span className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted))]">
              Goal
            </span>
            <span className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
              Keep the streak alive
            </span>
          </div>
        </div>
      </motion.div>
    </ThreeDCard>
  );
}
