"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { StatCard } from "@/components/shared/StatCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { BookOpen, Users, FileText, TrendingUp } from "lucide-react";
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
  AreaChart,
  Area,
  Line,
  ComposedChart,
} from "recharts";

const CHART_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

interface AnalyticsData {
  users: { total: number; activeLastWeek: number };
  content: { totalSubjects: number; totalPublished: number };
  quizzes: { totalAttempts: number; averageScore: number };
  studySessions: { total: number; totalMinutes: number };
  // Bonus payload added in Phase 2 (rollup-backed). Optional so the admin
  // page degrades cleanly if backend is on an older build.
  weeklyTimeline?: Array<{
    day: string;
    activeUsers: number;
    quizAttempts: number;
    readingMinutes: number;
  }>;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  year: number;
  semester: number;
  credits: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, subjectsRes] = await Promise.all([
          api.get<AnalyticsData>("/admin/analytics"),
          api.get<Subject[]>("/subjects?page=1&limit=100"),
        ]);

        if (analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
        if (subjectsRes.success && subjectsRes.data) {
          setSubjects(subjectsRes.data as Subject[]);
        }
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <PageLoader />;

  // Build year distribution from real subjects
  const yearCounts = [1, 2, 3, 4].map((y) => ({
    name: `Year ${y}`,
    value: subjects.filter((s) => s.year === y).length,
  }));

  // Build semester distribution from real subjects
  const semesterCounts = Array.from(
    subjects.reduce((map, s) => {
      const key = `Y${s.year} S${s.semester}`;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }));

  const totalSubjects = analytics?.content?.totalSubjects || 0;
  const totalUsers = analytics?.users?.total || 0;
  const activeUsers = analytics?.users?.activeLastWeek || 0;
  const totalPublished = analytics?.content?.totalPublished || 0;
  const quizAttempts = analytics?.quizzes?.totalAttempts || 0;
  const avgScore = analytics?.quizzes?.averageScore || 0;
  const studySessions = analytics?.studySessions?.total || 0;
  const studyMinutes = analytics?.studySessions?.totalMinutes || 0;

  return (
    <div>
      <TopBar title="Analytics" />

      <div className="p-6 space-y-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Analytics" },
          ]}
        />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Subjects"
            value={totalSubjects}
            icon={BookOpen}
          />
          <StatCard
            label="Total Users"
            value={totalUsers}
            icon={Users}
            change={`${activeUsers} active this week`}
            changeType="positive"
          />
          <StatCard
            label="Published Content"
            value={totalPublished}
            icon={FileText}
          />
          <StatCard
            label="Quiz Attempts"
            value={quizAttempts}
            icon={TrendingUp}
            change={avgScore > 0 ? `Avg score: ${avgScore.toFixed(0)}%` : undefined}
            changeType="positive"
          />
        </div>

        {/* Engagement (last 7 days) — sourced from platform_daily_stats
            rollup, populated nightly + every 30 min by pg_cron. */}
        {analytics?.weeklyTimeline && analytics.weeklyTimeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Engagement · last {analytics.weeklyTimeline.length} days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analytics.weeklyTimeline.map((d) => ({
                      day: d.day.slice(5),
                      activeUsers: d.activeUsers,
                      quizAttempts: d.quizAttempts,
                      readingMinutes: d.readingMinutes,
                    }))}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      yAxisId="left"
                      dataKey="activeUsers"
                      fill="#4f46e5"
                      name="Active users"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="quizAttempts"
                      fill="#06b6d4"
                      name="Quiz attempts"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="readingMinutes"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Reading minutes"
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Platform Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="text-sm text-gray-500">Active Users (7d)</p>
                  <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="text-sm text-gray-500">Study Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{studySessions}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                <div>
                  <p className="text-sm text-gray-500">Total Study Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {studyMinutes >= 60
                      ? `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m`
                      : `${studyMinutes}m`}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subjects by Semester */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subjects by Semester</CardTitle>
            </CardHeader>
            <CardContent>
              {semesterCounts.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={semesterCounts}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {semesterCounts.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "13px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
                  No subjects added yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject Distribution by Year */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Subject Distribution by Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjects.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearCounts} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f3f4f6"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#4f46e5"
                        radius={[0, 4, 4, 0]}
                        name="Subjects"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-gray-400">
                  No subjects added yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
