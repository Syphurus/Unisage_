"use client";

import useSWR from "swr";
import { apiClient, type ApiResponse } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────── */

export interface UnitDetail {
  id: string;
  unitNumber: number;
  title: string;
  description: string | null;
  orderIndex: number;
  subject: {
    id: string;
    name: string;
    code: string;
    year: number;
    semester: number;
  } | null;
  createdAt: string;
}

/* ─── Fetcher ───────────────────────────────────────── */

const fetcher = <T>(url: string) => apiClient<T>(url).then((r) => r);

/* ─── Hooks ─────────────────────────────────────────── */

export function useUnit(unitId: string) {
  const { data, error, mutate, isLoading } = useSWR<ApiResponse<UnitDetail>>(
    unitId ? `/units/${unitId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    unit: data?.data ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

export interface UnitContent {
  unit: { id: string; title: string };
  content: {
    long_notes: ContentItem[];
    short_notes: ContentItem[];
    flashcard: ContentItem[];
    quiz: ContentItem[];
    paper_predictor: ContentItem[];
    exam_tips: ContentItem[];
  };
}

export interface ContentItem {
  id: string;
  title: string | null;
  data: Record<string, unknown>;
  orderIndex: number;
  createdAt: string;
}

export function useUnitContent(unitId: string) {
  const { data, error, mutate, isLoading } = useSWR<ApiResponse<UnitContent>>(
    unitId ? `/admin/units/${unitId}/content` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    content: data?.data ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}
