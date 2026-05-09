"use client";

import { useMemo, useState } from "react";
import { Download, ArrowRight, Calendar } from "lucide-react";
import {
  Pill,
  TabStrip,
  SectionHeader,
  PrimaryButton,
  MetaCaption,
} from "@/components/unisage/primitives";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Content } from "@/lib/types";

interface PyqsViewerProps {
  content: Content[];
  isLoading?: boolean;
}

type Mode = "repeat" | "cluster" | "year";

const TABS: { id: Mode; label: string }[] = [
  { id: "repeat", label: "By repeat" },
  { id: "cluster", label: "By cluster" },
  { id: "year", label: "By year" },
];

export default function PyqsViewer({ content, isLoading }: PyqsViewerProps) {
  const [mode, setMode] = useState<Mode>("repeat");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/content/${encodeURIComponent(id)}/download`,
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pyq-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  };

  // Cluster — group by topic/title fragments
  const clusters = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; items: Content[]; tags: string[] }
    >();
    content.forEach((c) => {
      const data = c.data as any;
      const cluster = data?.cluster || data?.topic || c.title || "General";
      if (!groups.has(cluster)) {
        groups.set(cluster, { name: cluster, items: [], tags: [] });
      }
      const g = groups.get(cluster)!;
      g.items.push(c);
      const tag = data?.tag || data?.subTopic;
      if (tag && !g.tags.includes(tag)) g.tags.push(tag);
    });
    return Array.from(groups.values());
  }, [content]);

  // Year sort
  const byYear = useMemo(() => {
    return [...content].sort((a, b) => {
      const yearA = (a.data as any)?.year || 0;
      const yearB = (b.data as any)?.year || 0;
      return yearB - yearA;
    });
  }, [content]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-chalk-400">
        No past papers yet.
      </p>
    );
  }

  return (
    <div className="mt-2">
      <Pill variant="mint" className="mb-4">
        ↗ {content.length} questions · {clusters.length} clusters
      </Pill>

      <div className="-mx-5 px-5">
        <TabStrip<Mode> tabs={TABS} active={mode} onChange={setMode} />
      </div>

      <div className="mt-6">
        {mode === "cluster" || mode === "repeat" ? (
          <>
            <SectionHeader
              title="Question clusters"
              meta="ranked by frequency"
            />
            <ul className="mt-3 space-y-3">
              {clusters
                .sort((a, b) => b.items.length - a.items.length)
                .map((cluster, i) => (
                  <li
                    key={cluster.name}
                    className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <MetaCaption>
                        CLUSTER · {String(i + 1).padStart(2, "0")} ·{" "}
                        {cluster.items.length}/{content.length} CYCLES
                      </MetaCaption>
                      <span className="text-[14px] font-bold text-mint">
                        {cluster.items.length} Q
                      </span>
                    </div>
                    <p className="mt-2 text-[16px] font-semibold text-[rgb(var(--fg))]">
                      {cluster.name}
                    </p>
                    {cluster.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cluster.tags.slice(0, 4).map((t) => (
                          <Pill key={t}>{t}</Pill>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[11px] text-chalk-400">
                        {Math.floor(cluster.items.length * 1.5)}-
                        {Math.floor(cluster.items.length * 2.5)} marks · typical
                      </p>
                      <button
                        onClick={() => handleDownload(cluster.items[0].id)}
                        className="pill pill-mint"
                      >
                        Drill <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <>
            <SectionHeader title="By year" meta={`${byYear.length} papers`} />
            <ul className="mt-3 space-y-3">
              {byYear.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-mint-500/10 text-mint-400">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                      {(c.data as any)?.year ?? "Year"} · {(c.data as any)?.examType ?? "Paper"}
                    </p>
                    <p className="mt-0.5 text-[14px] font-semibold text-[rgb(var(--fg))]">
                      {c.title}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(c.id)}
                    disabled={downloadingId === c.id}
                    aria-label="Download"
                    className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
