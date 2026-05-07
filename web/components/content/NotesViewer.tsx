"use client";

import { useEffect, useMemo } from "react";
import type { Content } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0D1B2A]">{content.title || "Notes"}</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <article
            className="prose prose-slate max-w-none prose-headings:text-[#0D1B2A] prose-p:text-[#333D52]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function NotesViewerWithTracking({ content }: NotesViewerProps) {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await progressAPI.update({ contentId: content.id, timeSpent: 15 });
      } catch (_) {
        // ignore tracking failures to keep reading flow uninterrupted
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [content.id]);

  return <NotesViewer content={content} />;
}
