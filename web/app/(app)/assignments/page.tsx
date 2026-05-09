"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useAuth } from "@/lib/hooks/useAuth";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject } from "@/lib/types";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  SectionHeader,
} from "@/components/unisage/primitives";
import { Clock, Plus, Check } from "lucide-react";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { subjects } = useSubjects(
    user?.semester ? { year: user.year, semester: user.semester } : undefined,
  );
  const [items, setItems] = useState<Content[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all(subjects.map((s: Subject) => subjectsAPI.getContent(s.id))).then(
      (results) => {
        if (!alive) return;
        const all: Content[] = [];
        results.forEach((res: any) => {
          const data = res?.data || res;
          const list = Array.isArray(data?.content)
            ? data.content
            : data?.content
              ? Object.values(data.content).flat()
              : [];
          all.push(...(list as Content[]));
        });
        setItems(all.filter((c) => c.type === "assignments"));
      },
    );
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

  return (
    <div className="min-h-screen">
      <TopHeader
        caption={`${items.length} ACTIVE · ${todo.length} TO DO`}
        title="Assignments"
        rightIcon={<Plus className="h-4 w-4" />}
        showTheme
      />

      <section className="px-5 md:px-8 lg:px-12">
        <SectionHeader title="To do" meta={`active · ${todo.length}`} />
        <ul className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {todo.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-chalk-500">
              Nothing pending. Nice.
            </li>
          ) : (
            todo.map((a) => <AssignmentRow key={a.id} c={a} />)
          )}
        </ul>
      </section>

      {done.length > 0 && (
        <section className="px-5 pt-7 pb-4 md:px-8 lg:px-12">
          <SectionHeader title="Submitted" meta={`done · ${done.length}`} />
          <ul className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {done.map((a) => (
              <AssignmentRow key={a.id} c={a} done />
            ))}
          </ul>
        </section>
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
    <li>
      <Link
        href={`/content/${c.id}`}
        className="block rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4 transition-colors hover:bg-[rgb(var(--bg-subtle))]"
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
        <p className="mt-2 text-[14px] font-semibold text-[rgb(var(--fg))]">
          {c.title}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-chalk-400">
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
    </li>
  );
}
