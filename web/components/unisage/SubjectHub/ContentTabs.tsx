"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  Layers,
  GraduationCap,
  ScrollText,
  ClipboardList,
  Sparkles,
  Lightbulb,
  Calendar,
} from "lucide-react";
import type { ContentByType } from "@/lib/hooks/useSubjectContent";

export type ContentTabId =
  | "long_notes"
  | "short_notes"
  | "flashcard"
  | "quiz"
  | "pyqs"
  | "syllabus"
  | "assignments"
  | "exam_tips"
  | "paper_predictor";

const META: Record<
  ContentTabId,
  { label: string; Icon: any; sub: string }
> = {
  long_notes: { label: "Long notes", Icon: BookOpen, sub: "Deep dives" },
  short_notes: { label: "Short notes", Icon: FileText, sub: "Cheat sheets" },
  flashcard: { label: "Flashcards", Icon: Layers, sub: "Recall cycles" },
  quiz: { label: "Quizzes", Icon: GraduationCap, sub: "Retrieval lab" },
  pyqs: { label: "PYQs", Icon: ScrollText, sub: "Past papers" },
  syllabus: { label: "Syllabus", Icon: Calendar, sub: "Coverage" },
  assignments: { label: "Assignments", Icon: ClipboardList, sub: "To-dos" },
  exam_tips: { label: "Exam tips", Icon: Lightbulb, sub: "Tactics" },
  paper_predictor: { label: "Predictor", Icon: Sparkles, sub: "AI papers" },
};

const ORDER: ContentTabId[] = [
  "long_notes",
  "short_notes",
  "flashcard",
  "quiz",
  "pyqs",
  "exam_tips",
  "paper_predictor",
  "syllabus",
  "assignments",
];

export function ContentTabs({
  active,
  onChange,
  byType,
}: {
  active: ContentTabId;
  onChange: (id: ContentTabId) => void;
  byType: ContentByType;
}) {
  return (
    <div className="border-b border-white/[0.06] sticky top-0 z-10 bg-[rgb(var(--bg))]/85 backdrop-blur-md -mx-5 md:-mx-8 lg:-mx-10 xl:-mx-14 px-5 md:px-8 lg:px-10 xl:px-14">
      <div className="flex gap-1 lg:gap-2 overflow-x-auto scrollbar-none">
        {ORDER.map((id) => {
          const m = META[id];
          const count = byType[id]?.length ?? 0;
          const isActive = active === id;
          const disabled = count === 0;
          return (
            <button
              key={id}
              onClick={() => !disabled && onChange(id)}
              disabled={disabled}
              className={cn(
                "relative shrink-0 inline-flex items-center gap-2 px-3.5 lg:px-4 py-3 lg:py-4 text-[13px] font-medium transition-colors",
                isActive
                  ? "text-mint-400"
                  : disabled
                    ? "text-chalk-500/40 cursor-not-allowed"
                    : "text-chalk-300 hover:text-[rgb(var(--fg))]",
              )}
            >
              <m.Icon className="h-4 w-4" />
              <span>{m.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-mint-500/15 text-mint-400"
                      : "bg-white/[0.06] text-chalk-400",
                  )}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-mint-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function tabMeta(id: ContentTabId) {
  return META[id];
}
