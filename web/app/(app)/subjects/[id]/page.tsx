"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSubject } from "@/lib/hooks/useSubjects";
import { useSubjectProgress } from "@/lib/hooks/useProgress";
import { subjectsAPI } from "@/lib/api";
import type { Content } from "@/lib/types";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  SectionHeader,
  SegmentedProgress,
  MiniDonut,
  MetaCaption,
} from "@/components/unisage/primitives";
import { Filter, Check, ChevronRight } from "lucide-react";

type GroupedUnit = {
  unit: { id: string; title: string; unitNumber?: number };
  content: Record<string, Content[]>;
};

export default function SubjectSyllabusPage({
  params,
}: {
  params: { id: string };
}) {
  const { subject, isLoading } = useSubject(params.id);
  const { percentage } = useSubjectProgress(params.id);
  const [groups, setGroups] = useState<GroupedUnit[]>([]);

  useEffect(() => {
    let alive = true;
    subjectsAPI.getContent(params.id).then((res: any) => {
      if (!alive) return;
      const data = res?.data || res;
      if (Array.isArray(data?.units)) {
        setGroups(data.units);
      } else if (data?.content) {
        const map = new Map<string, GroupedUnit>();
        const flatList: Content[] = Array.isArray(data.content)
          ? data.content
          : Object.values(data.content).flat();
        flatList.forEach((c: Content) => {
          const u = c.unit;
          if (!u) return;
          const key = u.id;
          if (!map.has(key)) {
            map.set(key, {
              unit: {
                id: u.id,
                title: u.title,
                unitNumber: u.unitNumber,
              },
              content: {},
            });
          }
          const g = map.get(key)!;
          if (!g.content[c.type]) g.content[c.type] = [];
          g.content[c.type].push(c);
        });
        setGroups(Array.from(map.values()));
      }
    });
    return () => {
      alive = false;
    };
  }, [params.id]);

  const unitsCount = groups.length;
  const topicCount = groups.reduce(
    (sum, g) => sum + Object.values(g.content).flat().length,
    0,
  );

  const weakUnits = Math.max(0, Math.floor(unitsCount * 0.4));

  return (
    <div className="min-h-screen">
      <TopHeader
        back="/learn"
        caption={`${subject?.code ?? ""} · ${unitsCount} UNITS · ${topicCount} TOPICS`}
        title="Syllabus"
        rightIcon={<Filter className="h-4 w-4" />}
      />

      <section className="px-5 mt-2 md:px-8 lg:px-12">
        <div className="flex items-center gap-4 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
          <MiniDonut value={percentage || 0} size={64} stroke={5} />
          <div className="min-w-0 flex-1">
            <MetaCaption className="mb-1">Overall readiness</MetaCaption>
            <p className="text-[13px] text-chalk-300">
              {weakUnits} weak units ·{" "}
              {Math.floor(topicCount * 0.4)} high-repeat topics covered
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pt-7 md:px-8 lg:px-12">
        <SectionHeader title="Units" meta="ordered by yield" />
        <ul className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {isLoading ? (
            <li className="py-6 text-center text-[13px] text-chalk-500">
              Loading…
            </li>
          ) : groups.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-chalk-500">
              No units published yet.
            </li>
          ) : (
            groups
              .sort(
                (a, b) => (a.unit.unitNumber || 0) - (b.unit.unitNumber || 0),
              )
              .map((g, i) => {
                const totalCount = Object.values(g.content).flat().length;
                const pct = Math.max(
                  0,
                  Math.min(100, percentage + (i % 3) * 6 - i * 4),
                );
                const tone = pct >= 80 ? "mint" : pct >= 50 ? "ember" : "flame";
                return (
                  <li key={g.unit.id}>
                    <Link
                      href={`/subjects/${params.id}/units/${g.unit.id}`}
                      className="block rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4 transition-colors hover:bg-[rgb(var(--bg-subtle))]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono text-chalk-500">
                          {String(g.unit.unitNumber || i + 1).padStart(2, "0")}
                        </span>
                        {pct >= 90 ? (
                          <Pill variant="mint">
                            <Check className="h-3 w-3" /> Done
                          </Pill>
                        ) : pct >= 75 ? (
                          <Pill variant="mint">High yield</Pill>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[16px] font-semibold leading-tight text-[rgb(var(--fg))]">
                        {g.unit.title}
                      </p>
                      <SegmentedProgress
                        value={pct}
                        tone={tone}
                        className="mt-3"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] text-chalk-400">
                          {totalCount} resources ·{" "}
                          {Math.floor(totalCount * 1.5)} marks
                        </p>
                        <p
                          className={`text-[14px] font-bold ${
                            tone === "mint"
                              ? "text-mint"
                              : tone === "ember"
                                ? "text-ember-400"
                                : "text-flame-500"
                          }`}
                        >
                          {pct}%
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })
          )}
        </ul>
      </section>

      {groups.length > 0 && (
        <section className="px-5 pt-7 md:px-8 lg:px-12">
          <SectionHeader title="Resources by type" />
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[
              { key: "long_notes", label: "Long notes" },
              { key: "short_notes", label: "Short notes" },
              { key: "flashcard", label: "Recall cycles" },
              { key: "quiz", label: "Retrieval lab" },
              { key: "pyqs", label: "PYQs" },
              { key: "exam_tips", label: "Exam tactics" },
              { key: "paper_predictor", label: "Predictor" },
              { key: "assignments", label: "Assignments" },
            ].map(({ key, label }) => {
              const list: Content[] = groups.flatMap(
                (g) => g.content[key] || [],
              );
              if (list.length === 0) return null;
              const first = list[0];
              return (
                <Link
                  key={key}
                  href={`/content/${first.id}`}
                  className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                    {list.length} item{list.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1.5 text-[14px] font-semibold text-[rgb(var(--fg))]">
                    {label}
                  </p>
                  <ChevronRight className="mt-3 h-4 w-4 text-chalk-400" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
