'use client';

import useSWR from 'swr';
import { contentAPI, unitsAPI } from '@/lib/api';
import type { Content, UnitWithContent } from '@/lib/types';

export function useContent(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `content-${id}` : null,
    async () => {
      const response = await contentAPI.getById(id);
      return response.data.content || response.data;
    }
  );

  return {
    content: data as Content | undefined,
    isLoading,
    error,
    mutate,
  };
}

export function useUnitContent(unitId: string) {
  const { data, error, isLoading } = useSWR(
    unitId ? `unit-content-${unitId}` : null,
    async () => {
      const response = await unitsAPI.getContent(unitId);
      const raw = response.data.content || response.data;
      // Flatten the categorized content into a single array, adding type from key
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const all: Content[] = [];
        for (const type of Object.keys(raw)) {
          const items = (raw as Record<string, Content[]>)[type];
          if (Array.isArray(items)) {
            all.push(...items.map((item) => ({ ...item, type: type as Content['type'] })));
          }
        }
        return all;
      }
      return raw;
    }
  );

  return {
    contents: (data as Content[]) || [],
    isLoading,
    error,
  };
}
