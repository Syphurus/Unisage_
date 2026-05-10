"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useProgress } from "@/lib/hooks/useProgress";
import { useAuth } from "@/lib/hooks/useAuth";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject } from "@/lib/types";
import { MobileTopBar, PageHeader } from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
import {
  Pill,
  HighlightCard,
  SectionHeader,
  SegmentedProgress,
  MetaCaption,
} from "@/components/unisage/primitives";
import { SkeletonCard } from "@/components/unisage/Skeleton";
import { ArrowRight, Sparkles } from "lucide-react";

const BLOCK_TYPES: Record<
  string,
  { label: string; minutes: number }
> = {
  flashcard: { label: "Recall", minutes: 25 },
  quiz: { label: "Lab", minutes: 15 },
  long_notes: { label: "Long", minutes: 20 },
  short_notes: { label: "Short", minutes: 10 },
  pyqs: { label: "Mock", minutes: 15 },
  paper_predictor: { label: "Mock", minutes: 30 },
  exam_tips: { label: "Tactics", minutes: 8 },
};

export default function CuratorPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const { progress } = useProgress();
  const [pool, setPool] = useState<Content[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);

  useEffect(() => {
    if (subjects.length === 0) return;
    let alive = true;
    setPoolLoading(true);
    Promise.all(
      subjects.map((s: Subject) => subjectsAPI.getContent(s.id)),
    ).then((results) => {
      if (!alive) return;
      const all: Content[] = [];
      results.forEach((res: any) => {
        const data = res?.data || res;
        const items = Array.isArray(data?.content)
          ? data.content
          : data?.content
            ? Object.values(data.content).flat()
            : [];
        all.push(...(items as Content[]));
      });
      setPool(all);
      setPoolLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [subjects]);

  const plan = useMemo(() => {
    if (pool.length === 0) return [];
    const completed = new Set(
      progress.filter((p: any) => p.completed).map((p: any) => p.contentId),
    );
    const incomplete = pool.filter((c) => !completed.has(c.id));
    const order = [
      "flashcard",
      "quiz",
      "short_notes",
      "pyqs",
      "long_notes",
      "exam_tips",
    ];
    return [...incomplete]
      .sort((a, b) => {
        const ai = order.indexOf(a.type);
        const bi = order.indexOf(b.type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .slice(0, 5);
  }, [pool, progress]);

  const totalMinutes = plan.reduce((sum, b) => {
    const t = BLOCK_TYPES[b.type] || { minutes: 15 };
    return sum + t.minutes;
  }, 0);

  const currentReadiness = useMemo(() => {
    if (progress.length === 0) return 54;
    const completed = progress.filter((p: any) => p.completed).length;
    return Math.min(85, Math.round((completed / progress.length) * 100));
  }, [progress]);

  const projectedReadiness = Math.min(100, currentReadiness + 13);
  const startTimes = ["06:00", "06:25", "06:45", "07:05", "07:20"];

  return (
    <div className="min-h-screen">
      <MobileTopBar title="Curator" />

      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <PageHeader
            caption="AI · ADAPTIVE · TODAY"
            title="Curator"
            description="A daily plan re-sequenced by memory decay, exam date, and marks-per-minute. The AI rebuilds your schedule every time you complete a block."
            actions={
              <Pill variant="mint">
                <Sparkles className="h-3 w-3" />
                Regenerated 4 min ago
              </Pill>
            }
          />
        </Section>
      </PageContainer>

      {/* Hero card + Yield projection (split on lg) */}
      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="lg:col-span-2">
            <HighlightCard
              caption={
                <>
                  <span className="text-mint-400">TODAY&apos;S PLAN</span> ·{" "}
                  {totalMinutes} MIN
                </>
              }
              dot="mint"
            >
              <h2 className="text-[24px] md:text-[28px] lg:text-[32px] font-bold leading-tight tracking-[-0.005em] text-[rgb(var(--fg))]">
                {plan.length} blocks lift readiness from{" "}
                <span className="text-mint">{currentReadiness}</span> →{" "}
                <span className="text-mint">{projectedReadiness}%</span>.
              </h2>
              <p className="mt-3 text-[13.5px] lg:text-[14px] leading-relaxed text-chalk-400 max-w-2xl">
                Sequenced by memory decay, exam date, and marks-per-minute
                yield. Each block is the highest-leverage action right now.
              </p>
              {plan[0] && (
                <Link href={`/content/${plan[0].id}`} className="contents">
                  <button className="pill pill-mint-solid mt-5 inline-flex">
                    Start block 1 <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              )}
            </HighlightCard>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 h-full">
              <div className="flex items-center justify-between gap-2">
                <MetaCaption>Readiness · today</MetaCaption>
                <Pill variant="mint">
                  +{projectedReadiness - currentReadiness} pts
                </Pill>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-1.5 text-[11.5px] text-chalk-400">
                    Now · {currentReadiness}%
                  </p>
                  <SegmentedProgress
                    value={currentReadiness}
                    segments={28}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11.5px] text-mint-400">
                    After plan · {projectedReadiness}%
                  </p>
                  <SegmentedProgress
                    value={projectedReadiness}
                    segments={28}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Sequence */}
      <PageContainer>
        <Section density="compact">
          <SectionHeader title="Sequence" meta={`${plan.length} blocks`} />
          {poolLoading ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} className="h-32" />
              ))}
            </div>
          ) : plan.length === 0 ? (
            <p className="mt-5 py-10 text-center text-[13px] text-chalk-500">
              No blocks scheduled yet — keep your subjects active to seed a
              plan.
            </p>
          ) : (
            <ol className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {plan.map((block, i) => {
                const cfg = BLOCK_TYPES[block.type] || {
                  label: "Block",
                  minutes: 15,
                };
                const isFirst = i === 0;
                return (
                  <li key={block.id}>
                    <Link
                      href={`/content/${block.id}`}
                      className="group flex h-full flex-col rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 transition-all hover:border-mint-500/30 hover:bg-[rgb(var(--bg-subtle))]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold tabular-nums ${
                              isFirst
                                ? "bg-mint-500 text-ink-950"
                                : "border border-white/[0.1] bg-[rgb(var(--bg))] text-chalk-400"
                            }`}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[10.5px] font-mono text-chalk-500">
                            {startTimes[i] || "07:30"}
                          </span>
                        </div>
                        <Pill variant="mint">{cfg.label}</Pill>
                      </div>
                      <p className="mt-4 text-[15px] font-semibold leading-snug text-[rgb(var(--fg))]">
                        {block.title}
                      </p>
                      <p className="mt-1 text-[11.5px] text-chalk-400">
                        {block.unit?.subject?.code} · {block.unit?.title}
                      </p>
                      <div className="mt-auto pt-5 flex items-center justify-between text-[12px]">
                        <span className="text-chalk-400">
                          {cfg.minutes} min
                        </span>
                        <span className="inline-flex items-center text-chalk-300 group-hover:text-mint-400 transition-colors">
                          Run
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>
      </PageContainer>
    </div>
  );
}
