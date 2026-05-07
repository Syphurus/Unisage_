"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

interface TodaysFocusProps {
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  unit?: {
    title: string;
  };
  contentType?: string;
  progress?: number;
  contentId?: string;
}

export function TodaysFocus({
  subject,
  unit,
  contentType = "Notes",
  progress = 0,
  contentId,
}: TodaysFocusProps) {
  const hasContent = subject && unit;

  return (
    <Card className="relative overflow-hidden border-brand-100 bg-[rgb(var(--surface))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 to-cyan-500" />
      <CardContent className="p-6">
        {hasContent ? (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand-600">
              <BookOpen className="h-4 w-4" />
              Continue where you left off
            </p>
            <h3 className="mb-1 text-xl font-bold text-[rgb(var(--fg))]">
              {subject.name}
            </h3>
            <p className="mb-1 text-sm text-[rgb(var(--muted))]">
              {unit.title}
            </p>
            <p className="mb-4 text-xs text-[rgb(var(--muted))]">
              {contentType}
            </p>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-[rgb(var(--muted))]">Progress</span>
                <span className="font-semibold text-brand-700">
                  {progress}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                indicatorClassName="bg-brand-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
                <Clock className="h-3.5 w-3.5" />
                {progress >= 100
                  ? "Completed!"
                  : `${100 - progress}% remaining`}
              </div>
              <Link
                href={
                  contentId
                    ? `/content/${contentId}`
                    : `/subjects/${subject.id}`
                }
              >
                <Button size="default">
                  Continue Studying
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <BookOpen className="h-10 w-10 text-brand-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[rgb(var(--fg))] mb-1">
                Ready to start studying?
              </h3>
              <p className="text-sm text-[rgb(var(--muted))] mb-4">
                Pick a subject to begin your study session
              </p>
              <Link href="/subjects">
                <Button size="default">
                  Browse Subjects
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
