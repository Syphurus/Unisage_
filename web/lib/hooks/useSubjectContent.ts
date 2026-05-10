"use client";

import useSWR from "swr";
import { subjectsAPI } from "@/lib/api";
import type { Content, Subject, Unit } from "@/lib/types";

export type ContentTypeKey =
  | "long_notes"
  | "short_notes"
  | "flashcard"
  | "quiz"
  | "paper_predictor"
  | "exam_tips"
  | "pyqs"
  | "syllabus"
  | "assignments";

export type ContentByType = Record<ContentTypeKey, Content[]>;

export type UnitWithContent = Unit & {
  content: ContentByType;
};

export type SubjectAggregate = {
  subject: Subject | null;
  units: UnitWithContent[];
  flat: Content[];
  byType: ContentByType;
  totalCount: number;
};

const TYPE_KEYS: ContentTypeKey[] = [
  "long_notes",
  "short_notes",
  "flashcard",
  "quiz",
  "paper_predictor",
  "exam_tips",
  "pyqs",
  "syllabus",
  "assignments",
];

function emptyByType(): ContentByType {
  return {
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
}

/**
 * Stamp a `type` field onto each item (the backend strips it because
 * it lives in the bucket key). Also inject a `unit` reference so the
 * content viewer dispatcher can construct the correct breadcrumb.
 */
function hydrateBucket(
  bucket: Record<string, any[]> | undefined,
  unit?: Unit | null,
  subject?: Subject | null,
): ContentByType {
  const out = emptyByType();
  if (!bucket) return out;
  for (const key of TYPE_KEYS) {
    const list: any[] = (bucket as any)[key] || [];
    out[key] = list.map((item) => ({
      ...item,
      type: key,
      unit: unit
        ? {
            id: unit.id,
            title: unit.title,
            unitNumber: (unit as any).unitNumber ?? (unit as any).unit_number,
            subject: subject
              ? {
                  id: subject.id,
                  name: subject.name,
                  code: subject.code,
                }
              : null,
          }
        : item.unit ?? null,
    })) as Content[];
  }
  return out;
}

/**
 * useSubjectContent
 *
 * Builds a complete subject workspace by combining two endpoints:
 *  - /api/subjects/:id/units/content   → all per-unit content grouped by type
 *  - /api/subjects/:id/content         → flat subject-level content grouped by type
 *
 * The backend stores some content (predictor papers, syllabus, etc.) at
 * the subject level via a hidden unit_number=0 row. The /content endpoint
 * surfaces ALL of it grouped by type, while /units/content surfaces only
 * the visible per-unit content. Combining them gives every item exactly
 * once with the right unit attribution.
 */
export function useSubjectContent(subjectId: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    units: UnitWithContent[];
    subject: Subject | null;
    byType: ContentByType;
  }>(
    subjectId ? `subject-aggregate-v2-${subjectId}` : null,
    async () => {
      const [unitsRes, contentRes]: [any, any] = await Promise.all([
        subjectsAPI.getUnitsContent(subjectId).catch(() => null),
        subjectsAPI.getContent(subjectId).catch(() => null),
      ]);

      // Subject metadata — prefer units endpoint, fall back to content endpoint
      const subject: Subject | null =
        (unitsRes?.data?.subject as Subject) ??
        (contentRes?.data?.subject as Subject) ??
        null;

      // Per-unit grouped content
      const rawUnits: any[] = unitsRes?.data?.units ?? [];
      const units: UnitWithContent[] = rawUnits
        .map((u: any) => {
          const unit: Unit = {
            id: u.unit?.id ?? u.id,
            title: u.unit?.title ?? u.title ?? "Unit",
            unitNumber: u.unit?.unitNumber ?? u.unit?.unit_number ?? 0,
            description: u.unit?.description,
            orderIndex: u.unit?.orderIndex ?? u.unit?.order_index,
          } as Unit;
          return {
            ...unit,
            content: hydrateBucket(u.content, unit, subject),
          } as UnitWithContent;
        })
        .filter((u) => (u as any).unitNumber !== 0);

      // Subject-level grouped content (includes content stored under unit_number=0)
      const subjectLevelBucket = contentRes?.data?.content ?? {};
      const subjectLevel: ContentByType = hydrateBucket(
        subjectLevelBucket,
        null,
        subject,
      );

      // Build byType: union of all unit content + subject-level content,
      // de-duplicated on item id (prefer the per-unit version for unit attribution).
      const byType = emptyByType();
      const seen = new Set<string>();

      for (const u of units) {
        for (const key of TYPE_KEYS) {
          for (const item of u.content[key]) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              byType[key].push(item);
            }
          }
        }
      }
      for (const key of TYPE_KEYS) {
        for (const item of subjectLevel[key]) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            byType[key].push(item);
          }
        }
      }

      return { units, subject, byType };
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const aggregate: SubjectAggregate = {
    subject: data?.subject ?? null,
    units: data?.units ?? [],
    byType: data?.byType ?? emptyByType(),
    flat: data
      ? TYPE_KEYS.flatMap((k) => data.byType[k])
      : [],
    totalCount: data
      ? TYPE_KEYS.reduce((sum, k) => sum + data.byType[k].length, 0)
      : 0,
  };

  return {
    ...aggregate,
    isLoading,
    error,
    mutate,
  };
}
