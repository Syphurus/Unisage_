"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Layers,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
import {
  Pill,
  MetaCaption,
  HighlightCard,
  AnnotationBlock,
} from "@/components/unisage/primitives";
import HtmlContent from "@/components/content/HtmlContent";
import type { Content } from "@/lib/types";
import type { ContentTabId } from "./ContentTabs";

export function ContentList({
  type,
  items,
}: {
  type: ContentTabId;
  items: Content[];
}) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[14px] text-chalk-400">
          No {humanType(type)} published yet for this scope.
        </p>
        <p className="mt-2 text-[12px] text-chalk-500">
          Switch units, or check back soon — content drops weekly.
        </p>
      </div>
    );
  }

  switch (type) {
    case "long_notes":
    case "short_notes":
      return <NotesGrid items={items} compact={type === "short_notes"} />;
    case "flashcard":
      return <FlashcardsList items={items} />;
    case "quiz":
      return <QuizList items={items} />;
    case "pyqs":
      return <PyqList items={items} />;
    case "exam_tips":
      return <ExamTipsList items={items} />;
    case "paper_predictor":
      return <PredictorList items={items} />;
    case "syllabus":
      return <SyllabusList items={items} />;
    case "assignments":
      return <AssignmentList items={items} />;
    default:
      return null;
  }
}

function humanType(t: ContentTabId): string {
  return (
    {
      long_notes: "long notes",
      short_notes: "short notes",
      flashcard: "flashcards",
      quiz: "quizzes",
      pyqs: "past papers",
      syllabus: "syllabus entries",
      assignments: "assignments",
      exam_tips: "exam tips",
      paper_predictor: "predicted papers",
    } as Record<ContentTabId, string>
  )[t];
}

