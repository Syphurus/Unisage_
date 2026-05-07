"use client";

import useSWR from "swr";
import { apiClient, type ApiResponse } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────── */

export interface ContentDetail {
  id: string;
  type:
    | "long_notes"
    | "short_notes"
    | "flashcard"
    | "quiz"
    | "paper_predictor"
    | "exam_tips";
  title: string | null;
  data: Record<string, unknown>;
  orderIndex: number;
  unit: {
    id: string;
    title: string;
    unitNumber: number;
    subject: { id: string; name: string; code: string } | null;
  } | null;
  createdAt: string;
}

/* ─── Fetcher ───────────────────────────────────────── */

const fetcher = <T>(url: string) => apiClient<T>(url).then((r) => r);

export function useContent(contentId: string) {
  const { data, error, mutate, isLoading } = useSWR<ApiResponse<ContentDetail>>(
    contentId ? `/admin/content/${contentId}` : null,
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
