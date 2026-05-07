"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useProgress } from "@/lib/hooks/useProgress";
import { useSessionStats } from "@/lib/hooks/useProgress";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { subjects, isLoading: subjectsLoading } = useSubjects(
    user
      ? {
          year: user.year,
          semester: user.semester || undefined,
        }
      : undefined
  );
  const { progress, isLoading: progressLoading } = useProgress();
  const { stats } = useSessionStats();

  const isLoading = subjectsLoading || progressLoading;

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />;
  }

  const completedCount =
    stats?.completedContent || progress?.filter((p) => p.completed).length || 0;
  const streak = stats?.currentStreak || 0;
  const studyTime = stats?.totalStudyMinutes || 0;
  const total = progress?.length || 0;
  const mastery = total ? Math.round((completedCount / total) * 100) : 0;
  const continueCards = subjects.slice(0, 2);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#707891] font-bold">
                Enhanced Student Dashboard
              </p>
              <h1 className="text-[32px] font-bold text-[#0D1B2A] leading-tight">
                Welcome back, {user?.fullName?.split(" ")[0] || "Student"}.
              </h1>
              <p className="text-[13px] text-[#707891] mt-1">
                The Digital Curator has prepared your focus path for today.
              </p>
            </div>
            <Card className="w-44">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase font-bold text-[#707891]">
                  Overall Mastery
                </p>
                <p className="text-[22px] font-bold text-[#0D1B2A] mt-1">
                  {mastery}%
                </p>
                <Progress value={mastery} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[20px] font-semibold text-[#0D1B2A]">
                Continue Learning
              </h2>
              <Link
                href="/subjects"
                className="text-[13px] text-[#0D1B2A] font-medium"
              >
                View Library
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {continueCards.map((subject, idx) => (
                <Card
                  key={subject.id}
                  className="bg-[#0D1B2A] text-white overflow-hidden"
                >
                  <CardContent className="p-4">
                    <Badge className="bg-white/15 text-white border-0">
                      Course
                    </Badge>
                    <p className="text-[18px] font-semibold mt-3">
                      {subject.name}
                    </p>
                    <p className="text-[12px] text-white/70 mt-1">
                      {subject.code} • Session {idx + 1}
                    </p>
                    <div className="mt-4">
                      <Progress
                        value={Math.max(20, mastery - idx * 12)}
                        className="bg-white/20"
                        indicatorClassName="bg-[#22C55E]"
                      />
                      <Link
                        href={`/subjects/${subject.id}`}
                        className="inline-block mt-2 text-[12px] font-semibold text-[#CFE8FF]"
                      >
                        Resume Session →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 bg-[#0D1B2A] text-white">
              <CardContent className="p-4">
                <p className="text-[12px] font-semibold">Weekly Focus</p>
                <div className="mt-3 rounded-xl bg-[#112337] p-3 h-[120px] flex items-end gap-2">
                  {[36, 62, 48, 76, 58, 68, 42].map((h, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-sm bg-[#22C55E]/90"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[12px] font-semibold text-[#0D1B2A]">
                  Deadlines
                </p>
                <div className="mt-3 space-y-2 text-[12px]">
                  <p className="text-[#EF4444]">
                    • Compiler Design Quiz — Today
                  </p>
                  <p className="text-[#F59E0B]">
                    • Algorithms Notes — Tomorrow
                  </p>
                  <p className="text-[#22C55E]">
                    • Networks Revision — This week
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="space-y-4">
          <Card className="bg-[#0D1B2A] text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#00B4A6]" />
                <p className="text-[12px] font-semibold">AI Curator Insight</p>
              </div>
              <p className="text-[13px] italic text-white/80 mt-2">
                "Reinforce transport-layer reliability concepts before
                attempting advanced quiz sets."
              </p>
              <Button className="w-full mt-4" variant="success">
                Start Study Session
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase font-bold text-[#707891]">
                Learning Snapshot
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#707891]">Active Time</span>
                  <span className="font-semibold text-[#0D1B2A]">
                    {Math.round(studyTime)}m
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#707891]">Streak</span>
                  <span className="font-semibold text-[#0D1B2A]">
                    {streak} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#707891]">Completed</span>
                  <span className="font-semibold text-[#0D1B2A]">
                    {completedCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/subjects">
          <Button variant="outline">Browse Curriculum</Button>
        </Link>
        <Link href="/progress">
          <Button
            variant="secondary"
            className="inline-flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            View Detailed Report
          </Button>
        </Link>
      </div>
    </div>
  );
}
