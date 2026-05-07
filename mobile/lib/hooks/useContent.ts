// ============================================
// UniSage Mobile — Content & Progress Hooks
// ============================================

import { useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher, postData, deleteData, putData } from '../api';
import storage from '../storage';
import { STORAGE_KEYS } from '../constants';
import { generateId } from '../utils';
import type {
  ContentItem,
  Bookmark,
  ProgressStats,
  QuizAttempt,
  QuizAttemptPayload,
  OfflineAction,
} from '../types';

// ---- Single Content Item ----

export function useContent(contentId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ContentItem>(
    contentId ? `/api/content/${contentId}` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (content) => {
        // Cache individual content for offline access
        storage.set(`content_${contentId}`, content);
      },
    },
  );

  return {
    content: data ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

// ---- Progress ----

export function useProgress() {
  const { data, error, isLoading, mutate } = useSWR<ProgressStats>(
    '/api/progress',
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      onSuccess: (stats) => {
        storage.set(STORAGE_KEYS.CACHED_PROGRESS, stats);
      },
    },
  );

  /** Mark content as viewed / completed */
  const markProgress = useCallback(
    async (contentId: string, timeSpent: number) => {
      try {
        await postData('/api/progress', { contentId, timeSpent });
        mutate(); // refresh stats
      } catch {
        // Queue for offline sync
        await queueOfflineAction({
          id: generateId(),
          type: 'progress',
          payload: { contentId, timeSpent },
          created_at: new Date().toISOString(),
        });
      }
    },
    [mutate],
  );

  return {
    stats: data ?? null,
    isLoading,
    isError: !!error,
    markProgress,
    refresh: mutate,
  };
}

// ---- Bookmarks ----

export function useBookmarks() {
  const { data, error, isLoading, mutate } = useSWR<Bookmark[]>(
    '/api/bookmarks',
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const addBookmark = useCallback(
    async (contentId: string) => {
      try {
        await postData('/api/bookmarks', { contentId });
        mutate();
      } catch {
        await queueOfflineAction({
          id: generateId(),
          type: 'bookmark',
          payload: { contentId },
          created_at: new Date().toISOString(),
        });
      }
    },
    [mutate],
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      try {
        await deleteData(`/api/bookmarks/${bookmarkId}`);
        mutate();
      } catch {
        // silently fail — optimistic update
      }
    },
    [mutate],
  );

  return {
    bookmarks: data ?? [],
    isLoading,
    isError: !!error,
    addBookmark,
    removeBookmark,
    refresh: mutate,
  };
}

// ---- Quiz Attempts ----

export function useQuizAttempts() {
  const { data, error, isLoading, mutate } = useSWR<QuizAttempt[]>(
    '/api/quiz/attempts/user',
    swrFetcher,
    { revalidateOnFocus: false },
  );

  const submitAttempt = useCallback(
    async (payload: QuizAttemptPayload) => {
      try {
        const result = await postData<QuizAttempt>('/api/quiz/attempt', payload as any);
        mutate();
        return result;
      } catch {
        await queueOfflineAction({
          id: generateId(),
          type: 'quiz_attempt',
          payload: payload as any,
          created_at: new Date().toISOString(),
        });
        return null;
      }
    },
    [mutate],
  );

  return {
    attempts: data ?? [],
    isLoading,
    isError: !!error,
    submitAttempt,
    refresh: mutate,
  };
}

// ---- Study Sessions ----

export function useStudySessions() {
  const startSession = useCallback(async (subjectId: string) => {
    try {
      const session = await postData<{ id: string }>('/api/sessions/start', { subjectId });
      return session;
    } catch {
      return null;
    }
  }, []);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      await putData(`/api/sessions/${sessionId}/end`, {});
    } catch {
      // silent
    }
  }, []);

  return { startSession, endSession };
}

// ---- Offline Queue ----

async function queueOfflineAction(action: OfflineAction) {
  const queue = (await storage.get<OfflineAction[]>(STORAGE_KEYS.OFFLINE_QUEUE)) ?? [];
  queue.push(action);
  await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);
}

/** Flush offline queue — call when connectivity is restored */
export async function syncOfflineQueue() {
  const queue = (await storage.get<OfflineAction[]>(STORAGE_KEYS.OFFLINE_QUEUE)) ?? [];
  if (queue.length === 0) return;

  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'progress':
          await postData('/api/progress', action.payload);
          break;
        case 'bookmark':
          await postData('/api/bookmarks', action.payload);
          break;
        case 'quiz_attempt':
          await postData('/api/quiz/attempt', action.payload);
          break;
      }
    } catch {
      remaining.push(action); // keep for next sync attempt
    }
  }

  await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, remaining);
}
