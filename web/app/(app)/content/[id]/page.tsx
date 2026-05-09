"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { NotesViewerWithTracking } from "@/components/content/NotesViewer";
import HtmlContent from "@/components/content/HtmlContent";
import { FlashcardViewer } from "@/components/content/FlashcardViewer";
import { QuizViewer } from "@/components/content/QuizViewer";
import PyqsViewer from "@/components/content/PyqsViewer";
import { useContent, useUnitContent } from "@/lib/hooks/useContent";
import type { Content } from "@/lib/types";
import { TopHeader } from "@/components/unisage/AppShell";
import {
  Pill,
  HighlightCard,
  AnnotationBlock,
  SectionHeader,
} from "@/components/unisage/primitives";
import { Filter } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  long_notes: "Long notes",
  short_notes: "Short notes",
  flashcard: "Recall cycles",
  quiz: "Retrieval lab",
  paper_predictor: "Predictor",
  exam_tips: "Exam tactics",
  pyqs: "Past papers",
  syllabus: "Syllabus",
  assignments: "Assignments",
};

const TYPE_CAPTIONS: Record<string, string> = {
  long_notes: "CHAPTER",
  short_notes: "COMPRESSED",
  flashcard: "RECALL · CYCLES",
  quiz: "RETRIEVAL · LAB",
  paper_predictor: "PREDICTED PAPER",
  exam_tips: "PROVEN PLAYS",
  pyqs: "PAST PAPERS",
  syllabus: "SYLLABUS",
  assignments: "ASSIGNMENTS",
};

function expandFlashcards(contentItems: Content[]): Content[] {
  const result: Content[] = [];
  for (const item of contentItems) {
    const d = item.data as any;
    if (d?.items && Array.isArray(d.items)) {
      d.items.forEach((card: { front: string; back: string }, idx: number) => {
        result.push({
          ...item,
          id: `${item.id}-${idx}`,
          data: { front: card.front, back: card.back },
        });
      });
    } else if (d?.front && d?.back) {
      result.push(item);
    }
  }
  return result;
}

function extractQuizSection(content: Content, quizType: string | null): Content[] {
  if (!quizType || !content.data) return [content];
  const data = content.data as any;
  const transformedData = (() => {
    switch (quizType) {
      case "mini_quiz":
        if (data.mini_quizzes?.length) {
          const quiz = data.mini_quizzes[0];
          return {
            ...quiz,
            questions:
              quiz.questions?.map((q: any) => ({
                ...q,
                options: q.options || [],
                correctIndex:
                  q.options?.findIndex(
                    (opt: string) =>
                      opt === q.correct_option ||
                      opt.endsWith(q.correct_option),
                  ) ?? 0,
              })) || [],
          };
        }
        break;
      case "unit_quiz":
        if (data.unit_quiz?.questions) {
          return {
            ...data.unit_quiz,
            questions: data.unit_quiz.questions.map((q: any) => ({
              ...q,
              options: q.options || [],
              correctIndex:
                q.options?.findIndex(
                  (opt: string) =>
                    opt === q.correct_option || opt.endsWith(q.correct_option),
                ) ?? 0,
            })),
          };
        }
        break;
      case "true_false":
        if (data.true_false?.questions) {
          return {
            ...data.true_false,
            questions: data.true_false.questions.map((q: any) => ({
              ...q,
              question: q.statement || q.question || "",
              options: ["True", "False"],
              correctIndex: q.answer === true ? 0 : 1,
            })),
          };
        }
        break;
      case "fill_in_blanks":
        if (data.fill_in_blanks?.questions) {
          return {
            ...data.fill_in_blanks,
            questions: data.fill_in_blanks.questions.map((q: any) => ({
              ...q,
              options: [
                q.answer,
                ...(q.acceptable_answers || []).filter(
                  (a: string) => a !== q.answer,
                ),
              ],
              correctIndex: 0,
            })),
          };
        }
        break;
      default:
        return null;
    }
    return null;
  })();

  if (transformedData?.questions?.length) {
    return [{ ...content, data: transformedData }];
  }
  return [content];
}

