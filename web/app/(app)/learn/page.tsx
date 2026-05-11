"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useMySubjectAnalytics } from "@/lib/hooks/useDashboardAnalytics";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  PageHeader,
  MobileTopBar,
} from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
import {
  TabStrip,
  SegmentedProgress,
  Pill,
} from "@/components/unisage/primitives";
import { SkeletonCard } from "@/components/unisage/Skeleton";
import { Search, Filter, ArrowRight } from "lucide-react";
import type { Subject } from "@/lib/types";
import { examSubjectsForStudent } from "@/lib/semester-exams";
import { examDateForSubject, examMeta } from "@/lib/exam-schedule";

type SortMode = "urgency" | "weakness" | "yield" | "frequency";

const TABS: { id: SortMode; label: string }[] = [
  { id: "urgency", label: "Urgency" },
  { id: "weakness", label: "Weakness" },
  { id: "yield", label: "Marks yield" },
  { id: "frequency", label: "Repeat freq" },
];

export default function LearnPage() {
  const { user } = useAuth();
  const { subjects: rawSubjects, isLoading } = useSubjects(
    user?.semester
      ? {
          year: user.year,
          semester: user.semester,
          cacheKey: user.specialization || "no-specialization",
        }
      : undefined,
  );
  const subjects = useMemo(
    () => examSubjectsForStudent(rawSubjects, user?.specialization, user?.branchCode),
    [rawSubjects, user?.specialization, user?.branchCode],
  );
  // Rollup-backed analytics — same source as the dashboard. Falls back to
  // pct=0 when a brand-new user has no rollup row yet (rather than showing
  // a misleading 0/1 = 0% from filtered-out user_progress rows).
  const { subjects: subjectAnalytics } = useMySubjectAnalytics();
  const [sort, setSort] = useState<SortMode>("urgency");
  const [search, setSearch] = useState("");

  const enriched = useMemo(() => {
    const byId = new Map(subjectAnalytics.map((sa) => [sa.subjectId, sa]));
    return subjects.map((s: Subject) => {
      const sa = byId.get(s.id);
      const pct = Math.round(sa?.completionPct ?? 0);
      const weaknessScore = sa?.weaknessScore ?? 100; // unstudied = max weakness
      const repeats = Math.floor(8 + (s.credits || 4) * 1.5);
      const weak = Math.min(4, Math.max(0, Math.round(weaknessScore / 25)));
      const marks = Math.round(60 + pct * 0.4);
      const exam = examMeta(examDateForSubject(s));
      return { subject: s, pct, repeats, weak, marks, weaknessScore, exam };
    });
  }, [subjects, subjectAnalytics]);

  const sorted = useMemo(() => {
    let arr = [...enriched];
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(
        (r) =>
          r.subject.name.toLowerCase().includes(s) ||
          r.subject.code.toLowerCase().includes(s),
      );
    }
    // Urgency: nearest exam first, then lowest completion.
    if (sort === "urgency")
      return arr.sort(
        (a, b) => a.exam.sortTime - b.exam.sortTime || a.pct - b.pct,
      );
    // Weakness: highest weakness score first.
    if (sort === "weakness")
      return arr.sort((a, b) => b.weaknessScore - a.weaknessScore);
    if (sort === "yield") return arr.sort((a, b) => b.marks - a.marks);
    return arr.sort((a, b) => b.repeats - a.repeats);
  }, [enriched, sort, search]);

  return (
    <div className="min-h-screen">
      <MobileTopBar />

      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <PageHeader
            caption={`${subjects.length} SUBJECTS · PRIORITIZED`}
            title="Learn"
            description="Subjects ranked by exam urgency, recall decay, and marks-per-minute. Tap any subject to enter its workspace."
            actions={
              <div className="hidden md:flex items-center gap-2">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.06] text-chalk-300 hover:bg-white/[0.05]"
                  aria-label="Filter"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            }
          />
        </Section>
      </PageContainer>

      {/* Search + filter pills */}
      <PageContainer>
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 pt-2 pb-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-chalk-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects, codes, topics…"
              className="w-full rounded-[12px] border border-white/[0.06] bg-[rgb(var(--bg-elev))] pl-10 pr-4 py-3 text-[14px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none transition-colors"
            />
          </div>
          <TabStrip<SortMode>
            tabs={TABS}
            active={sort}
            onChange={setSort}
            className="md:flex-shrink-0"
          />
        </div>
      </PageContainer>

      {/* Subjects grid */}
      <PageContainer>
        <Section density="compact" className="!pt-2">
          {isLoading && subjects.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} className="h-44" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-chalk-500">
              {search
                ? `No subjects match "${search}"`
                : `No subjects found for ${user?.collegeCode} · ${user?.branchCode} · sem ${user?.semester}`}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {sorted.map((row) => {
                const tone =
                  row.pct >= 75 ? "mint" : row.pct >= 50 ? "ember" : "flame";
                const status =
                  tone === "mint" ? "READY" : tone === "ember" ? "WARM" : "HOT";
                const urgency =
                  row.exam.urgency === "Done"
                    ? "Done"
                    : row.exam.urgency === "Scheduled"
                      ? "Scheduled"
                      : row.pct >= 75
                        ? "Confident"
                        : row.pct >= 50
                          ? "In review"
                          : row.exam.urgency;
                return (
                  <Link
                    key={row.subject.id}
                    href={`/subjects/${row.subject.id}`}
                    className="group flex flex-col rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))] hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                          {row.subject.code} · {row.exam.label} ·{" "}
                          <span
                            className={
                              tone === "flame"
                                ? "text-flame-500"
                                : tone === "ember"
                                  ? "text-ember-400"
                                  : "text-mint-400"
                            }
                          >
                            {urgency.toUpperCase()}
                          </span>
                        </p>
                        <h3 className="mt-2 text-[20px] lg:text-[22px] font-semibold leading-tight tracking-[-0.005em] text-[rgb(var(--fg))]">
                          {row.subject.name}
                        </h3>
                      </div>
                      <Pill
                        variant={
                          tone === "mint"
                            ? "mint"
                            : tone === "ember"
                              ? "ember"
                              : "flame"
                        }
                      >
                        {status}
                      </Pill>
                    </div>

                    <div className="mt-5 flex items-end gap-3">
                      <div className="flex-1">
                        <SegmentedProgress
                          value={row.pct}
                          tone={tone}
                          segments={28}
                        />
                      </div>
                      <p
                        className={`text-[24px] font-bold leading-none tabular-nums ${
                          tone === "mint"
                            ? "text-mint"
                            : tone === "ember"
                              ? "text-ember-400"
                              : "text-flame-500"
                        }`}
                      >
                        {row.pct}%
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between gap-2 text-[11.5px] text-chalk-400">
                      <span>{row.repeats} repeats</span>
                      <span>·</span>
                      <span>{row.weak} weak</span>
                      <span>·</span>
                      <span>{row.marks} marks</span>
                      <span className="ml-auto inline-flex items-center text-[12px] text-chalk-300 group-hover:text-mint-400 transition-colors">
                        Open
                        <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
