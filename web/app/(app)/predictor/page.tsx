"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useAuth } from "@/lib/hooks/useAuth";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject } from "@/lib/types";
import { MobileTopBar, PageHeader } from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
import { Pill, SectionHeader, StatTile } from "@/components/unisage/primitives";
import { SkeletonCard } from "@/components/unisage/Skeleton";
import { Search, Sparkles, AlertCircle } from "lucide-react";
import { PaywallGate } from "@/components/billing/PaywallGate";
import { ErrorState } from "@/components/shared/ErrorState";

type Aggregated = {
  subject: Subject;
  papers: Content[];
};

export default function PredictorPage() {
  return (
    <PaywallGate scope="predictor">
      <PredictorPageInner />
    </PaywallGate>
  );
}

function PredictorPageInner() {
  const { user } = useAuth();
  const { subjects, isLoading: subjLoading } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined
  );
  const [activeId, setActiveId] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  const subjectIds = useMemo(
    () => subjects.map((s) => s.id).join(","),
    [subjects]
  );

  const { data, error, isLoading } = useSWR(
    subjectIds ? `predictor-aggregate-${subjectIds}` : null,
    async (): Promise<Aggregated[]> => {
      const results = await Promise.all(
        subjects.map(async (s) => {
          const res: any = await subjectsAPI.getContent(s.id).catch(() => null);
          const d = res?.data ?? res ?? {};
          const bucket: Content[] = Array.isArray(d?.content?.paper_predictor)
            ? d.content.paper_predictor.map((it: any) => ({
                ...it,
                type: "paper_predictor" as const,
                unit: it.unit ?? {
                  id: "",
                  title: "",
                  subject: { id: s.id, name: s.name, code: s.code },
                },
              }))
            : [];
          return { subject: s, papers: bucket };
        })
      );
      return results;
    },
    { revalidateOnFocus: false }
  );

  const aggregated: Aggregated[] = data || [];
  const totalPapers = aggregated.reduce((sum, a) => sum + a.papers.length, 0);
  const subjectsWithPapers = aggregated.filter((a) => a.papers.length > 0);

  const visible = useMemo(() => {
    let arr = aggregated;
    if (activeId !== "all") arr = arr.filter((a) => a.subject.id === activeId);
    if (search) {
      const s = search.toLowerCase();
      arr = arr
        .map((a) => ({
          ...a,
          papers: a.papers.filter(
            (p) =>
              p.title.toLowerCase().includes(s) ||
              a.subject.name.toLowerCase().includes(s) ||
              a.subject.code.toLowerCase().includes(s)
          ),
        }))
        .filter((a) => a.papers.length > 0);
    }
    return arr;
  }, [aggregated, activeId, search]);

  const visiblePapers = visible.reduce((sum, a) => sum + a.papers.length, 0);

  return (
    <div className="min-h-screen">
      <MobileTopBar title="Predictor" />

      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <PageHeader
            caption="PREDICTED PAPERS · 8-CYCLE MODEL"
            title="Intelligence"
            description="AI-reconstructed exam papers built from the last 8 cycles. Each question carries common-trap callouts, PYQ evidence, and time-budget tactics."
            actions={
              <Pill variant="mint">
                <Sparkles className="h-3 w-3" />
                Live model
              </Pill>
            }
          />
        </Section>
      </PageContainer>

      {/* Stats */}
      <PageContainer>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 pb-6">
          <StatTile value={totalPapers} label="Predicted papers" tone="mint" />
          <StatTile
            value={subjectsWithPapers.length}
            label="Subjects covered"
          />
          <StatTile value="88%" label="Confidence" tone="mint" />
          <StatTile value="v8.2" label="Model version" />
        </div>
      </PageContainer>

      {/* Filters */}
      <PageContainer>
        <div className="sticky top-0 z-10 -mx-5 md:-mx-8 lg:-mx-10 xl:-mx-14 px-5 md:px-8 lg:px-10 xl:px-14 py-3 bg-[rgb(var(--bg))]/85 backdrop-blur-md border-y border-white/[0.05]">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-chalk-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search papers, subjects, codes…"
                className="w-full rounded-[12px] border border-white/[0.06] bg-[rgb(var(--bg-elev))] pl-10 pr-4 py-2.5 text-[14px] text-[rgb(var(--fg))] placeholder:text-chalk-500 focus:border-mint-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              <FilterPill
                active={activeId === "all"}
                onClick={() => setActiveId("all")}
                label={`All · ${aggregated.length}`}
              />
              {subjects.map((s) => {
                const count =
                  aggregated.find((a) => a.subject.id === s.id)?.papers
                    .length ?? 0;
                return (
                  <FilterPill
                    key={s.id}
                    active={activeId === s.id}
                    onClick={() => setActiveId(s.id)}
                    label={`${s.code} · ${count}`}
                    disabled={count === 0}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Content */}
      <PageContainer>
        <Section density="compact">
          <SectionHeader
            title={
              activeId === "all"
                ? "All papers"
                : `${subjects.find((s) => s.id === activeId)?.name ?? "Subject"} papers`
            }
            meta={`${visiblePapers} on file`}
          />

          <div className="mt-5">
            {(isLoading || subjLoading) && totalPapers === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCard key={i} className="h-48" />
                ))}
              </div>
            ) : error ? (
              <ErrorState />
            ) : visiblePapers === 0 ? (
              <AnalyzingState
                subjects={
                  activeId === "all"
                    ? subjects
                    : subjects.filter((s) => s.id === activeId)
                }
                hasFilters={!!search}
                onClear={() => {
                  setSearch("");
                  setActiveId("all");
                }}
              />
            ) : (
              <div className="space-y-10">
                {visible.map((agg) => (
                  <SubjectGroup key={agg.subject.id} group={agg} />
                ))}
              </div>
            )}
          </div>
        </Section>
      </PageContainer>

      {/* Footer note */}
      <PageContainer>
        <div className="border-t border-white/[0.05] py-8 text-center">
          <p className="text-[10px] uppercase tracking-cap text-chalk-500">
            END · UNISAGE INTELLIGENCE MODEL · v8.2
          </p>
          <p className="mt-2 text-[12px] text-chalk-400 max-w-xl mx-auto">
            Reconstructed from past papers and posterior probability models. For
            revision focus only — final exam content is set by your university.
          </p>
        </div>
      </PageContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterPill
