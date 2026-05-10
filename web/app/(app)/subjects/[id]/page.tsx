"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSubject } from "@/lib/hooks/useSubjects";
import { useSubjectProgress } from "@/lib/hooks/useProgress";
import { useSubjectContent } from "@/lib/hooks/useSubjectContent";
import { MobileTopBar } from "@/components/unisage/AppShell";
import { PageContainer } from "@/components/unisage/PageContainer";
import {
  Pill,
  MetaCaption,
  SegmentedProgress,
  MiniDonut,
  StatTile,
} from "@/components/unisage/primitives";
import {
  SkeletonCard,
  Skeleton,
  SkeletonText,
} from "@/components/unisage/Skeleton";
import { UnitsRail } from "@/components/unisage/SubjectHub/UnitsRail";
import {
  ContentTabs,
  ContentTabId,
  tabMeta,
} from "@/components/unisage/SubjectHub/ContentTabs";
import { ContentList } from "@/components/unisage/SubjectHub/ContentList";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { Content } from "@/lib/types";
import type { ContentByType } from "@/lib/hooks/useSubjectContent";

export default function SubjectHubPage({
  params,
}: {
  params: { id: string };
}) {
  const { subject, isLoading: subjLoading } = useSubject(params.id);
  const { percentage, completedContent, totalContent } =
    useSubjectProgress(params.id);
  const { units, byType, isLoading } = useSubjectContent(params.id);

  const [activeUnit, setActiveUnit] = useState<string | "all">("all");
  const [activeTab, setActiveTab] = useState<ContentTabId>("long_notes");

  // Pick the first non-empty tab as default once data loads
  const defaultTab = useMemo<ContentTabId>(() => {
    const order: ContentTabId[] = [
      "long_notes",
      "short_notes",
      "flashcard",
      "quiz",
      "pyqs",
      "exam_tips",
      "paper_predictor",
      "syllabus",
      "assignments",
    ];
    return (
      (order.find(
        (t) => byType[t]?.length > 0,
      ) as ContentTabId) || "long_notes"
    );
  }, [byType]);

  // If user hasn't picked a tab and current tab has no content, snap to default
  const effectiveTab: ContentTabId =
    byType[activeTab]?.length > 0 ? activeTab : defaultTab;

  // Filter by active unit
  const visibleByType: ContentByType = useMemo(() => {
    if (activeUnit === "all") return byType;
    const empty: ContentByType = {
      long_notes: [],
      short_notes: [],
      flashcard: [],
      quiz: [],
      paper_predictor: [],
      exam_tips: [],
      pyqs: [],
      syllabus: [],
      assignments: [],
    };
    const u = units.find((x) => x.id === activeUnit);
    if (!u) return empty;
    return u.content;
  }, [activeUnit, byType, units]);

  const totalResources = Object.values(byType).flat().length;
  const visibleResources = Object.values(visibleByType).flat().length;

  return (
    <div className="min-h-screen">
      <MobileTopBar back="/learn" title={subject?.code ?? "Subject"} />

      {/* Hero */}
      <PageContainer>
        <header className="pt-6 md:pt-10 lg:pt-14 pb-8 lg:pb-10 border-b border-white/[0.05]">
          <div className="hidden lg:block mb-4">
            <Link
              href="/learn"
              className="inline-flex items-center gap-1.5 text-[12px] text-chalk-400 hover:text-[rgb(var(--fg))] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              All subjects
            </Link>
          </div>
          {subjLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-12 w-2/3" />
              <SkeletonText lines={2} />
            </div>
          ) : subject ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
              <div className="lg:col-span-8">
                <MetaCaption className="mb-3">
                  {subject.code} · YEAR {subject.year} · SEM {subject.semester}{" "}
                  · {subject.credits || 4} CREDITS
                </MetaCaption>
                <h1 className="text-[36px] md:text-[48px] lg:text-[60px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
                  {subject.name}
                </h1>
                {subject.description && (
                  <p className="mt-4 max-w-2xl text-[14.5px] lg:text-[16px] leading-relaxed text-chalk-400">
                    {subject.description}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  <Pill variant="mint">
                    <Sparkles className="h-3 w-3" /> AI workspace
                  </Pill>
                  <Pill>{units.length} units</Pill>
                  <Pill>{totalResources} resources</Pill>
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6">
                  <div className="flex items-center gap-4">
                    <MiniDonut value={percentage || 0} size={64} stroke={5} />
                    <div className="min-w-0 flex-1">
                      <MetaCaption className="mb-1">
                        Overall readiness
                      </MetaCaption>
                      <p className="text-[13px] text-chalk-300">
                        {completedContent}/{totalContent} resources cleared
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <StatTile
                      value={byType.flashcard.length}
                      label="Flashcards"
                    />
                    <StatTile value={byType.quiz.length} label="Quizzes" />
                    <StatTile value={byType.pyqs.length} label="PYQs" tone="mint" />
                    <StatTile
                      value={byType.assignments.length}
                      label="Assigned"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[14px] text-chalk-400">Subject not found.</p>
          )}
        </header>
      </PageContainer>

      {/* Workspace: sidebar + content */}
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pt-6 lg:pt-8">
          {/* Units rail */}
          <aside className="lg:col-span-3 xl:col-span-3">
            <div className="lg:sticky lg:top-6">
              {isLoading && units.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <UnitsRail
                  units={units}
                  activeUnitId={activeUnit}
                  onSelect={setActiveUnit}
                />
              )}
              {units.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/[0.05]">
                  <MetaCaption className="mb-2">In view</MetaCaption>
                  <p className="text-[13px] text-chalk-300">
                    {visibleResources} resources across{" "}
                    {Object.values(visibleByType).filter((arr) => arr.length > 0).length}{" "}
                    types
                  </p>
                  <SegmentedProgress
                    value={
                      visibleResources && totalResources
                        ? Math.round((visibleResources / totalResources) * 100)
                        : 0
                    }
                    segments={20}
                    className="mt-3"
                  />
                </div>
              )}
            </div>
          </aside>

          {/* Tabbed content */}
          <div className="lg:col-span-9 xl:col-span-9 min-w-0">
            <ContentTabs
              active={effectiveTab}
              onChange={setActiveTab}
              byType={visibleByType}
            />
            <div className="pt-6 lg:pt-8 pb-16">
              <div className="mb-5 flex items-baseline justify-between gap-2">
                <div>
                  <p className="caption">
                    {tabMeta(effectiveTab).sub}
                  </p>
                  <h2 className="mt-1 text-[22px] lg:text-[26px] font-bold tracking-[-0.005em] text-[rgb(var(--fg))]">
                    {tabMeta(effectiveTab).label}
                  </h2>
                </div>
                <p className="text-[12px] text-chalk-500">
                  {visibleByType[effectiveTab]?.length ?? 0} item
                  {visibleByType[effectiveTab]?.length === 1 ? "" : "s"}
                </p>
              </div>

              {isLoading && totalResources === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} className="h-44" />
                  ))}
                </div>
              ) : (
                <ContentList
                  type={effectiveTab}
                  items={visibleByType[effectiveTab] || []}
                />
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
