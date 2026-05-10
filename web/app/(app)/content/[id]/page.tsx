"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { useReadingTracker } from "@/lib/hooks/useReadingTracker";
import { useStudySession } from "@/lib/hooks/useStudySession";
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
import { ReadingView } from "@/components/unisage/ReadingView";
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
  const pushCard = (
    item: Content,
    idx: number,
    front: any,
    back: any,
  ) => {
    const f = typeof front === "string" ? front : front?.text ?? String(front ?? "");
    const b = typeof back === "string" ? back : back?.text ?? String(back ?? "");
    if (!f || !b) return;
    result.push({
      ...item,
      id: `${item.id}-${idx}`,
      data: { front: f, back: b },
    });
  };

  for (const item of contentItems) {
    let d: any = item.data;
    // Stringified JSON
    if (typeof d === "string") {
      try {
        d = JSON.parse(d);
      } catch {
        continue;
      }
    }
    if (!d) continue;

    // Common shapes
    const candidates: any[] =
      (Array.isArray(d.items) && d.items) ||
      (Array.isArray(d.flashcards) && d.flashcards) ||
      (Array.isArray(d.cards) && d.cards) ||
      [];

    if (candidates.length > 0) {
      candidates.forEach((card: any, idx: number) =>
        pushCard(item, idx, card.front ?? card.q ?? card.question, card.back ?? card.a ?? card.answer),
      );
    } else if (d.front && d.back) {
      pushCard(item, 0, d.front, d.back);
    } else if (d.q && d.a) {
      pushCard(item, 0, d.q, d.a);
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

  // Subject-level session lifecycle. Independent of useReadingTracker
  // (which is per-content). Session attribution lets the rollup credit
  // time to a subject even if the user opens many pieces of content.
  useStudySession(content?.unit?.subject?.id || null);

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

      <div className="px-5 pb-16 md:px-8 lg:px-10 xl:px-14 lg:max-w-[1280px] mx-auto">
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
// Active-time tracking: useReadingTracker pauses on tab hidden / 60s idle,
// heartbeats every 30s, flushes on unload. Replaces the prior dead 15s
// timer-based "tracker" that inflated time for backgrounded tabs.
// ─────────────────────────────────────────────────────────
function NotesView({ content }: { content: Content }) {
  useReadingTracker({
    contentId: content.id,
    subjectId: content.unit?.subject?.id || null,
    getViewState: () => {
      if (typeof window === "undefined") return {};
      const doc = document.documentElement;
      const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
      const scrollPct = Math.min(
        100,
        Math.max(0, Math.round((window.scrollY / scrollable) * 100))
      );
      const sections: string[] = [];
      try {
        const headings = document.querySelectorAll("[data-rv-heading]");
        headings.forEach((h) => {
          const rect = (h as HTMLElement).getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0 && (h as HTMLElement).id) {
            sections.push((h as HTMLElement).id);
          }
        });
      } catch {
        // best-effort
      }
      return { maxScrollPct: scrollPct, sectionsViewed: sections };
    },
  });

  const data = content.data as any;
  const htmlRaw: string | undefined = data?.html;
  const text: string | undefined = data?.content;
  const summary: string | undefined = data?.summary || data?.tldr;

  // Compute approx read time from content length
  const wordCount = (htmlRaw || text || "")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(wordCount / 220));

  // Convert plain text to HTML paragraphs if no html provided
  const html =
    htmlRaw ||
    (text
      ? `<p>${text
          .split(/\n\n+/)
          .map((p) => p.replace(/\n/g, "<br/>"))
          .join("</p><p>")}</p>`
      : "");

  if (!html) {
    return (
      <div className="mt-4 rounded-card border border-dashed border-white/[0.08] py-12 text-center">
        <p className="text-[13.5px] text-chalk-400">
          No notes content available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Pill>⏱ {minutes} min read</Pill>
        <Pill>{wordCount.toLocaleString()} words</Pill>
        {content.type === "short_notes" && (
          <Pill variant="mint">Cheat sheet</Pill>
        )}
      </div>

      {summary && (
        <HighlightCard
          caption={
            <>
              <span className="text-mint-400">AI SUMMARY</span> · 30 SEC
            </>
          }
          dot="mint"
          className="mb-8"
        >
          <p className="text-[14px] leading-relaxed text-chalk-200">{summary}</p>
        </HighlightCard>
      )}

      <ReadingView html={html} />
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
  // The admin can store paper predictor JSON in many shapes. Walk the data
  // and pluck out (sections[], meta, html) from whichever wrapper it lives
  // under. Falls back gracefully if nothing matches.
  const data = (() => {
    let d: any = content.data;
    if (typeof d === "string") {
      try { d = JSON.parse(d); } catch { d = {}; }
    }
    return d || {};
  })();

  // Resolve html from any common location.
  const html: string | undefined =
    data?.html ?? data?.predicted_paper?.html ?? data?.paper?.html ?? data?.body;

  if (html) {
    return (
      <div className="prose-notes mt-2">
        <HtmlContent html={html} />
      </div>
    );
  }

  // Resolve sections[] from any common nesting; tolerate alternate keys.
  const sectionsRaw: any[] =
    (Array.isArray(data?.sections) && data.sections) ||
    (Array.isArray(data?.predicted_paper?.sections) && data.predicted_paper.sections) ||
    (Array.isArray(data?.paper?.sections) && data.paper.sections) ||
    (Array.isArray(data?.parts) && data.parts) ||
    [];

  // If the JSON is just a flat list of questions, wrap it in one section.
  const flatQuestions: any[] =
    (Array.isArray(data?.questions) && data.questions) ||
    (Array.isArray(data?.predicted_paper?.questions) && data.predicted_paper.questions) ||
    [];

  const sections: any[] =
    sectionsRaw.length > 0
      ? sectionsRaw
      : flatQuestions.length > 0
        ? [{ title: "Predicted questions", questions: flatQuestions }]
        : [];

  // Normalize each section's questions[] so the renderer below can rely on
  // q.text / q.marks / q.cluster / q.confidence regardless of input shape.
  const normalizedSections = sections.map((s: any) => {
    const qs: any[] = Array.isArray(s.questions)
      ? s.questions
      : Array.isArray(s.items)
        ? s.items
        : Array.isArray(s.qs)
          ? s.qs
          : [];
    return {
      title: s.title ?? s.name ?? s.heading ?? "Section",
      meta: s.meta ?? s.weight ?? s.marks ?? null,
      questions: qs.map((q: any) => ({
        text: q.text ?? q.question ?? q.statement ?? q.prompt ?? "",
        marks: q.marks ?? q.mark ?? null,
        cluster: q.cluster ?? q.topic ?? q.tag ?? null,
        confidence: q.confidence ?? q.probability ?? null,
        trap: q.trap ?? q.common_trap ?? null,
        evidence: q.evidence ?? q.pyq_evidence ?? null,
        note: q.note ?? q.strategy ?? q.tip ?? null,
      })).filter((q: any) => q.text),
    };
  });

  const meta = data?.meta ?? data?.predicted_paper?.meta ?? data?.paper?.meta ?? {};

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

      {normalizedSections.length === 0 ? (
        <p className="text-[13px] text-chalk-400">
          Predictor paper has no sections yet.
        </p>
      ) : (
        normalizedSections.map((s, si) => (
          <section key={si}>
            <SectionHeader
              title={`${String.fromCharCode(65 + si)}  ${s.title}`}
              meta={s.meta}
            />
            <div className="mt-3 space-y-4">
              {(s.questions || []).map((q: any, qi: number) => (
                <article
                  key={qi}
                  className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="caption">{q.cluster || "Topic"}</p>
                    {q.confidence && (
                      <Pill variant="mint">
                        {typeof q.confidence === "number"
                          ? `${q.confidence}%`
                          : String(q.confidence).toUpperCase()}
                      </Pill>
                    )}
                  </div>
                  <p className="text-[14px] leading-relaxed text-[rgb(var(--fg))]">
                    Q{qi + 1}. {q.text}
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
