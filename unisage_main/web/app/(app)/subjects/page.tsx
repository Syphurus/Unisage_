"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useProgress } from "@/lib/hooks/useProgress";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Progress } from "@/components/ui/progress";
import { Search, ArrowRight, Zap } from "lucide-react";
import type { Subject } from "@/lib/types";

export default function SubjectsPage() {
  const { user } = useAuth();
  const { subjects, isLoading } = useSubjects(
    user
      ? {
          year: user.year,
          semester: user.semester || undefined,
        }
      : undefined
  );
  const { progress } = useProgress();
  const [search, setSearch] = useState("");

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!progress || !subjects) return map;
    subjects.forEach((subject) => {
      const subjectItems = progress.filter(
        (p) => p.content?.unit?.subject?.id === subject.id
      );
      if (subjectItems.length === 0) {
        map[subject.id] = 0;
        return;
      }
      const completed = subjectItems.filter((p) => p.completed).length;
      map[subject.id] = Math.min(
        Math.round((completed / subjectItems.length) * 100),
        100
      );
    });
    return map;
  }, [progress, subjects]);

  const filteredSubjects = useMemo(() => {
    let filtered = subjects;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [subjects, search]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-10 bg-gray-100 rounded w-full max-w-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-[#00B4A6]">
            Academic Overview
          </p>
          <h1 className="text-[32px] font-bold text-[#0D1B2A] leading-tight">
            Curriculum Browser
          </h1>
          <p className="text-[13px] text-[#707891] mt-1 max-w-3xl">
            Navigate through your academic journey. Every module is a step
            toward mastery in Computer Science.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-[#8B5E00] text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase">
                <Zap className="h-3.5 w-3.5" /> Upcoming Quiz
              </div>
              <p className="text-[18px] font-semibold mt-2">
                OSI Interconnection Challenge
              </p>
              <p className="text-[12px] text-white/80">
                Due in 2 days • 25 questions
              </p>
            </div>
            <Button className="bg-white text-[#8B5E00] hover:bg-white/90">
              Jump to Flashcards
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-[#0D1B2A] text-white">
          <CardContent className="p-4">
            <p className="text-[18px] font-semibold">Deep Work Mode</p>
            <p className="text-[12px] text-white/75 mt-1">
              Enter distraction-free study mode and accelerate retention.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="success">
                Start Study Session
              </Button>
              <Button
                size="sm"
                className="bg-white text-[#0D1B2A] hover:bg-white/90"
              >
                Activate Curator Studio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredSubjects.length === 0 ? (
        <EmptyState
          title="No subjects found"
          description="Try a different search term or filter."
          icon="search"
          action={{
            label: "Clear filters",
            onClick: () => {
              setSearch("");
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubjects.map((subject: Subject, index: number) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <Link href={`/subjects/${subject.id}`}>
                <Card className="cursor-pointer group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{subject.code}</Badge>
                        <p className="text-[11px] text-[#707891]">
                          {progressMap[subject.id] || 0}% complete
                        </p>
                      </div>
                      <Badge variant="outline">Year {subject.year}</Badge>
                    </div>

                    <h3 className="text-[18px] font-semibold text-[#0D1B2A] group-hover:text-[#091522]">
                      {subject.name}
                    </h3>
                    <p className="text-[13px] text-[#707891] mt-1 line-clamp-2">
                      {subject.description ||
                        "Structured curriculum with notes, quizzes, and flashcard practice modules."}
                    </p>

                    <div className="mt-3">
                      <Progress value={progressMap[subject.id] || 0} />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        variant={
                          (progressMap[subject.id] || 0) > 70
                            ? "success"
                            : "warning"
                        }
                      >
                        {(progressMap[subject.id] || 0) > 70
                          ? "Completed"
                          : "In Progress"}
                      </Badge>
                      <span className="text-[12px] text-[#0D1B2A] inline-flex items-center gap-1 font-medium">
                        Open Module <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
