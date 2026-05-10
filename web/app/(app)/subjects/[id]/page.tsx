"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubject } from "@/lib/hooks/useSubjects";
import { useSubjectProgress } from "@/lib/hooks/useProgress";
import { useSubjectContent } from "@/lib/hooks/useSubjectContent";
import { useStudySession } from "@/lib/hooks/useStudySession";
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
import { tabMeta } from "@/components/unisage/SubjectHub/ContentTabs";
import { ContentList } from "@/components/unisage/SubjectHub/ContentList";
import { ChevronLeft, Sparkles, RefreshCw } from "lucide-react";
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
  // Bracket time spent on this subject hub with a server-side session row.
  // The hook handles start/end via fetch-keepalive on unload.
  useStudySession(params.id);
  const { units, byType, isLoading, mutate } = useSubjectContent(params.id);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  // visibleByType is same as byType now (no unit filtering)
  const visibleByType: ContentByType = byType;

  const totalResources = Object.values(byType).flat().length;
  const visibleResources = Object.values(visibleByType).flat().length;

  return (
    <div className="min-h-screen">
      <MobileTopBar back="/learn" title={subject?.code ?? "Subject"} />

      {/* Hero */}
      <PageContainer>
        <header className="pt-6 md:pt-10 lg:pt-14 pb-8 lg:pb-10 border-b border-white/[0.05]">
          <div className="hidden lg:block mb-4 flex items-center gap-3">
            <Link
              href="/learn"
              className="inline-flex items-center gap-1.5 text-[12px] text-chalk-400 hover:text-[rgb(var(--fg))] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              All subjects
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-[12px] text-chalk-400 hover:text-[rgb(var(--fg))] transition-colors disabled:opacity-50"
              title="Refresh content"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
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
          {/* Units removed per request — content area expanded */}

          {/* Tabbed content */}
          <div className="lg:col-span-12 xl:col-span-12 min-w-0">
            {/* Expanded top bar: All / Long notes / Short notes / Flashcards / Quiz / Exam tips / PYQs / Syllabus / Assignments */}
            <div className="border-b border-white/[0.06] sticky top-0 z-10 bg-[rgb(var(--bg))]/85 backdrop-blur-md -mx-5 md:-mx-8 lg:-mx-10 xl:-mx-14 px-5 md:px-8 lg:px-10 xl:px-14 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 items-center py-3">
                {[
                  { id: "all", label: "All" },
                  { id: "long_notes", label: "Long notes" },
                  { id: "short_notes", label: "Short notes" },
                  { id: "flashcard", label: "Flashcards" },
                  { id: "quiz", label: "Quiz" },
                  { id: "exam_tips", label: "Exam tips" },
                  { id: "pyqs", label: "PYQs" },
                  { id: "syllabus", label: "Syllabus" },
                  { id: "assignments", label: "Assignments" },
                ].map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`relative inline-flex items-center gap-2 px-4 py-3 text-[13px] font-medium ${isActive ? "text-mint-400" : "text-chalk-300"}`}
                    >
                      <span>{t.label}</span>
                      {isActive && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-mint-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-6 lg:pt-8 pb-16">
              <div className="mb-5 flex items-baseline justify-between gap-2">
                <div>
                  {(() => {
                    if (activeTab === "all") return <p className="caption">All content</p>;
                    const meta = tabMeta(activeTab as ContentTabId);
                    return <p className="caption">{meta?.sub || ""}</p>;
                  })()}
                  <h2 className="mt-1 text-[22px] lg:text-[26px] font-bold tracking-[-0.005em] text-[rgb(var(--fg))]">
                    {activeTab === "all" ? "All" : (tabMeta(activeTab as ContentTabId)?.label || activeTab)}
                  </h2>
                </div>
                <p className="text-[12px] text-chalk-500">
                  {activeTab === "all" ? Object.values(visibleByType).flat().length : (visibleByType[activeTab as keyof ContentByType]?.length ?? 0)} item{(activeTab === "all" ? Object.values(visibleByType).flat().length : (visibleByType[activeTab as keyof ContentByType]?.length ?? 0)) === 1 ? "" : "s"}
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
                  type={activeTab as ContentTabId}
                  items={
                    activeTab === "all"
                      ? Object.values(visibleByType).flat()
                      : visibleByType[activeTab as keyof ContentByType] || []
                  }
                />
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
