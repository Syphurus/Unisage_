// ============================================
// UniSage Mobile — Subjects Hook (SWR)
// ============================================

import useSWR from "swr";
import { swrFetcher } from "../api";
import storage from "../storage";
import { STORAGE_KEYS } from "../constants";
import type { Subject, Unit } from "../types";

/** Fetch all subjects, optionally filtered by year */
export function useSubjects(year?: number) {
  const params = year && year > 0 ? `?year=${year}` : "";
  const key = `/api/subjects${params}`;

  const { data, error, isLoading, mutate } = useSWR<Subject[]>(
    key,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      onSuccess: (subjects) => {
        // Cache for offline use
        storage.set(STORAGE_KEYS.CACHED_SUBJECTS, subjects);
      },
    }
  );

  return {
    subjects: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

/** Fetch a single subject by ID */
export function useSubject(id?: string) {
  const { data, error, isLoading, mutate } = useSWR<Subject>(
    id ? `/api/subjects/${id}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    subject: data ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

/** Fetch units for a subject */
export function useSubjectUnits(subjectId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    subject: { id: string; name: string };
    units: Unit[];
  }>(subjectId ? `/api/subjects/${subjectId}/units` : null, swrFetcher, {
    revalidateOnFocus: false,
  });

  return {
    units: data?.units ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

/** Fetch a single unit with its content */
export function useUnit(unitId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Unit>(
    unitId ? `/api/units/${unitId}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    unit: data ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

/** Fetch content items for a unit */
export function useUnitContent(unitId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    unit: { id: string; title: string };
    content: {
      long_notes: any[];
      short_notes: any[];
      flashcard: any[];
      quiz: any[];
    };
  }>(unitId ? `/api/units/${unitId}/content` : null, swrFetcher, {
    revalidateOnFocus: false,
  });

  // Flatten grouped content into a single array
  const grouped = data?.content;
  const contents = grouped
    ? [
        ...grouped.long_notes.map((c: any) => ({ ...c, type: "long_notes" })),
        ...grouped.short_notes.map((c: any) => ({ ...c, type: "short_notes" })),
        ...grouped.flashcard.map((c: any) => ({ ...c, type: "flashcard" })),
        ...grouped.quiz.map((c: any) => ({ ...c, type: "quiz" })),
      ]
    : [];

  return {
    contents,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
