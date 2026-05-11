"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useAuth } from "@/lib/hooks/useAuth";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject } from "@/lib/types";
import { MobileTopBar, PageHeader } from "@/components/unisage/AppShell";
import { PageContainer, Section } from "@/components/unisage/PageContainer";
import {
  Pill,
  SectionHeader,
  StatTile,
} from "@/components/unisage/primitives";
import { SkeletonCard } from "@/components/unisage/Skeleton";
import { Clock, Plus, Check } from "lucide-react";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects(
    user?.semester
      ? {
          year: user.year,
          semester: user.semester,
          cacheKey: user.specialization || "no-specialization",
        }
      : undefined,
  );
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjects.length === 0) return;
    let alive = true;
    setLoading(true);
    Promise.all(
      subjects.map((s: Subject) =>
        subjectsAPI
          .getContent(s.id)
          .then((res: any) => ({ subject: s, res }))
          .catch(() => ({ subject: s, res: null })),
      ),
    ).then((results) => {
      if (!alive) return;
      const all: Content[] = [];
      results.forEach(({ subject, res }) => {
        const data = res?.data || res;
        const list: any[] = Array.isArray(data?.content?.assignments)
          ? data.content.assignments
          : [];
        list.forEach((it) =>
          all.push({
            ...it,
            type: "assignments" as const,
            unit: it.unit ?? {
              id: "",
              title: "",
              subject: {
                id: subject.id,
                name: subject.name,
                code: subject.code,
              },
            },
          }),
        );
      });
      setItems(all);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [subjects]);

  const todo = useMemo(
    () => items.filter((c) => !((c.data as any)?.submitted)),
    [items],
  );
  const done = useMemo(
    () => items.filter((c) => (c.data as any)?.submitted),
    [items],
  );
  const dueSoon = useMemo(
    () =>
      todo.filter((c) => {
        const d = (c.data as any)?.dueInDays;
        return typeof d === "number" && d <= 2;
      }),
    [todo],
  );

  return (
    <div className="min-h-screen">
      <MobileTopBar title="Assignments" />

      <PageContainer>
        <Section density="compact" className="!pt-6 md:!pt-10 lg:!pt-14">
          <PageHeader
            caption={`${items.length} ACTIVE · ${todo.length} TO DO`}
            title="Assignments"
            description="Track every submission across subjects. Cards turn red within 48h of due time."
            actions={
              <button className="hidden md:inline-flex items-center gap-2 rounded-pill bg-mint-500 px-4 py-2 text-[13px] font-semibold text-ink-950 hover:bg-mint-400 transition-colors">
                <Plus className="h-4 w-4" /> New
              </button>
            }
          />
        </Section>
      </PageContainer>

      <PageContainer>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 pb-6">
          <StatTile value={items.length} label="Total" />
          <StatTile value={todo.length} label="To do" tone="mint" />
          <StatTile value={done.length} label="Done" />
          <StatTile
            value={dueSoon.length}
            label="Due soon"
            tone={dueSoon.length > 0 ? "flame" : "default"}
          />
        </div>
      </PageContainer>

      <PageContainer>
        <Section density="compact">
          <SectionHeader title="To do" meta={`active · ${todo.length}`} />
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} className="h-32" />
              ))
            ) : todo.length === 0 ? (
              <p className="col-span-full py-8 text-center text-[13px] text-chalk-500">
                Nothing pending. Nice.
              </p>
            ) : (
              todo.map((a) => <AssignmentRow key={a.id} c={a} />)
            )}
          </div>
        </Section>
      </PageContainer>

      {done.length > 0 && (
        <PageContainer>
          <Section density="compact">
            <SectionHeader title="Submitted" meta={`done · ${done.length}`} />
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
              {done.map((a) => (
                <AssignmentRow key={a.id} c={a} done />
              ))}
            </div>
          </Section>
        </PageContainer>
      )}
    </div>
  );
}

function AssignmentRow({ c, done }: { c: Content; done?: boolean }) {
  const data = c.data as any;
  const minutes = data?.estimatedMinutes ?? data?.duration ?? 60;
  const dueIn = data?.dueInDays;
  const tone =
    typeof dueIn === "number"
      ? dueIn <= 2
        ? "flame"
        : dueIn <= 5
          ? "ember"
          : "default"
      : "default";

  return (
    <Link
      href={`/content/${c.id}`}
      className="group block rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]"
    >
      <div className="flex items-center justify-between gap-2">
        <Pill>{c.unit?.subject?.code ?? "—"}</Pill>
        {done ? (
          <Pill variant="mint">
            <Check className="h-3 w-3" /> Submitted
          </Pill>
        ) : data?.inProgress ? (
          <Pill variant="mint">In progress</Pill>
        ) : null}
      </div>
      <p className="mt-3 text-[15px] font-semibold text-[rgb(var(--fg))]">
        {c.title}
      </p>
      <div className="mt-3 flex items-center gap-3 text-[11.5px] text-chalk-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {minutes} min
        </span>
        {typeof dueIn === "number" && !done && (
          <span
            className={
              tone === "flame"
                ? "text-flame-500"
                : tone === "ember"
                  ? "text-ember-400"
                  : "text-chalk-400"
            }
          >
            · Due in {dueIn} day{dueIn === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </Link>
  );
}
