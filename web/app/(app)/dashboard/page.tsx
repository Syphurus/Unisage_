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
import {
  useDashboardStats,
  useMySubjectAnalytics,
} from "@/lib/hooks/useDashboardAnalytics";
import { PageHeader, MobileTopBar } from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
import {
  Pill,
  HighlightCard,
  SegmentedProgress,
  StatTile,
  SectionHeader,
  AlertCard,
  MetaCaption,
} from "@/components/unisage/primitives";
import { SkeletonCard } from "@/components/unisage/Skeleton";
import {
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Layers,
  FileText,
  Repeat,
} from "lucide-react";
import type { Subject } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { subjects, isLoading: subjLoading } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined
  );
  const { progress } = useProgress();
  const { stats: legacyStats } = useSessionStats();
  const { attempts } = useQuizAttempts();
  const { stats: dashStats } = useDashboardStats();
  const { subjects: subjectAnalytics } = useMySubjectAnalytics();

  // Source of truth: rollup-backed analytics (subject_progress). Falls back
  // to live legacy stats when the rollup is empty.
  const stats = dashStats || legacyStats;

  // Build a unified, sorted list of subjects with real completion + weakness.
  // For each enrolled subject, look up its rollup row by id; if the rollup
  // doesn't have a row yet (brand-new user), the subject still appears with
  // pct=0 so the UI doesn't lose it.
  const ranked = useMemo(() => {
    const byId = new Map(subjectAnalytics.map((sa) => [sa.subjectId, sa]));
    const merged = subjects.map((s: Subject) => {
      const sa = byId.get(s.id);
      return {
        subject: s,
        pct: sa?.completionPct ?? 0,
        weakness: sa?.weaknessScore ?? 100, // unstudied → maximum weakness
        avgQuizPct: sa?.avgQuizPct ?? null,
        activeMinutes: sa?.activeMinutes ?? 0,
      };
    });
    // High probability = subjects ranked by weakness DESCENDING (most-needed
    // study first). This is the "what should I study?" answer.
    return merged.sort((a, b) => b.weakness - a.weakness);
  }, [subjects, subjectAnalytics]);

  // "Continue revision" = highest-weakness subject the user has actually
  // touched (so we don't suggest something they've never opened).
  const continueRevision =
    ranked.find((r) => r.activeMinutes > 0 && r.pct < 100) ??
    ranked.find((r) => r.pct < 100);

  const firstName = (user?.fullName || "Friend").split(" ")[0];
  const totalSubjects = subjects.length;
  const weakOnes = ranked.filter((r) => r.pct < 50);

  return (
    <div className="min-h-screen">
      <MobileTopBar />

      {/* Hero */}
      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <div className="flex items-center gap-3 mb-5">
            <span className="h-1.5 w-1.5 inline-block rounded-full bg-mint-400 animate-pulse-soft" />
            <span className="text-[10.5px] font-semibold uppercase tracking-cap text-chalk-500">
              {totalSubjects} subjects · in 5 days · 09:00
            </span>
          </div>
          <h1 className="text-[36px] md:text-[48px] lg:text-[60px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
            {firstName} —
            <br className="md:hidden" />
            <span className="md:ml-3"></span>
            <span className="text-mint">5 days</span>,{" "}
            <span className="text-mint">{totalSubjects} subjects</span> matter.
          </h1>
        </Section>
      </PageContainer>

      {/* Top grid: AI focus + Continue revision (lg side-by-side) */}
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="lg:col-span-2">
            <HighlightCard dot={null}>
              <h3 className="text-[18px] md:text-[20px] lg:text-[22px] font-semibold leading-snug text-[rgb(var(--fg))]">
                {ranked[0]
                  ? `${ranked[0].subject.name} is predicted high-repeat.`
                  : "Your weakest topic gets prioritized first."}
              </h3>
              <p className="mt-3 text-[13px] lg:text-[14px] leading-relaxed text-chalk-400 max-w-2xl">
                Memory decay is highest on topics with no recall in 14+ days.
                Start a focus block to recover marks fast.
              </p>
              <Link
                href="/curator"
                className="pill pill-mint-solid mt-5 inline-flex"
              >
                Start focus block <ArrowRight className="h-3 w-3" />
              </Link>
            </HighlightCard>
          </div>
          <div className="lg:col-span-1">
            {continueRevision ? (
              (() => {
                const fresh = continueRevision.pct === 0;
                return (
                  <Link
                    href={`/subjects/${continueRevision.subject.id}`}
                    className="group flex flex-col h-full rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 transition-colors hover:bg-[rgb(var(--bg-subtle))]"
                  >
                    <MetaCaption>
                      {fresh
                        ? "Start here · highest priority"
                        : `Continue revision · ${continueRevision.pct}%`}
                    </MetaCaption>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-mint-500/10 text-mint-400">
                        <Layers className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-cap text-chalk-500">
                          {continueRevision.subject.code}
                        </p>
                        <p className="mt-0.5 text-[15px] font-semibold text-[rgb(var(--fg))] truncate">
                          {continueRevision.subject.name}
                        </p>
                      </div>
                    </div>
                    {fresh ? (
                      <p className="mt-5 text-[12.5px] leading-relaxed text-chalk-400">
                        Not started yet. One tap opens the subject hub —
                        flashcards, notes, and predicted papers are all there.
                      </p>
                    ) : (
                      <SegmentedProgress
                        value={continueRevision.pct}
                        segments={24}
                        className="mt-5"
                      />
                    )}
                    <span className="mt-auto pt-5 text-[12px] text-mint-400 inline-flex items-center gap-1.5 font-semibold">
                      {fresh ? "Begin" : "Resume"}{" "}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })()
            ) : (
              <SkeletonCard className="h-full" />
            )}
          </div>
        </div>
      </PageContainer>

      {/* High probability ranked */}
      <Section density="compact">
        <PageContainer>
          <SectionHeader
            title="High probability"
            meta={`${ranked.length} subjects · ranked`}
          />
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
            {subjLoading && totalSubjects === 0 ? (
              [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            ) : ranked.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-chalk-500 col-span-full">
                No subjects yet.
              </p>
            ) : (
              ranked.slice(0, 6).map((r, i) => {
                const fresh = r.pct === 0 && r.activeMinutes === 0;
                const tone =
                  r.pct >= 80 ? "mint" : r.pct >= 50 ? "ember" : "flame";
                const status = fresh
                  ? "BEGIN"
                  : tone === "mint"
                    ? "READY"
                    : tone === "ember"
                      ? "WARM"
                      : "HOT";
                return (
                  <Link
                    key={r.subject.id}
                    href={`/subjects/${r.subject.id}`}
                    className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 transition-all hover:border-white/[0.12] hover:bg-[rgb(var(--bg-subtle))]"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[10px] font-mono text-chalk-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-cap ${
                          tone === "mint"
                            ? "text-mint-400"
                            : tone === "ember"
                              ? "text-ember-400"
                              : "text-flame-500"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                      {r.subject.code} · {r.subject.credits || 4} CREDITS
                    </p>
                    <h3 className="mt-1.5 text-[16px] lg:text-[17px] font-semibold leading-snug text-[rgb(var(--fg))]">
                      {r.subject.name}
                    </h3>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      {fresh ? (
                        <span className="flex-1 text-[12.5px] text-chalk-400">
                          Not started yet
                        </span>
                      ) : (
                        <SegmentedProgress
                          value={r.pct}
                          tone={tone}
                          className="flex-1"
                        />
                      )}
                      <span
                        className={`text-[14px] font-bold ${
                          fresh
                            ? "text-mint-400"
                            : tone === "mint"
                              ? "text-mint"
                              : tone === "ember"
                                ? "text-ember-400"
                                : "text-flame-500"
                        }`}
                      >
                        {fresh ? "Begin →" : `${r.pct}%`}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </PageContainer>
      </Section>

      {/* Quick tools */}
      <Section density="compact">
        <PageContainer>
          <SectionHeader title="Quick tools" />
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[
              {
                href: "/learn",
                Icon: Repeat,
                label: "Recall Cycles",
                sub: "Spaced repetition",
              },
              {
                href: "/learn",
                Icon: GraduationCap,
                label: "Retrieval Lab",
                sub: "Timed MCQ drills",
              },
              {
                href: "/predictor",
                Icon: FileText,
                label: "PYQ",
                sub: "Past paper clusters",
              },
              {
                href: "/learn",
                Icon: ArrowRight,
                label: "Exam tactics",
                sub: "Strategies & shortcuts",
              },
            ].map(({ href, Icon, label, sub }) => (
              <Link
                key={label}
                href={href}
                className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-mint-500/30 hover:bg-[rgb(var(--bg-subtle))]"
              >
                <span className="grid h-9 w-9 lg:h-11 lg:w-11 place-items-center rounded-[10px] border border-mint-500/30 text-mint-400 transition-all group-hover:bg-mint-500/10">
                  <Icon className="h-4 w-4 lg:h-[18px] lg:w-[18px]" />
                </span>
                <p className="mt-4 text-[14.5px] lg:text-[15px] font-semibold text-[rgb(var(--fg))]">
                  {label}
                </p>
                <p className="mt-0.5 text-[11.5px] lg:text-[12px] text-chalk-400">
                  {sub}
                </p>
              </Link>
            ))}
          </div>
        </PageContainer>
      </Section>

      {/* Weak zone */}
      {weakOnes.length > 0 && (
        <Section density="compact">
          <PageContainer>
            <SectionHeader
              title="Weak zone"
              meta={`${weakOnes.length} alerts`}
            />
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {weakOnes.slice(0, 6).map((r) => (
                <AlertCard
                  key={r.subject.id}
                  tone={r.pct < 25 ? "flame" : "ember"}
                  title={`${r.subject.code} · ${r.subject.name}`}
                  meta={`Accuracy ${r.pct}% · last attempts`}
                />
              ))}
            </div>
          </PageContainer>
        </Section>
      )}

      {/* Today — only render once there is meaningful data. A row of zeros
          on first load tells students they're behind before they begin;
          full numbers live on /analytics regardless. */}
      {(stats?.totalStudyMinutes ?? 0) > 0 ||
      (stats?.currentStreak ?? 0) > 0 ||
      (stats?.completedContent ?? 0) > 0 ||
      (stats?.quizzesAttempted ?? 0) > 0 ? (
        <Section density="default">
          <PageContainer>
            <SectionHeader title="Today" />
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
              <StatTile
                value={`${stats?.currentStreak ?? 0}d`}
                label="Streak"
              />
              <StatTile
                value={`${Math.floor((stats?.totalStudyMinutes ?? 0) / 60)}h ${(stats?.totalStudyMinutes ?? 0) % 60}m`}
                label="Time studied"
              />
              <StatTile
                value={`${Math.round(stats?.averageQuizScore ?? 0)}%`}
                label="Recall"
                tone="mint"
              />
              <StatTile
                value={`${stats?.completedContent ?? 0}`}
                label="Done"
              />
            </div>
          </PageContainer>
        </Section>
      ) : null}
    </div>
  );
}
