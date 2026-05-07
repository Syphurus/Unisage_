"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/shared/StatCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { api } from "@/lib/api";
import { BookOpen, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface DashboardStats {
  totalSubjects: number;
  totalUnits: number;
  totalUsers: number;
  totalContent: number;
  activeUsersLastWeek: number;
  quizAttempts: number;
  studySessions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [subjectsRes, analyticsRes] = await Promise.all([
          api.get<unknown[]>("/subjects?page=1&limit=1"),
          api.get<{
            users: { total: number; activeLastWeek: number };
            content: { totalSubjects: number; totalPublished: number };
            quizzes: { totalAttempts: number; averageScore: number };
            studySessions: { total: number; totalMinutes: number };
          }>("/admin/analytics"),
        ]);

        const analytics = analyticsRes.data;

        setStats({
          totalSubjects: subjectsRes.pagination?.total || 0,
          totalUnits: 0,
          totalUsers: analytics?.users?.total || 0,
          totalContent: analytics?.content?.totalPublished || 0,
          activeUsersLastWeek: analytics?.users?.activeLastWeek || 0,
          quizAttempts: analytics?.quizzes?.totalAttempts || 0,
          studySessions: analytics?.studySessions?.total || 0,
        });
      } catch {
        toast.error("Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <TopBar title="Dashboard" />

      <div className="p-6 space-y-8">
        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Subjects"
            value={stats?.totalSubjects ?? 0}
            icon={BookOpen}
          />
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            change={`${stats?.activeUsersLastWeek ?? 0} active this week`}
            changeType="positive"
          />
          <StatCard
            label="Published Content"
            value={stats?.totalContent ?? 0}
            icon={FileText}
          />
          <StatCard
            label="Quiz Attempts"
            value={stats?.quizAttempts ?? 0}
            icon={TrendingUp}
            change={`${stats?.studySessions ?? 0} study sessions`}
            changeType="positive"
          />
        </div>

        {/* Quick actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <QuickAction
                label="Add Subject"
                href="/dashboard/subjects/new"
                icon={BookOpen}
              />
              <QuickAction
                label="Manage Users"
                href="/dashboard/users"
                icon={Users}
              />
              <QuickAction
                label="View Analytics"
                href="/dashboard/analytics"
                icon={TrendingUp}
              />
              <QuickAction
                label="All Subjects"
                href="/dashboard/subjects"
                icon={FileText}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Platform</span>
                <span className="font-medium text-gray-900">UniSage v1.0</span>
              </div>
              <div className="flex justify-between">
                <span>University</span>
                <span className="font-medium text-gray-900">UPES</span>
              </div>
              <div className="flex justify-between">
                <span>Department</span>
                <span className="font-medium text-gray-900">
                  Computer Science
                </span>
              </div>
              <div className="flex justify-between">
                <span>API Status</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}
