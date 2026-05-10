"use client";

import useSWR from "swr";
import { analyticsAPI, type DashboardStats, type SubjectAnalytics } from "@/lib/api";

/**
 * Rollup-backed dashboard payload (streaks, timeline, weak subject ids).
 * Falls back gracefully when the rollup is empty for a brand-new user —
 * the backend already handles that. We surface { stats, isLoading }.
 */
export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR(
    "analytics-me",
    async () => {
      const res = await analyticsAPI.getMyDashboard();
      return (res?.data ?? null) as DashboardStats | null;
    }
  );
  return { stats: data ?? undefined, error, isLoading, mutate };
}

/**
 * Per-subject completion + weakness, ordered by weakness_score DESC. The
 * server returns the ranking already sorted, so we just expose it as-is.
 */
export function useMySubjectAnalytics() {
  const { data, error, isLoading, mutate } = useSWR(
    "analytics-me-subjects",
    async () => {
      const res = await analyticsAPI.getMySubjects();
      return ((res?.data ?? []) as SubjectAnalytics[]) || [];
    }
  );
  return { subjects: data ?? [], error, isLoading, mutate };
}
