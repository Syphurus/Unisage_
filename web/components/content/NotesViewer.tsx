"use client";

import { useEffect, useMemo } from "react";
import type { Content } from "@/lib/types";
import { progressAPI } from "@/lib/api";

interface NotesViewerProps {
  content: Content;
}

function extractHtml(content: Content) {
  const data = (content?.data || {}) as Record<string, any>;
  if (typeof data.html === "string" && data.html.trim()) return data.html;
  if (typeof data.content === "string" && data.content.trim()) {
    return `<p>${data.content.replace(/\n\n+/g, "</p><p>")}</p>`;
  }
  return "<p>No formatted note content available.</p>";
}

export function NotesViewer({ content }: NotesViewerProps) {
  const html = useMemo(() => extractHtml(content), [content]);
  return (
    <article
      className="prose-notes"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function NotesViewerWithTracking({ content }: NotesViewerProps) {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await progressAPI.update({ contentId: content.id, timeSpent: 15 });
      } catch (_) {
        // ignore tracking failures
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [content.id]);

  return <NotesViewer content={content} />;
}
