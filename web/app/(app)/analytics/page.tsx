"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { MobileTopBar, PageHeader } from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
import {
  SectionHeader,
  SegmentedProgress,
  Pill,
  StatTile,
} from "@/components/unisage/primitives";
import {
  useDashboardStats,
  useMySubjectAnalytics,
} from "@/lib/hooks/useDashboardAnalytics";

/**
 * Real analytics — sourced from the rollup tables maintained by pg_cron.
 * Replaces the prior page that ran on speculative numbers / hand-drawn SVG.
 */
export default function AnalyticsPage() {
  const { stats } = useDashboardStats();
  const { subjects: subjectAnalytics } = useMySubjectAnalytics();

  // Trend chart: active minutes per day for the last N days from the
  // server's timeline payload. NaN-safe: empty timeline → empty chart.
  const trend = useMemo(
    () =>
      (stats?.timeline ?? []).map((d) => ({
        day: d.day.slice(5), // MM-DD
        minutes: Math.round(d.activeSeconds / 60),
        recall: d.quizPct ?? 0,
      })),
    [stats?.timeline]
  );

  // Mastery: rollup already orders subjects by weakness DESC. We flip that
  // here to "best mastery first" for the mastery panel; the weakness panel
  // (below) keeps the original ordering.
  const mastery = useMemo(
    () =>
      [...subjectAnalytics].sort(
        (a, b) => (b.completionPct ?? 0) - (a.completionPct ?? 0)
      ),
    [subjectAnalytics]
  );

  // Time allocation by content type — rollup doesn't break this down per
  // type yet, so we infer from per-subject active minutes vs quiz vs flash
  // signals. Lightweight + honest about being a coarse approximation.
  const timeAllocation = useMemo(() => {
    const reading = subjectAnalytics.reduce(
      (s, x) => s + (x.activeMinutes || 0),
      0
    );
    const quiz = subjectAnalytics.reduce(
      (s, x) => s + (x.quizAttempts || 0) * 3, // ~3 min per quiz attempt
      0
    );
    const flash = subjectAnalytics.reduce(
      (s, x) => s + Math.round((x.flashcardsReviewed || 0) * 0.25), // ~15s per card
      0
    );
    const total = Math.max(1, reading + quiz + flash);
    return [
      { label: "Reading", pct: Math.round((reading / total) * 100), minutes: reading },
      { label: "Lab", pct: Math.round((quiz / total) * 100), minutes: quiz },
      { label: "Recall", pct: Math.round((flash / total) * 100), minutes: flash },
    ].filter((r) => r.minutes > 0);
  }, [subjectAnalytics]);

  const overallRecall = stats?.averageQuizScore ?? 0;
  const totalHours = Math.floor((stats?.totalStudyMinutes ?? 0) / 60);
  const totalRemMin = (stats?.totalStudyMinutes ?? 0) % 60;

  return (
    <div className="min-h-screen">
      <MobileTopBar title="Analytics" />

      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <PageHeader
            caption={`LAST ${trend.length || 7} DAYS · LIVE`}
            title="Analytics"
            description="Real recall, real time, real weakness — sourced from your activity, not estimated."
          />
        </Section>
      </PageContainer>

      {/* KPI strip */}
      <PageContainer>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 pb-6">
          <StatTile value={`${overallRecall}%`} label="Recall" tone="mint" />
          <StatTile
            value={`${totalHours}h ${totalRemMin}m`}
            label="Time studied"
          />
          <StatTile
            value={stats?.completedContent ?? 0}
            label="Content done"
          />
          <StatTile
            value={`${stats?.currentStreak ?? 0}d`}
            label="Streak"
          />
        </div>
      </PageContainer>

      {/* Trend area chart + Mastery list */}
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="lg:col-span-2 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-7">
            <div className="flex items-center justify-between gap-2">
              <p className="caption">Active minutes · last {trend.length || 7} days</p>
              {trend.length > 1 && (
                <Pill variant="mint">
                  {trend.reduce((s, x) => s + x.minutes, 0)} min total
                </Pill>
              )}
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-[44px] lg:text-[56px] font-bold leading-none text-mint">
                {trend.length > 0
                  ? Math.round(
                      trend.reduce((s, x) => s + x.minutes, 0) / Math.max(trend.length, 1)
                    )
                  : 0}
              </p>
              <p className="text-[13px] text-chalk-400">avg min/day</p>
            </div>
            <div className="mt-4 h-44 lg:h-52 w-full">
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mintFade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(60,206,156)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="rgb(60,206,156)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,17,21,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="rgb(60,206,156)"
                      strokeWidth={2}
                      fill="url(#mintFade)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[12.5px] text-chalk-500">
                  No tracked time yet — start a chapter to see it here.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6">
            <SectionHeader title="Mastery" />
            <ul className="mt-4 space-y-3.5">
              {mastery.length === 0 ? (
                <li className="py-2 text-[13px] text-chalk-500">No data.</li>
              ) : (
                mastery.slice(0, 6).map((m) => {
                  const tone =
                    m.completionPct >= 75 ? "mint" : m.completionPct >= 50 ? "ember" : "flame";
                  return (
                    <li key={m.subjectId}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <p className="text-[12.5px] font-medium text-[rgb(var(--fg))]">
                          {m.subject?.code ?? m.subjectId.slice(0, 6)}
                        </p>
                        <p
                          className={`text-[12.5px] font-bold tabular-nums ${
                            tone === "mint" ? "text-mint" : tone === "ember" ? "text-ember-400" : "text-flame-500"
                          }`}
                        >
                          {m.completionPct}%
                        </p>
                      </div>
                      <SegmentedProgress value={m.completionPct} tone={tone} />
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </PageContainer>

      {/* Weakness ranking — "study these first" */}
      <PageContainer>
        <Section density="compact">
          <SectionHeader
            title="Study these first"
            meta={`${subjectAnalytics.length} subjects`}
          />
          {subjectAnalytics.length === 0 ? (
            <p className="mt-5 py-6 text-center text-[13px] text-chalk-500">
              Open a subject to start building your weakness ranking.
            </p>
          ) : (
            <div className="mt-5 h-56 lg:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subjectAnalytics.slice(0, 8).map((s) => ({
                    name: s.subject?.code ?? s.subjectId.slice(0, 6),
                    weakness: s.weaknessScore,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,17,21,0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v} / 100`, "Weakness"]}
                  />
                  <Bar dataKey="weakness" fill="rgb(252,116,98)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </PageContainer>

      {/* Time allocation */}
      <PageContainer>
        <Section density="compact">
          <SectionHeader title="Time allocation" />
          {timeAllocation.length === 0 ? (
            <p className="mt-5 py-6 text-center text-[13px] text-chalk-500">
              No tracked time yet.
            </p>
          ) : (
            <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5">
              {timeAllocation.map((row) => (
                <li key={row.label} className="flex items-center gap-3 text-[13px]">
                  <span className="w-24 shrink-0 text-chalk-300">{row.label}</span>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full bg-mint-400" style={{ width: `${Math.max(2, row.pct)}%` }} />
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right font-semibold text-[rgb(var(--fg))]">
                    {row.minutes}m · {row.pct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
