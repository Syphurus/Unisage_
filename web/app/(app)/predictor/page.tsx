"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useAuth } from "@/lib/hooks/useAuth";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject } from "@/lib/types";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  SectionHeader,
  AnnotationBlock,
  PrimaryButton,
  OutlineButton,
} from "@/components/unisage/primitives";
import { ArrowRight } from "lucide-react";

export default function PredictorPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const [activeId, setActiveId] = useState<string>("");
  const [predictors, setPredictors] = useState<
    Record<string, Content[]>
  >({});

  // Default first subject
  useEffect(() => {
    if (!activeId && subjects.length > 0) setActiveId(subjects[0].id);
  }, [activeId, subjects]);

  // Load all predictor content for each subject
  useEffect(() => {
    let alive = true;
    Promise.all(
      subjects.map((s: Subject) => subjectsAPI.getContent(s.id)),
    ).then((results) => {
      if (!alive) return;
      const map: Record<string, Content[]> = {};
      results.forEach((res: any, i: number) => {
        const data = res?.data || res;
        const content = Array.isArray(data?.content)
          ? data.content
          : data?.content
            ? Object.values(data.content).flat()
            : [];
        const filtered = (content as Content[]).filter(
          (c) => c.type === "paper_predictor",
        );
        map[subjects[i].id] = filtered;
      });
      setPredictors(map);
    });
    return () => {
      alive = false;
    };
  }, [subjects]);

  const active = subjects.find((s) => s.id === activeId);
  const list = predictors[activeId] || [];

  return (
    <div className="min-h-screen">
      <TopHeader
        caption="PREDICTED PAPER · 8-CYCLE MODEL"
        title="Intelligence"
        showTheme
      />

      {/* Subject tabs (underline style) */}
      <div className="px-5">
        <div className="flex gap-5 overflow-x-auto scrollbar-none border-b border-white/[0.06]">
          {subjects.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`relative shrink-0 pb-2.5 text-[12px] font-semibold uppercase tracking-cap ${
                  active ? "text-mint-400" : "text-chalk-400"
                }`}
              >
                {s.code}
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-mint-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!active ? (
        <p className="px-5 pt-8 text-[13px] text-chalk-400">
          Loading subjects…
        </p>
      ) : (
        <div className="px-5 pt-6">
          <p className="caption mb-1">
            {active.code}-{active.semester}01 / 2017–2024
          </p>
          <h2 className="text-[28px] font-bold tracking-[-0.01em] text-[rgb(var(--fg))]">
            {active.name}
          </h2>
          <p className="mt-1 text-[13px] text-chalk-400">
            End-Semester Examination · Predicted
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
            <Stat label="Time" value="3 hours" />
            <Stat label="Marks" value="100" />
            <Stat label="Confidence" value="88%" tone="mint" />
          </div>

          <SectionHeader
            className="mt-7"
            title="Available papers"
            meta={`${list.length} on file`}
          />
          <ul className="mt-3 space-y-3">
            {list.length === 0 ? (
              <li className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4 text-center text-[13px] text-chalk-400">
                Predictor papers for this subject are still cooking.
              </li>
            ) : (
              list.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/content/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4 transition-colors hover:bg-[rgb(var(--bg-subtle))]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                        PAPER · {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-0.5 text-[14px] font-semibold text-[rgb(var(--fg))]">
                        {c.title}
                      </p>
                    </div>
                    <Pill variant="mint">Open</Pill>
                  </Link>
                </li>
              ))
            )}
          </ul>

          <SectionHeader className="mt-8" title="What's inside" />
          <div className="mt-3 space-y-2.5">
            <AnnotationBlock label="Common trap" tone="flame">
              Past-year traps that cost students 4+ marks.
            </AnnotationBlock>
            <AnnotationBlock label="PYQ evidence" tone="mint">
              Cycle-by-cycle proof of recurring sub-questions.
            </AnnotationBlock>
            <AnnotationBlock label="Strategic note" tone="mint">
              Time budget &amp; sequencing tactics per question.
            </AnnotationBlock>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {list[0] && (
              <Link href={`/content/${list[0].id}`} className="contents">
                <PrimaryButton type="button">
                  Drill this paper <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
              </Link>
            )}
            <Link href="/learn" className="contents">
              <OutlineButton type="button">View sources</OutlineButton>
            </Link>
          </div>

          <p className="mt-6 text-center text-[10px] uppercase tracking-cap text-chalk-500">
            END · UNISAGE INTELLIGENCE MODEL · v8.2
          </p>
          <p className="mt-2 text-center text-[11px] text-chalk-400 px-4">
            Reconstructed from past papers and posterior probability models.
            For revision focus only.
          </p>
        </div>
      )}
    </div>
  );
}

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
      <p className="caption mb-1">{label}</p>
      <p
        className={`text-[15px] font-bold ${tone === "mint" ? "text-mint" : "text-[rgb(var(--fg))]"}`}
      >
        {value}
      </p>
    </div>
  );
}
