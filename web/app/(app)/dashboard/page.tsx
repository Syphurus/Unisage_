"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubjects } from "@/lib/hooks/useSubjects";
import {
  useProgress,
  useSessionStats,
  useQuizAttempts,
} from "@/lib/hooks/useProgress";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  HighlightCard,
  SegmentedProgress,
  StatTile,
  SectionHeader,
  SubjectProgressRow,
  AlertCard,
  MetaCaption,
  PrimaryButton,
} from "@/components/unisage/primitives";
import {
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Layers,
  FileText,
  Repeat,
} from "lucide-react";
import type { Subject } from "@/lib/types";

const PREP_MODES = [
  { id: "tomorrow", label: "If Exam Was Tomorrow", meta: "42 min · 6 cards" },
  { id: "crash", label: "Crash Prep", meta: "85 min · 3 clusters" },
  { id: "high-prob", label: "High Probability Only", meta: "55 min · 8 topics" },
  { id: "pyq", label: "PYQ Sprint", meta: "30 min · 5 questions" },
  { id: "weak", label: "Weak Topics", meta: "60 min · 4 zones" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { subjects, isLoading: subjLoading } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const { progress } = useProgress();
  const { stats } = useSessionStats();
  const { attempts } = useQuizAttempts();
  const [activeMode, setActiveMode] = useState("crash");

  // Compute readiness per subject from progress
  const subjectReadiness = useMemo(() => {
    return subjects.map((s: Subject) => {
      const subjectProgress = progress.filter(
        (p: any) => p.subjectId === s.id || p.subject?.id === s.id,
      );
      const completed = subjectProgress.filter(
        (p: any) => p.completed || p.percentage >= 100,
      ).length;
      const total = Math.max(subjectProgress.length, 1);
      const pct = Math.round((completed / total) * 100);
      return { subject: s, pct };
    });
  }, [subjects, progress]);

  const ranked = [...subjectReadiness].sort((a, b) => b.pct - a.pct);
  const topThree = ranked.slice(0, 3);

  const continueRevision = ranked.find((r) => r.pct < 100);

  const firstName = (user?.fullName || "Friend").split(" ")[0];

  const totalSubjects = subjects.length;

  return (
    <div className="min-h-screen">
      <TopHeader
        caption={
          <>
            <span className="h-1.5 w-1.5 inline-block rounded-full bg-mint-400 animate-pulse-soft" />
            <span className="ml-2 inline-block">
              {totalSubjects} SUBJECTS · IN 5 DAYS · 09:00
            </span>
          </>
        }
        showBell
        showTheme
      />

      <section className="px-5 -mt-2 md:px-8 lg:px-12">
        <h1 className="text-[34px] md:text-[44px] lg:text-[52px] font-bold leading-[1.05] tracking-[-0.01em] text-[rgb(var(--fg))]">
          {firstName} —
          <br />
          <span className="text-mint">5 days</span>,{" "}
          <span className="text-mint">{totalSubjects} subjects</span> matter.
        </h1>
      </section>

      {/* Prep modes — horizontal scroll mobile, wrap on lg+ */}
      <section className="pt-7 md:pt-10 lg:pt-12">
        <div className="px-5 md:px-8 lg:px-12">
          <MetaCaption className="mb-3">Prep modes · tap to engage</MetaCaption>
        </div>
        <div
          className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 px-5 md:px-8 lg:px-12 lg:flex-wrap lg:overflow-visible"
          style={{ scrollbarWidth: "none" }}
        >
          {PREP_MODES.map((m) => {
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMode(m.id)}
                className={`shrink-0 rounded-card px-4 py-3 text-left transition-colors ${
                  active
                    ? "bg-mint-500 text-ink-950"
                    : "border border-white/[0.06] bg-[rgb(var(--bg-elev))] text-[rgb(var(--fg))]"
                }`}
              >
                <p
                  className={`text-[12px] font-semibold ${active ? "text-ink-950" : "text-[rgb(var(--fg))]"}`}
                >
                  {m.label}
                </p>
                <p
                  className={`mt-0.5 text-[10px] ${active ? "text-ink-950/70" : "text-chalk-500"}`}
                >
                  {m.meta}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI focus card */}
      <section className="px-5 pt-6 md:px-8 lg:px-12">
        <HighlightCard
          caption={
            <>
              <span className="text-mint-400">AI FOCUS</span> · LIVE
            </>
          }
          dot="mint"
        >
          <h3 className="text-[16px] font-semibold leading-snug text-[rgb(var(--fg))]">
            {topThree[0]
              ? `${topThree[0].subject.name} is predicted high-repeat.`
              : "Your weakest topic gets prioritized first."}
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-chalk-400">
            Memory decay is highest on topics with no recall in 14+ days. Start
            a focus block to recover marks fast.
          </p>
          <Link
            href="/curator"
            className="pill pill-mint-solid mt-4 inline-flex"
          >
            Start focus block <ArrowRight className="h-3 w-3" />
          </Link>
        </HighlightCard>
      </section>

      {/* High probability ranked */}
      <section className="px-5 pt-7 md:px-8 lg:px-12">
        <SectionHeader
          title="High probability"
          meta={`${topThree.length} of ${totalSubjects} · ranked`}
        />
        <div className="mt-2 divide-y divide-white/[0.04] lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0 lg:[&>*]:border-b lg:[&>*]:border-white/[0.04]">
          {subjLoading && totalSubjects === 0 ? (
            <p className="py-6 text-center text-[13px] text-chalk-500">
              Loading…
            </p>
          ) : topThree.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-chalk-500">
              No subjects yet.
            </p>
          ) : (
            topThree.map((r, i) => {
              const tone =
                r.pct >= 80 ? "mint" : r.pct >= 50 ? "ember" : "flame";
              const status =
                tone === "mint" ? "READY" : tone === "ember" ? "WARM" : "HOT";
              return (
                <SubjectProgressRow
                  key={r.subject.id}
                  index={String(i + 1).padStart(2, "0")}
                  meta={`${r.subject.code} · ${r.subject.credits || 4} CREDITS`}
                  title={r.subject.name}
                  pct={r.pct}
                  status={status}
                  statusTone={tone}
                  footer={`${r.subject.code} · sem ${r.subject.semester}`}
                  onClick={() => null}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Continue revision */}
      {continueRevision && (
        <section className="px-5 pt-7 md:px-8 lg:px-12">
          <SectionHeader
            title="Continue revision"
            meta={`${continueRevision.pct}%`}
          />
          <Link
            href={`/subjects/${continueRevision.subject.id}`}
            className="mt-3 flex items-center gap-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-3 transition-colors hover:bg-[rgb(var(--bg-subtle))]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-mint-500/10 text-mint-400">
              <Layers className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                {continueRevision.subject.code}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-[rgb(var(--fg))] truncate">
                {continueRevision.subject.name}
              </p>
              <SegmentedProgress
                value={continueRevision.pct}
                segments={20}
                className="mt-2"
              />
            </div>
            <ChevronRight className="h-4 w-4 text-chalk-400" />
          </Link>
        </section>
      )}

      {/* Quick tools */}
      <section className="px-5 pt-7 md:px-8 lg:px-12">
        <SectionHeader title="Quick tools" />
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Link
            href="/learn"
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-mint-500/30 text-mint-400">
              <Repeat className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[rgb(var(--fg))]">
              Recall Cycles
            </p>
            <p className="mt-0.5 text-[11px] text-chalk-400">
              Spaced repetition flashcards
            </p>
          </Link>
          <Link
            href="/learn"
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-mint-500/30 text-mint-400">
              <GraduationCap className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[rgb(var(--fg))]">
              Retrieval Lab
            </p>
            <p className="mt-0.5 text-[11px] text-chalk-400">
              Timed MCQ drills
            </p>
          </Link>
          <Link
            href="/predictor"
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-mint-500/30 text-mint-400">
              <FileText className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[rgb(var(--fg))]">
              PYQ
            </p>
            <p className="mt-0.5 text-[11px] text-chalk-400">
              Past paper clusters
            </p>
          </Link>
          <Link
            href="/curator"
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-mint-500/30 text-mint-400">
              <ArrowRight className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[rgb(var(--fg))]">
              Exam tactics
            </p>
            <p className="mt-0.5 text-[11px] text-chalk-400">12 plays</p>
          </Link>
        </div>
      </section>

      {/* Weak zone */}
      {ranked.filter((r) => r.pct < 50).length > 0 && (
        <section className="px-5 pt-7 md:px-8 lg:px-12">
          <SectionHeader
            title="Weak zone"
            meta={`${ranked.filter((r) => r.pct < 50).length} alerts`}
          />
          <div className="mt-3 space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {ranked
              .filter((r) => r.pct < 50)
              .slice(0, 4)
              .map((r) => (
                <AlertCard
                  key={r.subject.id}
                  tone={r.pct < 25 ? "flame" : "ember"}
                  title={`${r.subject.code} · ${r.subject.name}`}
                  meta={`Accuracy ${r.pct}% · last attempts`}
                />
              ))}
          </div>
        </section>
      )}

      {/* Today */}
      <section className="px-5 pt-7 pb-4 md:px-8 lg:px-12">
        <SectionHeader title="Today" />
        <div className="mt-3 grid grid-cols-4 gap-2 lg:gap-4">
          <StatTile
            value={`${stats?.currentStreak ?? 0}d`}
            label="Streak"
            tone="default"
          />
          <StatTile
            value={`${Math.round((stats?.totalStudyMinutes ?? 0) / Math.max(stats?.totalSessions ?? 1, 1))}m`}
            label="Today"
            tone="default"
          />
          <StatTile
            value={`${Math.round(stats?.averageQuizScore ?? 0)}%`}
            label="Recall"
            tone="mint"
          />
          <StatTile
            value={`${stats?.completedContent ?? 0}`}
            label="Done"
            tone="default"
          />
        </div>
      </section>
    </div>
  );
}
