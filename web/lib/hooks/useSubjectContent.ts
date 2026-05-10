"use client";

import useSWR from "swr";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject, Unit } from "@/lib/types";

export type ContentByType = {
  long_notes: Content[];
  short_notes: Content[];
  flashcard: Content[];
  quiz: Content[];
  paper_predictor: Content[];
  exam_tips: Content[];
  pyqs: Content[];
  syllabus: Content[];
  assignments: Content[];
};

export type SubjectAggregate = {
  subject: Subject | null;
  units: (Unit & { content: ContentByType })[];
  flat: Content[];
  byType: ContentByType;
};

const EMPTY_BY_TYPE = (): ContentByType => ({
  long_notes: [],
  short_notes: [],
  flashcard: [],
  quiz: [],
  paper_predictor: [],
  exam_tips: [],
  pyqs: [],
  syllabus: [],
  assignments: [],
});

/**
 * Aggregates a subject's metadata + units + content into a single
 * structured object with both per-unit grouping and global by-type
 * indexes for tab views.
 */
export function useSubjectContent(subjectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    subjectId ? `subject-aggregate-${subjectId}` : null,
    async () => {
      const res: any = await subjectsAPI.getContent(subjectId);
      return res?.data ?? res;
    },
  );

  const aggregate: SubjectAggregate = (() => {
    if (!data) return { subject: null, units: [], flat: [], byType: EMPTY_BY_TYPE() };

    // Possible shapes:
    // 1) { subject, units: [{ unit, content }], counts }
    // 2) { subject, content: [...] | { type: [...] } }
    const subject = (data?.subject ?? null) as Subject | null;

    let units: (Unit & { content: ContentByType })[] = [];
    let flat: Content[] = [];
    const byType: ContentByType = EMPTY_BY_TYPE();

    if (Array.isArray(data?.units)) {
      // Shape 1
      units = data.units.map((u: any) => {
        const grouped: ContentByType = EMPTY_BY_TYPE();
        const unitContent: Content[] =
          Array.isArray(u.content)
            ? u.content
            : u.content
              ? Object.values(u.content).flat() as Content[]
              : [];
        unitContent.forEach((c: Content) => {
          if (grouped[c.type as keyof ContentByType]) {
            grouped[c.type as keyof ContentByType].push(c);
          }
        });
        flat.push(...unitContent);
        return {
          ...(u.unit ?? u),
          content: grouped,
        };
      });
    } else if (data?.content) {
      // Shape 2
      const all: Content[] = Array.isArray(data.content)
        ? data.content
        : (Object.values(data.content).flat() as Content[]);
      flat = all;
      const unitMap = new Map<
        string,
        Unit & { content: ContentByType }
      >();
      all.forEach((c) => {
        const u = c.unit;
        if (u) {
          const key = u.id;
          if (!unitMap.has(key)) {
            unitMap.set(key, {
              id: u.id,
              title: u.title,
              unitNumber: (u as any).unitNumber,
              content: EMPTY_BY_TYPE(),
            } as any);
          }
          const target = unitMap.get(key)!;
          if (target.content[c.type as keyof ContentByType]) {
            target.content[c.type as keyof ContentByType].push(c);
          }
        }
      });
      units = Array.from(unitMap.values()).sort(
        (a, b) =>
          ((a as any).unitNumber || 0) - ((b as any).unitNumber || 0),
      );
    }

    flat.forEach((c) => {
      if (byType[c.type as keyof ContentByType]) {
        byType[c.type as keyof ContentByType].push(c);
      }
    });

    return { subject, units, flat, byType };
  })();

  return {
    ...aggregate,
    isLoading,
    error,
    mutate,
  };
}
