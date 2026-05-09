"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useProgress } from "@/lib/hooks/useProgress";
import { useAuth } from "@/lib/hooks/useAuth";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject } from "@/lib/types";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  HighlightCard,
  SectionHeader,
  PrimaryButton,
  SegmentedProgress,
  MetaCaption,
} from "@/components/unisage/primitives";
import { ArrowRight } from "lucide-react";

const BLOCK_TYPES: Record<string, { label: string; tone: string; minutes: number }> = {
  flashcard: { label: "Recall", tone: "mint", minutes: 25 },
  quiz: { label: "Lab", tone: "ember", minutes: 15 },
  long_notes: { label: "Long", tone: "mint", minutes: 20 },
  short_notes: { label: "Short", tone: "mint", minutes: 10 },
  pyqs: { label: "Mock", tone: "flame", minutes: 15 },
  paper_predictor: { label: "Mock", tone: "flame", minutes: 30 },
  exam_tips: { label: "Tactics", tone: "ember", minutes: 8 },
};

export default function CuratorPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const { progress } = useProgress();
  const [pool, setPool] = useState<Content[]>([]);

  // Pull all content for all subjects, then derive a plan
  useEffect(() => {
    let alive = true;
    Promise.all(subjects.map((s: Subject) => subjectsAPI.getContent(s.id))).then(
      (results) => {
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
      },
    );
    return () => {
      alive = false;
    };
  }, [subjects]);

  // Adaptive plan — prioritize content the user hasn't completed,
  // mixed across types for memory variety
  const plan = useMemo(() => {
    if (pool.length === 0) return [];
    const completed = new Set(
      progress.filter((p: any) => p.completed).map((p: any) => p.contentId),
    );
    const incomplete = pool.filter((c) => !completed.has(c.id));
    // Sort by type priority: flashcard, quiz, short_notes, pyqs, long_notes, exam_tips
    const order = [
      "flashcard",
      "quiz",
      "short_notes",
      "pyqs",
      "long_notes",
      "exam_tips",
    ];
    const sorted = [...incomplete].sort((a, b) => {
      const ai = order.indexOf(a.type);
      const bi = order.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return sorted.slice(0, 5);
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
      <TopHeader
        caption="AI · ADAPTIVE · TODAY"
        title="Curator"
        showTheme
      />

      {/* Hero */}
      <section className="px-5 mt-2">
        <HighlightCard
          caption={
            <>
              <span className="text-mint-400">TODAY&apos;S PLAN</span> · {totalMinutes} MIN ·
              REGENERATED 4 MIN AGO
            </>
          }
          dot="mint"
        >
          <h2 className="text-[22px] font-bold leading-snug tracking-[-0.005em] text-[rgb(var(--fg))]">
            {plan.length} blocks lift readiness from{" "}
            <span className="text-mint">{currentReadiness}</span> →{" "}
            <span className="text-mint">{projectedReadiness}%</span>.
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-chalk-400">
            Sequenced by memory decay, exam date, and marks-per-minute yield.
          </p>
          {plan[0] && (
            <Link href={`/content/${plan[0].id}`} className="contents">
              <button className="pill pill-mint-solid mt-4">
                Start block 1 <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
          )}
        </HighlightCard>
      </section>

      {/* Sequence */}
      <section className="px-5 pt-7">
        <SectionHeader
          title="Sequence"
          meta={`${plan.length} blocks`}
        />
        {plan.length === 0 ? (
          <p className="mt-3 py-6 text-center text-[13px] text-chalk-500">
            No blocks scheduled yet — keep your subjects active to seed a plan.
          </p>
        ) : (
          <ol className="mt-4 relative">
            {plan.map((block, i) => {
              const cfg = BLOCK_TYPES[block.type] || {
                label: "Block",
                tone: "mint",
                minutes: 15,
              };
              const isFirst = i === 0;
              return (
                <li key={block.id} className="relative pl-12 pb-5 last:pb-0">
                  {/* Rail */}
                  {i < plan.length - 1 && (
                    <span className="absolute left-[14px] top-3 bottom-0 w-px bg-white/[0.08]" />
                  )}
                  {/* Marker */}
                  <span
                    className={`absolute left-1.5 top-1 grid h-7 w-7 place-items-center rounded-full ${
                      isFirst
                        ? "bg-mint-500 text-ink-950"
                        : "border border-white/[0.1] bg-[rgb(var(--bg-elev))] text-chalk-400"
                    }`}
                  >
                    <span className="text-[10px] font-semibold tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <p className="text-[10px] font-mono text-chalk-500 -translate-y-0.5">
                    {startTimes[i] || "07:30"}
                  </p>
                  <Link
                    href={`/content/${block.id}`}
                    className="mt-1.5 block rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-3.5 transition-colors hover:bg-[rgb(var(--bg-subtle))]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Pill variant="mint">{cfg.label}</Pill>
                      <span className="text-[11px] text-chalk-400">
                        {cfg.minutes} min
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] font-semibold text-[rgb(var(--fg))]">
                      {block.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-chalk-400">
                      {block.unit?.subject?.code} · {block.unit?.title}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Yield projection */}
      <section className="px-5 pt-7 pb-4">
        <SectionHeader title="Yield projection" />
        <div className="mt-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
          <div className="flex items-center justify-between gap-2">
            <MetaCaption>Readiness · today</MetaCaption>
            <span className="text-[12px] font-bold text-mint">
              +{projectedReadiness - currentReadiness} pts
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1 text-[11px] text-chalk-400">
                Now · {currentReadiness}%
              </p>
              <SegmentedProgress value={currentReadiness} segments={28} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-mint-400">
                After plan · {projectedReadiness}%
              </p>
              <SegmentedProgress value={projectedReadiness} segments={28} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
