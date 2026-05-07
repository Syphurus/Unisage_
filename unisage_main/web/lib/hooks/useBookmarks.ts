"use client";

import useSWR from "swr";
import { bookmarksAPI } from "@/lib/api";
import { toast } from "sonner";
import type { Bookmark } from "@/lib/types";

export function useBookmarks() {
  const { data, error, isLoading, mutate } = useSWR("bookmarks", async () => {
    const response = await bookmarksAPI.getAll();
    return response.data.bookmarks || response.data;
  });

  const addBookmark = async (contentId: string) => {
    try {
      await bookmarksAPI.create(contentId);
      mutate();
      toast.success("Bookmarked!");
    } catch {
      toast.error("Failed to bookmark");
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      await bookmarksAPI.delete(bookmarkId);
      mutate();
      toast.success("Bookmark removed");
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  const isBookmarked = (contentId: string) => {
    return (data as Bookmark[])?.some(
      (b) => b.contentId === contentId || b.content?.id === contentId
    );
  };

  const getBookmarkId = (contentId: string) => {
    return (data as Bookmark[])?.find(
      (b) => b.contentId === contentId || b.content?.id === contentId
    )?.id;
  };

  return {
    bookmarks: (data as Bookmark[]) || [],
    isLoading,
    error,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarkId,
    mutate,
  };
}
