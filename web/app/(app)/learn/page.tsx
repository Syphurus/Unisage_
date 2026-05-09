"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useProgress } from "@/lib/hooks/useProgress";
import { useAuth } from "@/lib/hooks/useAuth";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  TabStrip,
  SegmentedProgress,
  MetaCaption,
} from "@/components/unisage/primitives";
import { Filter } from "lucide-react";
import type { Subject } from "@/lib/types";

type SortMode = "urgency" | "weakness" | "yield" | "frequency";

const TABS: { id: SortMode; label: string }[] = [
  { id: "urgency", label: "Urgency" },
  { id: "weakness", label: "Weakness" },
  { id: "yield", label: "Marks yield" },
  { id: "frequency", label: "Repeat freq" },
];

export default function LearnPage() {
  const { user } = useAuth();
  const { subjects, isLoading } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const { progress } = useProgress();
  const [sort, setSort] = useState<SortMode>("urgency");

  const enriched = useMemo(() => {
    return subjects.map((s: Subject) => {
      const subjectProgress = progress.filter(
        (p: any) => p.subjectId === s.id || p.subject?.id === s.id,
      );
      const completed = subjectProgress.filter(
        (p: any) => p.completed || p.percentage >= 100,
      ).length;
      const total = Math.max(subjectProgress.length, 1);
      const pct = Math.round((completed / total) * 100);
      const repeats = Math.floor(8 + (s.credits || 4) * 1.5);
      const weak = Math.max(0, 4 - Math.floor(pct / 25));
      const marks = Math.round(60 + pct * 0.4);
      return { subject: s, pct, repeats, weak, marks };
    });
  }, [subjects, progress]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sort === "urgency") return arr.sort((a, b) => a.pct - b.pct);
    if (sort === "weakness") return arr.sort((a, b) => b.weak - a.weak);
    if (sort === "yield") return arr.sort((a, b) => b.marks - a.marks);
    return arr.sort((a, b) => b.repeats - a.repeats);
  }, [enriched, sort]);

  return (
    <div className="min-h-screen">
      <TopHeader
        caption={`${subjects.length} SUBJECTS · PRIORITIZED`}
        title="Learn"
        showSearch
        showTheme
      />

      <div className="px-5">
        <TabStrip<SortMode>
          tabs={TABS}
          active={sort}
          onChange={setSort}
          className="-mx-5 px-5"
        />
      </div>

      <div className="px-5 mt-6">
        {isLoading && subjects.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-chalk-500">
            Loading subjects…
          </p>
        ) : subjects.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-chalk-500">
            No subjects found for {user?.collegeCode} · {user?.branchCode} ·
            sem {user?.semester}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {sorted.map((row) => {
              const tone =
                row.pct >= 75 ? "mint" : row.pct >= 50 ? "ember" : "flame";
              const status =
                tone === "mint" ? "READY" : tone === "ember" ? "WARM" : "HOT";
              const urgency =
                row.pct >= 75
                  ? "Confident"
                  : row.pct >= 50
                    ? "In review"
                    : "Critical";
              return (
                <li key={row.subject.id}>
                  <Link
                    href={`/subjects/${row.subject.id}`}
                    className="block py-5"
                  >
                    <MetaCaption className="mb-1.5">
                      <span>
                        {row.subject.code} · IN 5 DAYS ·{" "}
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
                      </span>
                    </MetaCaption>
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-[18px] font-semibold leading-tight text-[rgb(var(--fg))]">
                        {row.subject.name}
                      </p>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-[20px] font-bold leading-none ${
                            tone === "mint"
                              ? "text-mint"
                              : tone === "ember"
                                ? "text-ember-400"
                                : "text-flame-500"
                          }`}
                        >
                          {row.pct}%
                        </p>
                        <p
                          className={`mt-0.5 text-[9px] font-bold uppercase tracking-cap ${
                            tone === "mint"
                              ? "text-mint-400"
                              : tone === "ember"
                                ? "text-ember-400"
                                : "text-flame-500"
                          }`}
                        >
                          {status}
                        </p>
                      </div>
                    </div>
                    <SegmentedProgress
                      value={row.pct}
                      tone={tone}
                      className="mt-3"
                    />
                    <p className="mt-2 text-[11px] text-chalk-400">
                      {row.repeats} repeats · {row.weak} weak · {row.marks} marks
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
