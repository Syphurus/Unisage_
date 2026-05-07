"use client";

import useSWR from "swr";
import { progressAPI, quizAPI, sessionsAPI } from "@/lib/api";
import type { UserProgress, QuizAttempt, SessionStats } from "@/lib/types";

export function useProgress() {
  const { data, error, isLoading, mutate } = useSWR("progress", async () => {
    const response = await progressAPI.getAll();
    return response.data?.progress || response.data;
  });

  return {
    progress: (data as UserProgress[]) || [],
    isLoading,
    error,
    mutate,
  };
}

export function useSubjectProgress(subjectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    subjectId ? `progress-${subjectId}` : null,
    async () => {
      const response = await progressAPI.getBySubject(subjectId);
      // response.data = { totalContent, completedContent, percentage, progress: [...] }
      return response.data || response;
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;

  return {
    progress: (raw?.progress as UserProgress[]) || [],
    totalContent: raw?.totalContent || 0,
    completedContent: raw?.completedContent || 0,
    percentage: raw?.percentage || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useQuizAttempts() {
  const { data, error, isLoading } = useSWR("quiz-attempts", async () => {
    const response = await quizAPI.getAttempts();
    return response.data.attempts || response.data;
  });

  return {
    attempts: (data as QuizAttempt[]) || [],
    isLoading,
    error,
  };
}

export function useSessionStats() {
  const { data, error, isLoading } = useSWR("session-stats", async () => {
    const response = await sessionsAPI.getStats();
    return response.data.stats || response.data;
  });

  return {
    stats: data as SessionStats | undefined,
    isLoading,
    error,
  };
}
