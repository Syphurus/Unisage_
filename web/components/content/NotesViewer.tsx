"use client";

import { useMemo, useRef } from "react";
import type { Content } from "@/lib/types";
import { useReadingTracker } from "@/lib/hooks/useReadingTracker";

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

/**
 * NotesViewer with real active-time tracking.
 *
 * Uses useReadingTracker, which gates time accumulation on Page Visibility
 * and 60s idle detection — so an open-but-untouched tab does NOT inflate
 * study time. Heartbeats every 30s; final flush via fetch keepalive on
 * unload.
 *
 * Captures scroll progress and section IDs (from the parent ReadingView's
 * heading anchors) by reading from the DOM at heartbeat time. This avoids
 * coupling the tracker to ReadingView's internal state.
 */
export function NotesViewerWithTracking({ content }: NotesViewerProps) {
  const subjectId = content?.unit?.subject?.id || null;
  const sectionsRef = useRef<Set<string>>(new Set());

  useReadingTracker({
    contentId: content.id,
    subjectId,
    getViewState: () => {
      // Compute current scroll % from window scroll position. Cheap.
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const scrollPct = Math.min(
        100,
        Math.max(0, Math.round((window.scrollY / scrollable) * 100))
      );

      // Snapshot which heading anchors are currently in view. ReadingView
      // injects ids on h1/h2/h3 so we can identify sections without it
      // having to plumb state into this hook.
      try {
        const headings = document.querySelectorAll("[data-rv-heading]") as NodeListOf<HTMLElement>;
        if (headings.length > 0) {
          headings.forEach((h) => {
            const rect = h.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              if (h.id) sectionsRef.current.add(h.id);
            }
          });
        }
      } catch {
        // DOM access failures are non-critical for tracking
      }

      return {
        maxScrollPct: scrollPct,
        sectionsViewed: Array.from(sectionsRef.current),
      };
    },
  });

  return <NotesViewer content={content} />;
}
