"use client";

import { useMemo } from "react";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useProgress,
  useSessionStats,
  useQuizAttempts,
} from "@/lib/hooks/useProgress";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  SectionHeader,
  SegmentedProgress,
  Pill,
} from "@/components/unisage/primitives";
import type { Subject } from "@/lib/types";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const { progress } = useProgress();
  const { stats } = useSessionStats();
  const { attempts } = useQuizAttempts();

  const overallRecall = Math.round(stats?.averageQuizScore ?? 0);

  // Trend = last 7 quiz attempts
  const trend = useMemo(() => {
    const last = (attempts || []).slice(-7);
    if (last.length === 0)
      return [40, 48, 52, 55, 60, 65, overallRecall || 70];
    return last.map((a: any) => a.score ?? 50);
  }, [attempts, overallRecall]);

  // Mastery by subject
  const mastery = useMemo(() => {
    return subjects.map((s: Subject) => {
      const sp = progress.filter(
        (p: any) => p.subjectId === s.id || p.subject?.id === s.id,
      );
      const completed = sp.filter(
        (p: any) => p.completed || p.percentage >= 100,
      ).length;
      const total = Math.max(sp.length, 1);
      return { subject: s, pct: Math.round((completed / total) * 100) };
    });
  }, [subjects, progress]);

  // Time allocation across content types
  const timeAllocation = useMemo(() => {
    const buckets: Record<string, number> = {};
    progress.forEach((p: any) => {
      const t = p.contentType || p.type || "Other";
      buckets[t] = (buckets[t] || 0) + (p.timeSpent || 0);
    });
    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    const labels: Record<string, string> = {
      flashcard: "Recall",
      long_notes: "Long notes",
      short_notes: "Short notes",
      quiz: "Lab",
      exam_tips: "Tactics",
      pyqs: "PYQ",
      paper_predictor: "Predictor",
    };
    return Object.entries(buckets)
      .map(([k, v]) => ({
        label: labels[k] ?? k,
        pct: Math.round((v / total) * 100),
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [progress]);

  return (
    <div className="min-h-screen">
      <TopHeader caption="LAST 7 DAYS · LIVE" title="Analytics" showTheme />

      {/* Trend chart */}
      <section className="px-5 md:px-8 lg:px-12">
        <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="caption">Recall accuracy · trend</p>
            {trend.length > 1 && (
              <Pill variant="mint">
                +{trend[trend.length - 1] - trend[0]} pts
              </Pill>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <p className="text-[40px] font-bold leading-none text-mint">
              {overallRecall}%
            </p>
          </div>
          <Sparkline values={trend} />
          <div className="mt-2 flex justify-between text-[10px] text-chalk-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="lg:px-12 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
      {/* Mastery by subject */}
      <section className="px-5 pt-7 md:px-8 lg:px-0 lg:pt-7">
        <SectionHeader title="Mastery by subject" />
        <ul className="mt-3 space-y-3">
          {mastery.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-chalk-500">
              Nothing yet. Open a subject to start tracking.
            </li>
          ) : (
            mastery.map((m) => {
              const tone = m.pct >= 75 ? "mint" : m.pct >= 50 ? "ember" : "flame";
              return (
                <li key={m.subject.id}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-medium text-[rgb(var(--fg))]">
                      {m.subject.code}
                    </p>
                    <p
                      className={`text-[13px] font-bold tabular-nums ${
                        tone === "mint"
                          ? "text-mint"
                          : tone === "ember"
                            ? "text-ember-400"
                            : "text-flame-500"
                      }`}
                    >
                      {m.pct}%
                    </p>
                  </div>
                  <SegmentedProgress value={m.pct} tone={tone} />
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Time allocation */}
      <section className="px-5 pt-7 pb-4 md:px-8 lg:px-0 lg:pt-7">
        <SectionHeader title="Time allocation" />
        <ul className="mt-3 space-y-3">
          {timeAllocation.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-chalk-500">
              No tracked time yet.
            </li>
          ) : (
            timeAllocation.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-3 text-[13px]"
              >
                <span className="w-20 shrink-0 text-chalk-300">
                  {row.label}
                </span>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full bg-mint-400"
                      style={{ width: `${Math.max(2, row.pct)}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 shrink-0 text-right font-semibold text-[rgb(var(--fg))]">
                  {row.pct}%
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 320;
  const h = 80;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-3 h-20 w-full"
    >
      <defs>
        <linearGradient id="mintFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(31,184,144)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(31,184,144)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#mintFade)" />
      <polyline
        points={points}
        fill="none"
        stroke="rgb(60,206,156)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
