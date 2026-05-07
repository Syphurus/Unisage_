"use client";

import { motion } from "framer-motion";
import { StatCard } from "@/components/shared/StatCard";
import { Target, Clock, BookCheck } from "lucide-react";

interface PerformanceStatsProps {
  quizAverage?: number;
  studyTimeMinutes?: number;
  contentCompleted?: number;
  totalContent?: number;
}

export function PerformanceStats({
  quizAverage = 0,
  studyTimeMinutes = 0,
  contentCompleted = 0,
  totalContent = 0,
}: PerformanceStatsProps) {
  const hours = Math.floor(studyTimeMinutes / 60);
  const mins = studyTimeMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className="text-lg font-semibold text-[rgb(var(--fg))] mb-4">
        Performance Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Quiz Average"
          value={`${quizAverage}%`}
          icon={Target}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <StatCard
          title="Study Time This Week"
          value={timeLabel}
          icon={Clock}
          iconColor="text-cyan-700"
          iconBgColor="bg-cyan-50"
        />
        <StatCard
          title="Content Completed"
          value={contentCompleted.toString()}
          subtitle={totalContent > 0 ? `of ${totalContent} items` : undefined}
          icon={BookCheck}
          iconColor="text-amber-700"
          iconBgColor="bg-amber-50"
        />
      </div>
    </motion.section>
  );
}
