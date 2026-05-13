"use client";

import useSWR from "swr";
import { subjectsAPI } from "@/lib/api";
import type { Subject, Unit } from "@/lib/types";

function normalizeSubject(raw: any): Subject {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    year: raw.year,
    semester: raw.semester,
    credits: raw.credits,
    description: raw.description,
    predictorVisible: raw.predictorVisible ?? raw.predictor_visible,
    createdAt: raw.createdAt ?? raw.created_at,
    units: raw.units,
  };
}

export function useSubjects(filters?: {
  branchId?: string;
  year?: number;
  semester?: number;
  cacheKey?: string | null;
}) {
  const key = filters
    ? `subjects-${filters.branchId || "all"}-${filters.year || "all"}-${filters.semester || "all"}-${filters.cacheKey || "default"}`
    : "subjects";

  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    const { cacheKey: _cacheKey, ...apiFilters } = filters || {};
    const response = await subjectsAPI.getAll(apiFilters);
    const result = response.data?.subjects || response.data || response;
    return result;
  });

  const subjects = Array.isArray(data) ? data.map((subject) => normalizeSubject(subject)) : [];

  return {
    subjects,
    isLoading,
    error,
    mutate,
  };
}

export function useSubject(id: string) {
  const { data, error, isLoading } = useSWR(
    id ? `subject-${id}` : null,
    async () => {
      const response = await subjectsAPI.getById(id);
      return response.data;
    }
  );

  // Backend returns subject fields flat with units as a nested array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const subject: Subject | undefined = raw ? normalizeSubject(raw) : undefined;
  const units: Unit[] = raw?.units || [];

  return {
    subject,
    units,
    isLoading,
    error,
  };
}

export function useSubjectUnits(subjectId: string) {
  const { data, error, isLoading } = useSWR(
    subjectId ? `subject-units-${subjectId}` : null,
    async () => {
      const response = await subjectsAPI.getUnits(subjectId);
      // response = { success, data: { subject, units } }
      return response.data?.units || response.data;
    }
  );

  return {
    units: (Array.isArray(data) ? data : []) as Unit[],
    isLoading,
    error,
  };
}
