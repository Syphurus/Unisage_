"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/shared/CircularProgress";
import { ThreeDCard } from "@/components/shared/ThreeDCard";
import { formatRelativeTime } from "@/lib/utils";
import type { Subject } from "@/lib/types";

interface SubjectCardProps {
  subject: Subject;
  progress?: number;
  lastStudied?: string;
  index?: number;
}

export function SubjectCard({
  subject,
  progress = 0,
  lastStudied,
  index = 0,
}: SubjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/subjects/${subject.id}`}>
        <ThreeDCard className="h-full">
          <Card className="card-hover group h-full cursor-pointer overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 to-cyan-500 opacity-90" />
            <CardContent className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <h3 className="font-semibold text-[rgb(var(--fg))] text-sm group-hover:text-brand-600 transition-colors truncate">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                    {subject.code}
                  </p>
                </div>
                <CircularProgress
                  percentage={progress}
                  size={48}
                  strokeWidth={4}
                  className="shrink-0"
                />
              </div>

              <div className="mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  Year {subject.year}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Sem {subject.semester}
                </Badge>
              </div>

              {lastStudied && (
                <p className="text-xs text-[rgb(var(--muted))]">
                  Last studied {formatRelativeTime(lastStudied)}
                </p>
              )}
            </CardContent>
          </Card>
        </ThreeDCard>
      </Link>
    </motion.div>
  );
}