// ---------------------------------------------------------------------------

function FilterPill({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 rounded-pill border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? "border-mint-500 bg-mint-500 text-ink-950"
          : disabled
            ? "border-white/[0.04] text-chalk-500/40 cursor-not-allowed"
            : "border-white/[0.1] text-chalk-300 hover:border-white/[0.2] hover:text-[rgb(var(--fg))]"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SubjectGroup
// ---------------------------------------------------------------------------

function SubjectGroup({ group }: { group: Aggregated }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="caption">{group.subject.code}</p>
          <h3 className="mt-1 text-[20px] font-semibold text-[rgb(var(--fg))]">
            {group.subject.name}
          </h3>
        </div>
        <Link
          href={`/subjects/${group.subject.id}`}
          className="text-[12px] text-chalk-400 hover:text-mint-400 transition-colors"
        >
          Open subject →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(() => {
          const code = String(group.subject.code || "").toLowerCase();
          const name = String(group.subject.name || "").toLowerCase();
            const patterns = [
              "oops",
              "oop",
              "object",
              "object oriented",
              "object-oriented",
              "dsa",
              "data structures",
              "data-structures",
              "data structure",
              "algorithms",
              "data structures & algorithms",
            ];
            const matches = patterns.some((p) => code.includes(p) || name.includes(p));
            if (matches) {
            return group.papers.map((p, i) => (
              <PredictorCard key={p.id} paper={p} index={i} />
            ));
          }
          return (
            <ComingSoonCard key={group.subject.id} subject={group.subject} />
          );
        })()}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ComingSoonCard
// ---------------------------------------------------------------------------

function ComingSoonCard({ subject }: { subject: Subject }) {
  return (
    <div className="col-span-1 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-6 flex flex-col items-start justify-center gap-3">
      <p className="caption">{subject.code}</p>
      <h4 className="text-[16px] font-semibold text-[rgb(var(--fg))]">
        {subject.name}
      </h4>
      <p className="text-[13px] text-chalk-400">
        Coming soon — predictions for this subject are being rolled out.
      </p>
      <div className="mt-3">
        <Pill className="opacity-60 cursor-not-allowed">Coming soon</Pill>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PredictorCard
// ---------------------------------------------------------------------------

function PredictorCard({ paper, index }: { paper: Content; index: number }) {
  const meta = (paper as any).meta ?? {};

  return (
    <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
          PAPER · {String(index + 1).padStart(2, "0")}
        </p>
        <Pill variant="mint-solid">Open</Pill>
      </div>
      <h4 className="mt-3 text-[16.5px] lg:text-[17.5px] font-semibold leading-snug text-[rgb(var(--fg))]">
        {paper.title}
      </h4>
      <div className="mt-4 grid grid-cols-3 gap-3 text-left">
        <Stat label="Time" value={meta.duration || "3h"} />
        <Stat label="Marks" value={meta.totalMarks || "100"} />
        <Stat
          label="Confidence"
          value={`${meta.confidence || 88}%`}
          tone="mint"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "mint";
}) {
  return (
    <div>
      <p className="caption mb-0.5">{label}</p>
      <p
        className={`text-[14px] font-bold ${
          tone === "mint" ? "text-mint" : "text-[rgb(var(--fg))]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalyzingState
// ---------------------------------------------------------------------------

function AnalyzingState({
  subjects,
  hasFilters,
  onClear,
}: {
  subjects: Subject[];
  hasFilters: boolean;
  onClear: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="rounded-card border border-dashed border-white/[0.08] py-12 text-center">
        <Sparkles className="mx-auto h-7 w-7 text-chalk-500" />
        <p className="mt-4 text-[15px] font-semibold text-[rgb(var(--fg))]">
          No matches for your search
        </p>
        <p className="mt-1 text-[13px] text-chalk-400 max-w-md mx-auto">
          Try clearing the search or picking a different subject.
        </p>
        <button
          onClick={onClear}
          className="mt-5 inline-flex rounded-pill border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-chalk-300 hover:bg-white/[0.04] transition-colors"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {subjects.map((s) => (
        <div
          key={s.id}
          className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
              {s.code}
            </p>
            <Pill variant="mint">
              <Sparkles className="h-3 w-3" />
              Analyzing
            </Pill>
          </div>
          <h4 className="mt-3 text-[16.5px] font-semibold leading-snug text-[rgb(var(--fg))]">
            {s.name}
          </h4>
          <p className="mt-3 text-[12.5px] leading-relaxed text-chalk-400">
            Analyzing 8 exam cycles for {s.code}. Predicted paper publishes here
            before your exam date.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-chalk-500">
            <span className="h-1.5 w-1.5 inline-block rounded-full bg-mint-400 animate-pulse-soft" />
            <span>Model v8.2 · 88% confidence target</span>
          </div>
        </div>
      ))}
    </div>
  );
}