// ─────────────────────────────────────────────────────────
// Long / Short notes — preview cards in a grid
// ─────────────────────────────────────────────────────────
function NotesGrid({
  items,
  compact,
}: {
  items: Content[];
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
      {items.map((c) => {
        const data = c.data as any;
        const previewHtml: string =
          (data?.summary || data?.tldr || data?.html || data?.content || "") + "";
        const stripped = previewHtml.replace(/<[^>]+>/g, "").trim();
        const preview =
          stripped.length > 200 ? stripped.slice(0, 200) + "…" : stripped;
        return (
          <Link
            key={c.id}
            href={`/content/${c.id}`}
            className="group flex flex-col rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]"
          >
            <MetaCaption>
              {c.unit?.subject?.code ?? ""} · {c.unit?.title ?? "Topic"}
            </MetaCaption>
            <h3 className="mt-2 text-[17px] lg:text-[18px] font-semibold leading-snug text-[rgb(var(--fg))]">
              {c.title}
            </h3>
            {preview && (
              <p
                className={`mt-3 text-[13px] leading-relaxed text-chalk-400 ${
                  compact ? "line-clamp-3" : "line-clamp-4"
                }`}
              >
                {preview}
              </p>
            )}
            <div className="mt-auto pt-5 flex items-center justify-between">
              <Pill>{compact ? "Cheat sheet" : "Deep dive"}</Pill>
              <span className="inline-flex items-center text-[12px] text-chalk-300 group-hover:text-mint-400 transition-colors">
                Read
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Flashcards (decks)
// ─────────────────────────────────────────────────────────
function FlashcardsList({ items }: { items: Content[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
      {items.map((c) => {
        const data = c.data as any;
        const cardCount = Array.isArray(data?.items) ? data.items.length : 1;
        return (
          <Link
            key={c.id}
            href={`/content/${c.id}`}
            className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-mint-500/30 hover:bg-[rgb(var(--bg-subtle))]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-mint-500/10 text-mint-400">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <Pill variant="mint">{cardCount} cards</Pill>
              </div>
            </div>
            <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[rgb(var(--fg))]">
              {c.title}
            </h3>
            <p className="mt-1 text-[12px] text-chalk-400">
              {c.unit?.title ?? ""}
            </p>
            <div className="mt-5 inline-flex items-center text-[13px] font-medium text-mint-400">
              Run cycle
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Quizzes
// ─────────────────────────────────────────────────────────
function QuizList({ items }: { items: Content[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
      {items.map((c) => {
        const data = c.data as any;
        const qCount = Array.isArray(data?.questions)
          ? data.questions.length
          : 0;
        return (
          <Link
            key={c.id}
            href={`/content/${c.id}`}
            className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <MetaCaption>
                  {c.unit?.subject?.code ?? ""} · {c.unit?.title ?? "Topic"}
                </MetaCaption>
                <h3 className="mt-2 text-[18px] font-semibold leading-snug text-[rgb(var(--fg))]">
                  {c.title}
                </h3>
              </div>
              <Pill variant="mint-solid">Lab</Pill>
            </div>
            <div className="mt-5 flex items-center justify-between text-[12px] text-chalk-400">
              <span>{qCount} questions</span>
              <span className="inline-flex items-center text-mint-400">
                Start drill
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PYQs
// ─────────────────────────────────────────────────────────
function PyqList({ items }: { items: Content[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
      {items.map((c) => (
        <FileCard key={c.id} content={c} />
      ))}
    </div>
  );
}

/**
 * Card with a real "Open" (inline view) and "Download" link, hitting
 * the backend file routes that serve files associated with a content row.
 */
function FileCard({ content: c }: { content: Content }) {
  const data = c.data as any;
  const viewUrl = `${API_BASE}/api/content/${c.id}/view`;
  const downloadUrl = `${API_BASE}/api/content/${c.id}/download`;
  return (
    <div className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4 lg:p-5 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-mint-500/10 text-mint-400">
          <Calendar className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <MetaCaption>
            {data?.year ?? "Year"} · {data?.examType ?? "Paper"}
          </MetaCaption>
          <p className="mt-1 text-[14px] font-semibold text-[rgb(var(--fg))] truncate">
            {c.title}
          </p>
          {Array.isArray(data?.questions) && (
            <p className="mt-1 text-[11.5px] text-chalk-400">
              {data.questions.length} questions
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill border border-mint-500/30 bg-mint-500/10 px-3 py-1.5 text-[12px] font-semibold text-mint-400 hover:bg-mint-500/15 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
        <a
          href={downloadUrl}
          download
          className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-chalk-300 hover:bg-white/[0.05] transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Exam tips
// ─────────────────────────────────────────────────────────
function ExamTipsList({ items }: { items: Content[] }) {
  // Try to render flat tips list inline
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
      {items.map((c) => {
        const data = c.data as any;
        const tips: any[] = Array.isArray(data?.tips)
          ? data.tips
          : Array.isArray(data?.exam_tips)
            ? data.exam_tips
            : [];
        return (
          <Link
            key={c.id}
            href={`/content/${c.id}`}
            className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]"
          >
            <MetaCaption>
              {tips.length} plays · {c.unit?.title ?? "General"}
            </MetaCaption>
            <h3 className="mt-2 text-[17px] font-semibold leading-snug text-[rgb(var(--fg))]">
              {c.title}
            </h3>
            {tips.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {tips.slice(0, 3).map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[12.5px] text-chalk-300"
                  >
                    <span className="text-chalk-500 font-mono">
                      P-{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">
                      {t.title || t.heading || "Tactic"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 inline-flex items-center text-[13px] font-medium text-mint-400">
              Read tactics
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Predictor papers
// ─────────────────────────────────────────────────────────
function PredictorList({ items }: { items: Content[] }) {
  return (
    <div className="space-y-4">
      <HighlightCard
        caption={
          <>
            <span className="text-mint-400">PREDICTED PAPERS</span> · 8-CYCLE
            MODEL
          </>
        }
        dot="mint"
      >
        <p className="text-[13px] leading-relaxed text-chalk-400 max-w-2xl">
          AI-reconstructed papers based on the last 8 cycles. Each paper marks
          common traps, PYQ evidence, and strategic ordering.
        </p>
      </HighlightCard>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((c, i) => (
          <Link
            key={c.id}
            href={`/content/${c.id}`}
            className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6 transition-all hover:border-mint-500/30 hover:bg-[rgb(var(--bg-subtle))]"
          >
            <div className="flex items-center justify-between gap-3">
              <MetaCaption>
                PAPER · {String(i + 1).padStart(2, "0")}
              </MetaCaption>
              <Pill variant="mint">Open</Pill>
            </div>
            <h3 className="mt-3 text-[17px] font-semibold leading-snug text-[rgb(var(--fg))]">
              {c.title}
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              <Stat label="Time" value="3h" />
              <Stat label="Marks" value="100" />
              <Stat label="Confidence" value="88%" tone="mint" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "mint";
}) {
  return (
    <div>
      <p className="caption mb-0.5">{label}</p>
      <p
        className={`text-[14px] font-bold ${tone === "mint" ? "text-mint" : "text-[rgb(var(--fg))]"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Syllabus
// ─────────────────────────────────────────────────────────
function SyllabusList({ items }: { items: Content[] }) {
  return (
    <div className="space-y-4">
      {items.map((c) => {
        const data = c.data as any;
        const hasInlineContent =
          data?.html || (Array.isArray(data?.topics) && data.topics.length);
        // If syllabus is just a file (PDF), render as a file card
        if (!hasInlineContent) {
          return (
            <div key={c.id} className="max-w-md">
              <FileCard content={c} />
            </div>
          );
        }
        return (
          <article
            key={c.id}
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <MetaCaption>{c.unit?.title ?? "Subject"}</MetaCaption>
                <h3 className="mt-2 text-[18px] font-semibold text-[rgb(var(--fg))]">
                  {c.title}
                </h3>
              </div>
              <a
                href={`${API_BASE}/api/content/${c.id}/download`}
                download
                aria-label="Download syllabus"
                className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
            {data?.html ? (
              <div className="prose-notes mt-4">
                <HtmlContent html={data.html} />
              </div>
            ) : data?.topics && Array.isArray(data.topics) ? (
              <ul className="mt-3 space-y-1.5">
                {data.topics.map((t: string, i: number) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[13px] text-chalk-300"
                  >
                    <span className="text-chalk-500 font-mono shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <Link
                href={`/content/${c.id}`}
                className="mt-3 inline-flex items-center text-[13px] font-medium text-mint-400"
              >
                Open syllabus
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Assignments
// ─────────────────────────────────────────────────────────
function AssignmentList({ items }: { items: Content[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
      {items.map((c) => {
        const data = c.data as any;
        const minutes = data?.estimatedMinutes ?? data?.duration ?? 60;
        const dueIn = data?.dueInDays;
        const submitted = data?.submitted;
        return (
          <div
            key={c.id}
            className="group rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 transition-all hover:border-white/[0.14] hover:bg-[rgb(var(--bg-subtle))]"
          >
            <div className="flex items-center justify-between gap-2">
              <Pill>{c.unit?.subject?.code ?? "—"}</Pill>
              {submitted ? (
                <Pill variant="mint">Submitted</Pill>
              ) : data?.inProgress ? (
                <Pill variant="mint">In progress</Pill>
              ) : null}
            </div>
            <h3 className="mt-3 text-[15.5px] font-semibold text-[rgb(var(--fg))]">
              {c.title}
            </h3>
            <div className="mt-3 flex items-center gap-3 text-[11.5px] text-chalk-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {minutes} min
              </span>
              {typeof dueIn === "number" && !submitted && (
                <span
                  className={
                    dueIn <= 2
                      ? "text-flame-500"
                      : dueIn <= 5
                        ? "text-ember-400"
                        : "text-chalk-400"
                  }
                >
                  · Due in {dueIn} day{dueIn === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={`${API_BASE}/api/content/${c.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill border border-mint-500/30 bg-mint-500/10 px-3 py-1.5 text-[12px] font-semibold text-mint-400 hover:bg-mint-500/15 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
              <a
                href={`${API_BASE}/api/content/${c.id}/download`}
                download
                aria-label="Download assignment"
                className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-chalk-300 hover:bg-white/[0.05] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