export default function ContentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const quizType = searchParams.get("quizType");

  const { content, isLoading, error, mutate } = useContent(contentId);

  const [siblingContent, setSiblingContent] = useState<Content[]>([]);
  const unitId = content?.unit?.id || content?.unit_id || "";
  const { contents: unitContents } = useUnitContent(unitId);

  useEffect(() => {
    if (content && unitContents && unitContents.length > 0) {
      const sameType = unitContents.filter((c) => c.type === content.type);
      setSiblingContent(sameType);
    }
  }, [content, unitContents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !content) {
    return <ErrorState message="Content not found." onRetry={() => mutate()} />;
  }

  const subjectName = content.unit?.subject?.name;
  const subjectCode = content.unit?.subject?.code;
  const subjectId = content.unit?.subject?.id;
  const caption = `${subjectCode ?? subjectName ?? ""} · ${
    TYPE_CAPTIONS[content.type] ?? "TOPIC"
  }${content.unit?.unitNumber ? ` ${content.unit.unitNumber}` : ""}`;

  const isFlashcard = content.type === "flashcard";
  const isQuiz = content.type === "quiz";

  // Flashcards and Retrieval Lab use full-screen focused mode (their own headers)
  if (isFlashcard) {
    const cards = expandFlashcards(
      siblingContent.length > 0 ? siblingContent : [content],
    );
    return (
      <FlashcardViewer
        flashcards={cards}
        backHref={subjectId ? `/subjects/${subjectId}` : "/learn"}
        title={content.title}
        subjectCode={subjectCode}
      />
    );
  }

  if (isQuiz) {
    const questions = quizType
      ? extractQuizSection(content, quizType)
      : siblingContent.length > 0
        ? siblingContent
        : [content];
    return (
      <QuizViewer
        questions={questions}
        backHref={subjectId ? `/subjects/${subjectId}` : "/learn"}
        title={content.title}
        subjectCode={subjectCode}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <TopHeader
        back={subjectId ? `/subjects/${subjectId}` : "/learn"}
        caption={caption}
        title={content.title}
        rightIcon={<Filter className="h-4 w-4" />}
      />

      <div className="px-5 pb-12 md:px-8 lg:px-12 lg:max-w-3xl xl:max-w-4xl lg:mx-auto">
        {(content.type === "long_notes" || content.type === "short_notes") && (
          <NotesView content={content} />
        )}

        {content.type === "exam_tips" && <ExamTipsView content={content} />}

        {content.type === "paper_predictor" && (
          <PredictorPaperView content={content} />
        )}

        {(content.type === "pyqs" ||
          content.type === "syllabus" ||
          content.type === "assignments") && (
          <PyqsViewer
            content={siblingContent.length > 0 ? siblingContent : [content]}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Notes (long + short)
// ─────────────────────────────────────────────────────────
function NotesView({ content }: { content: Content }) {
  const data = content.data as any;
  const html: string | undefined = data?.html;
  const text: string | undefined = data?.content;
  const summary: string | undefined = data?.summary || data?.tldr;

  return (
    <div className="mt-2">
      <div className="mb-4 flex flex-wrap gap-2">
        <Pill variant="mint">↗ {Math.floor(60 + Math.random() * 36)}% repeat</Pill>
        <Pill>⏱ {Math.floor(8 + Math.random() * 12)} min read</Pill>
      </div>
      <p className="caption mb-5">
        {Math.floor(8 + Math.random() * 8)} marks · expected
      </p>

      {summary && (
        <HighlightCard
          caption={
            <>
              <span className="text-mint-400">AI SUMMARY</span> · 30 SEC
            </>
          }
          dot="mint"
          className="mb-6"
        >
          <p className="text-[14px] leading-relaxed text-chalk-200">{summary}</p>
        </HighlightCard>
      )}

      <div className="prose-notes">
        {html ? (
          <HtmlContent html={html} />
        ) : text ? (
          <NotesViewerWithTracking content={content} />
        ) : (
          <p className="text-chalk-400 text-[13px]">No content yet.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Exam tips
// ─────────────────────────────────────────────────────────
function ExamTipsView({ content }: { content: Content }) {
  const data = content.data as any;
  const html: string | undefined = data?.html;
  const tips: any[] = Array.isArray(data?.tips)
    ? data.tips
    : Array.isArray(data?.exam_tips)
      ? data.exam_tips
      : [];

  if (html) {
    return (
      <div className="prose-notes mt-2">
        <HtmlContent html={html} />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      {tips.length === 0 ? (
        <p className="text-[13px] text-chalk-400">No tips yet.</p>
      ) : (
        tips.map((t, i) => (
          <article
            key={i}
            className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
          >
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono text-chalk-500">
                P-{String(i + 1).padStart(2, "0")}
              </span>
              {t.tag && <Pill variant="mint">{t.tag}</Pill>}
            </div>
            <h3 className="text-[15px] font-semibold text-[rgb(var(--fg))]">
              {t.title || t.heading || `Tip ${i + 1}`}
            </h3>
            {t.body && (
              <p className="mt-2 text-[13px] leading-relaxed text-chalk-300">
                {t.body}
              </p>
            )}
          </article>
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Predictor paper view
// ─────────────────────────────────────────────────────────
function PredictorPaperView({ content }: { content: Content }) {
  const data = content.data as any;
  const html: string | undefined = data?.html;

  if (html) {
    return (
      <div className="prose-notes mt-2">
        <HtmlContent html={html} />
      </div>
    );
  }

  const sections: any[] = Array.isArray(data?.sections) ? data.sections : [];
  const meta = data?.meta || {};

  return (
    <div className="mt-2 space-y-6">
      {/* Meta */}
      <div className="grid grid-cols-3 gap-2 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
        <Stat label="Time" value={meta.duration || "3 hours"} />
        <Stat label="Marks" value={meta.totalMarks || "100"} />
        <Stat
          label="Confidence"
          value={`${meta.confidence || 88}%`}
          tone="mint"
        />
      </div>

      {sections.length === 0 ? (
        <p className="text-[13px] text-chalk-400">
          Predictor paper has no sections yet.
        </p>
      ) : (
        sections.map((s, si) => (
          <section key={si}>
            <SectionHeader
              title={`${String.fromCharCode(65 + si)}  ${s.title || "Section"}`}
              meta={s.meta || s.weight}
            />
            <div className="mt-3 space-y-4">
              {(s.questions || []).map((q: any, qi: number) => (
                <article
                  key={qi}
                  className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="caption">{q.cluster || "Topic"}</p>
                    <Pill variant="mint">{q.confidence || "HIGH"}</Pill>
                  </div>
                  <p className="text-[14px] leading-relaxed text-[rgb(var(--fg))]">
                    Q{qi + 1}. {q.text || q.question}
                  </p>
                  {q.marks && (
                    <p className="mt-2 text-[10px] uppercase tracking-cap text-chalk-500">
                      [ {q.marks} marks ]
                    </p>
                  )}
                  {q.trap && (
                    <div className="mt-3">
                      <AnnotationBlock label="Common trap" tone="flame">
                        {q.trap}
                      </AnnotationBlock>
                    </div>
                  )}
                  {q.evidence && (
                    <div className="mt-2">
                      <AnnotationBlock label="PYQ evidence" tone="mint">
                        {q.evidence}
                      </AnnotationBlock>
                    </div>
                  )}
                  {q.note && (
                    <div className="mt-2">
                      <AnnotationBlock label="Strategic note" tone="mint">
                        {q.note}
                      </AnnotationBlock>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "mint";
}) {
  return (
    <div>
      <p className="caption mb-1">{label}</p>
      <p
        className={`text-[15px] font-bold ${tone === "mint" ? "text-mint" : "text-[rgb(var(--fg))]"}`}
      >
        {value}
      </p>
    </div>
  );
}
