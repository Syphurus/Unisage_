/**
 * Web PYQs Viewer Component
 * Displays previous year questions with view and download buttons
 */

"use client";

import React, { useState } from "react";
import { Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Content } from "@/lib/types";

interface PyqsViewerProps {
  content: Content[];
  isLoading?: boolean;
}

export default function PyqsViewer({
  content,
  isLoading = false,
}: PyqsViewerProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const handleDownload = async (contentId: string) => {
    setDownloadingId(contentId);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/content/${encodeURIComponent(contentId)}/download`
      );
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pyq-${contentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          No Previous Year Questions available
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {content.map((pyq) => (
        <div
          key={pyq.id}
          className="border rounded-lg p-6 hover:shadow-lg transition-shadow dark:border-gray-700"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{pyq.title}</h3>
              <div className="flex gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  📅 Year:{" "}
                  <span className="font-medium">
                    {(pyq.data as any)?.year || "N/A"}
                  </span>
                </span>
                <span>
                  📚 Subject:{" "}
                  <span className="font-medium">
                    {(pyq.data as any)?.subject || "N/A"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mt-2">
                <Clock className="h-3 w-3" />
                <span>
                  Added on {new Date(pyq.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => handleDownload(pyq.id)}
              disabled={downloadingId === pyq.id}
            >
              <Download className="h-4 w-4" />
              {downloadingId === pyq.id ? "Downloading..." : "Download PDF"}
            </Button>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
            <iframe
              title={`PYQ ${pyq.title}`}
              src={`${apiBaseUrl}/api/content/${encodeURIComponent(pyq.id)}/view`}
              className="w-full h-[70vh] min-h-[560px]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
