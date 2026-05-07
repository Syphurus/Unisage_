"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  Flame,
  Target,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { CircularProgress } from "@/components/shared/CircularProgress";
import {
  useProgress,
  useQuizAttempts,
  useSessionStats,
} from "@/lib/hooks/useProgress";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ProgressPage() {
  const { progress, isLoading: progressLoading } = useProgress();
  const { attempts, isLoading: attemptsLoading } = useQuizAttempts();
  const { stats, isLoading: statsLoading } = useSessionStats();
  const { subjects, isLoading: subjectsLoading } = useSubjects();

  const isLoading =
    progressLoading || attemptsLoading || statsLoading || subjectsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate overview stats
  const totalCompleted = progress?.filter((p) => p.completed).length || 0;
  const totalItems = progress?.length || 0;
  const overallPercentage =
    totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  const totalStudyTime = stats?.totalStudyMinutes || 0;
  const averageQuizScore =
    stats?.averageQuizScore ||
    (attempts && attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (sum, a) => sum + (a.score / a.totalQuestions) * 100,
            0
          ) / attempts.length
        )
      : 0);

  const quizzesTaken = stats?.quizzesAttempted || attempts?.length || 0;

  // Subject-wise progress
  const subjectProgress =
    subjects?.map((subject) => {
      const subjectItems =
        progress?.filter((p) => {
          // Progress items have nested content.unit.subject
          const pSubjectId = (p as any)?.content?.unit?.subject?.id;
          return pSubjectId === subject.id;
        }) || [];
      const completed = subjectItems.filter((p) => p.completed).length;
      const total = subjectItems.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        name:
          subject.name.length > 20
            ? subject.name.slice(0, 20) + "…"
            : subject.name,
        fullName: subject.name,
        completed,
        total,
        percentage,
      };
    }) || [];

  // Quiz performance data for chart
  const quizChartData =
    attempts?.slice(-10).map((a, idx) => ({
      name: `Q${idx + 1}`,
      score: Math.round((a.score / a.totalQuestions) * 100),
    })) || [];

  // Content type distribution
  const typeDistribution = [
    {
      name: "Notes",
      value:
        progress?.filter((p) => {
          const t = (p as any)?.content?.type;
          return t === "long_notes" || t === "short_notes";
        }).length || 0,
    },
    {
      name: "Flashcards",
      value:
        progress?.filter((p) => (p as any)?.content?.type === "flashcard")
          .length || 0,
    },
    {
      name: "Quizzes",
      value:
        progress?.filter((p) => (p as any)?.content?.type === "quiz").length ||
        0,
    },
  ].filter((d) => d.value > 0);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Page header */}
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Your Progress
        </h1>
        <p className="text-gray-500 mt-1">
          Track your learning journey and see how far you've come.
        </p>
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          title="Overall Progress"
          value={`${overallPercentage}%`}
          icon={Target}
          trend={
            overallPercentage > 50
              ? { value: overallPercentage, isPositive: true }
              : undefined
          }
        />
        <StatCard
          title="Items Completed"
          value={totalCompleted.toString()}
          subtitle={`of ${totalItems}`}
          icon={BookOpen}
        />
        <StatCard
          title="Study Time"
          value={`${Math.round(totalStudyTime)}m`}
          icon={Clock}
        />
        <StatCard
          title="Avg Quiz Score"
          value={`${averageQuizScore}%`}
          subtitle={`${quizzesTaken} quizzes taken`}
          icon={Trophy}
          trend={
            averageQuizScore > 0
              ? { value: averageQuizScore, isPositive: averageQuizScore >= 70 }
              : undefined
          }
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Performance Chart */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-brand-500" />
                Quiz Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quizChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={quizChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: number) => [`${value}%`, "Score"]}
                    />
                    <Bar dataKey="score" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                  No quiz data yet. Take a quiz to see your performance!
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Distribution */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Content Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {typeDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #E5E7EB",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                  Start studying to see your content breakdown!
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Subject-wise Progress */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-orange-500" />
              Subject-wise Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjectProgress.length > 0 ? (
              <div className="space-y-4">
                {subjectProgress.map((subject, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-sm font-medium text-gray-700 truncate max-w-[200px]"
                        title={subject.fullName}
                      >
                        {subject.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {subject.completed}/{subject.total}
                        </span>
                        <Badge
                          variant={
                            subject.percentage >= 80
                              ? "success"
                              : subject.percentage >= 40
                                ? "warning"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {subject.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          subject.percentage >= 80
                            ? "bg-emerald-500"
                            : subject.percentage >= 40
                              ? "bg-amber-400"
                              : "bg-brand-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.percentage}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No progress yet"
                description="Start studying to track your subject-wise progress."
                icon="book"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Quiz Attempts */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              Recent Quiz Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attempts && attempts.length > 0 ? (
              <div className="space-y-3">
                {attempts.slice(0, 10).map((attempt, idx) => {
                  const score = Math.round(
                    (attempt.score / attempt.totalQuestions) * 100
                  );
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CircularProgress
                          percentage={score}
                          size={40}
                          strokeWidth={3}
                          showLabel={false}
                          color={
                            score >= 70
                              ? "stroke-emerald-500"
                              : score >= 50
                                ? "stroke-amber-500"
                                : "stroke-red-500"
                          }
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {attempt.score}/{attempt.totalQuestions} correct
                          </p>
                          <p className="text-xs text-gray-400">
                            {attempt.timeTaken
                              ? `${Math.floor(attempt.timeTaken / 60)}m ${
                                  attempt.timeTaken % 60
                                }s`
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          score >= 70
                            ? "success"
                            : score >= 50
                              ? "warning"
                              : "error"
                        }
                      >
                        {score}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No quizzes taken"
                description="Complete a quiz to see your attempts here."
                icon="file"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
