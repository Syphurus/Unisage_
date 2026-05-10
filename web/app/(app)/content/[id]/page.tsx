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

function parseFlexibleJson(raw: string) {
  const normalized = String(raw)
    .trim()
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  try {
    return JSON.parse(normalized);
  } catch {
    return JSON.parse(normalized.replace(/,\s*([}\]])/g, "$1"));
  }
}

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
        {(content.type === "long_notes" ||
          content.type === "short_notes" ||
          content.type === "exam_tips") && <NotesView content={content} />}

        {/* exam_tips with no html (legacy structured `tips[]` shape) still
            falls through to the original list renderer */}
        {content.type === "exam_tips" &&
          !((content.data as any)?.html) &&
          !(content.data as any)?.content && <ExamTipsView content={content} />}

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
      try {
        d = parseFlexibleJson(d);
      } catch {
        d = {};
      }
    }
    return d || {};
  })();

  // Rich predictions[] shape — the canonical worksheet/PYQ-backed format.
  // Detected by the presence of a non-empty predictions array.
  if (Array.isArray(data?.predictions) && data.predictions.length > 0) {
    return <RichPredictorView data={data} />;
  }

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

// ─────────────────────────────────────────────────────────
// Rich predictor view — canonical worksheet/PYQ-backed shape.
// Renders the JSON produced by the prediction engine: header meta,
// confidence stats, exam structure, unit-wise marks forecast, prediction
// cards (each with steps/formulas/source refs/hinglish tip), worksheets
// priority map, and exam strategy.
// ─────────────────────────────────────────────────────────
function RichPredictorView({ data }: { data: any }) {
  const cs = data.confidence_summary || {};
  const es = data.exam_structure_confirmed || {};
  const sections = es.sections || {};
  const uw = data.unit_wise_marks_forecast || {};
  const strat = data.exam_strategy || {};
  const wpm = data.worksheets_priority_map || {};
  const sap = data.section_a_complete_prep || {};
  const preds: any[] = Array.isArray(data.predictions) ? data.predictions : [];

  return (
    <div className="mt-2 space-y-8">
      {/* Header */}
      <header className="rounded-card border border-mint-500/20 bg-[rgb(var(--bg-elev))] p-5 lg:p-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 inline-block rounded-full bg-mint-400 animate-pulse-soft" />
          <span className="text-[10px] font-semibold uppercase tracking-cap text-mint-400">
            Predicted paper · {data.course_code || ""}
          </span>
        </div>
        <h2 className="mt-2 text-[24px] lg:text-[28px] font-bold tracking-[-0.01em] text-[rgb(var(--fg))]">
          {data.subject || "Subject"}
        </h2>
        <p className="mt-1 text-[12.5px] text-chalk-400">
          {data.programme || ""}
          {data.semester ? ` · Sem ${data.semester}` : ""}
          {data.session ? ` · ${data.session}` : ""}
        </p>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KV label="Exam date" value={data.exam_date} />
          <KV label="Generated" value={data.prediction_generated} />
          <KV label="Valid until" value={data.prediction_valid_until} />
          <KV label="College" value={data.college} />
        </div>
      </header>

      {/* Confidence stats */}
      {Object.keys(cs).length > 0 && (
        <section>
          <SectionHeader title="Model confidence" meta={cs.methodology} />
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat2 label="Expected accuracy" value={cs.expected_accuracy || "—"} tone="mint" />
            <Stat2 label="Total predictions" value={cs.total_predicted_questions ?? preds.length} />
            <Stat2 label="High confidence" value={cs.high_confidence_predictions ?? "—"} tone="mint" />
            <Stat2 label="Medium confidence" value={cs.medium_confidence_predictions ?? "—"} />
          </div>
          {cs.overall_accuracy_claim && (
            <p className="mt-3 text-[12.5px] text-chalk-400">{cs.overall_accuracy_claim}</p>
          )}
        </section>
      )}

      {/* Exam structure */}
      {Object.keys(sections).length > 0 && (
        <section>
          <SectionHeader
            title="Exam structure"
            meta={`${es.total_marks ?? "—"} marks · ${es.time ?? "—"}`}
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(sections).map(([k, v]: any) => (
              <div
                key={k}
                className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
              >
                <p className="caption">{k.replace(/_/g, " ")}</p>
                <p className="mt-1.5 text-[14px] font-semibold text-[rgb(var(--fg))]">
                  {v?.pattern || ""}
                </p>
                {v?.typical_style && (
                  <p className="mt-1.5 text-[12px] text-chalk-400 leading-relaxed">
                    {v.typical_style}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v?.all_compulsory && <Pill variant="mint">All compulsory</Pill>}
                  {v?.has_OR && <Pill>Has OR</Pill>}
                </div>
              </div>
            ))}
          </div>
          {es.note && (
            <p className="mt-3 text-[12px] text-chalk-400 italic">{es.note}</p>
          )}
        </section>
      )}

      {/* Unit-wise marks forecast */}
      {Object.keys(uw).length > 0 && (
        <section>
          <SectionHeader title="Unit-wise marks forecast" />
          <ul className="mt-4 space-y-2.5">
            {Object.entries(uw).map(([k, v]: any) => {
              const pct = parseInt(String(v?.percentage || "0"), 10) || 0;
              const tone = pct >= 30 ? "mint" : pct >= 15 ? "ember" : "flame";
              return (
                <li key={k} className="flex items-center gap-3 text-[13px]">
                  <span className="w-44 lg:w-56 shrink-0 text-chalk-200 truncate">
                    {k.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={
                          tone === "mint"
                            ? "h-full bg-mint-400"
                            : tone === "ember"
                            ? "h-full bg-ember-400"
                            : "h-full bg-flame-500"
                        }
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-20 shrink-0 text-right font-semibold text-[rgb(var(--fg))] tabular-nums">
                    {v?.predicted_marks ?? "—"} m
                  </span>
                  <span className="w-12 shrink-0 text-right text-chalk-400 tabular-nums">
                    {v?.percentage}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Predictions */}
      <section>
        <SectionHeader title="Predictions" meta={`${preds.length} questions ranked by priority`} />
        <div className="mt-4 space-y-4">
          {preds.map((p, i) => (
            <PredictionCard key={p.id || i} pred={p} />
          ))}
        </div>
      </section>

      {/* Section A prep */}
      {Array.isArray(sap.likely_topics) && sap.likely_topics.length > 0 && (
        <section>
          <SectionHeader title="Section A · short questions" meta={sap.description} />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {sap.likely_topics.map((t: any, i: number) => (
              <div
                key={i}
                className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
              >
                <p className="text-[13.5px] font-semibold text-[rgb(var(--fg))]">
                  {t.topic}
                </p>
                <p className="mt-1 text-[12px] text-chalk-400">Source: {t.source}</p>
                {t["2025_precedent"] && (
                  <p className="mt-1 text-[11.5px] text-mint-400">
                    PYQ precedent: {t["2025_precedent"]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Worksheets priority map */}
      {Object.keys(wpm).length > 0 && (
        <section>
          <SectionHeader title="Worksheet priority" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(wpm).map(([k, v]: any) => {
              const tone =
                v?.priority?.includes("HIGHEST")
                  ? "mint"
                  : v?.priority?.includes("HIGH")
                  ? "ember"
                  : "flame";
              return (
                <div
                  key={k}
                  className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-[rgb(var(--fg))]">
                      {k.replace(/_/g, " ")}
                    </p>
                    <Pill
                      variant={
                        tone === "mint" ? "mint" : tone === "ember" ? "ember" : "flame"
                      }
                    >
                      {v?.priority}
                    </Pill>
                  </div>
                  {v?.reason && (
                    <p className="mt-2 text-[12px] text-chalk-400 leading-relaxed">
                      {v.reason}
                    </p>
                  )}
                  {Array.isArray(v?.must_solve) && v.must_solve.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.must_solve.map((q: string) => (
                        <span
                          key={q}
                          className="rounded-pill border border-white/[0.08] px-2 py-0.5 text-[10.5px] font-mono text-chalk-300"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Exam strategy */}
      {Object.keys(strat).length > 0 && (
        <section>
          <SectionHeader title="Exam strategy" />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {strat.section_c_first && (
              <StratCard label="Section C first" body={strat.section_c_first} />
            )}
            {strat.section_b_order && (
              <StratCard label="Section B order" body={strat.section_b_order} />
            )}
            {strat.section_a_tip && (
              <StratCard label="Section A tip" body={strat.section_a_tip} />
            )}
            {strat.marks_optimization && (
              <StratCard label="Marks optimization" body={strat.marks_optimization} />
            )}
          </div>
          {strat.time_allocation && (
            <div className="mt-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
              <p className="caption mb-2">Time allocation</p>
              <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(strat.time_allocation).map(([k, v]: any) => (
                  <li key={k}>
                    <p className="text-[10.5px] uppercase tracking-cap text-chalk-500">
                      {k.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-[14px] font-semibold text-[rgb(var(--fg))]">
                      {String(v)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {strat.hinglish_summary && (
            <div className="mt-3 rounded-card border border-mint-500/20 bg-mint-500/[0.04] p-4">
              <p className="caption text-mint-400 mb-1.5">Hinglish summary</p>
              <p className="text-[13px] leading-relaxed text-chalk-200">
                {strat.hinglish_summary}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// Per-prediction card. Intentionally dense — every field in the JSON
// surfaces somewhere so the prediction stays auditable.
function PredictionCard({ pred }: { pred: any }) {
  const conf = pred.confidence_score ?? 0;
  const tone = conf >= 90 ? "mint" : conf >= 80 ? "ember" : "flame";
  const hta = pred.how_to_answer || {};
  const orv = pred.or_variant;

  return (
    <article className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-5 lg:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-chalk-500">
            #{String(pred.priority_rank ?? "").padStart(2, "0")} ·{" "}
            {pred.section ? `Section ${pred.section}` : ""}
            {pred.unit ? ` · ${pred.unit}` : ""}
            {pred.co ? ` · ${pred.co}` : ""}
          </p>
          {pred.topic && (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-cap text-chalk-400">
              {pred.topic}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pred.marks && (
            <span className="rounded-pill border border-white/[0.1] px-2.5 py-0.5 text-[11px] font-semibold text-chalk-200">
              {pred.marks} marks
            </span>
          )}
          <Pill
            variant={tone === "mint" ? "mint" : tone === "ember" ? "ember" : "flame"}
          >
            {conf}% · {pred.confidence_level || ""}
          </Pill>
        </div>
      </div>

      {/* Question */}
      {pred.predicted_question && (
        <p className="mt-3 text-[15px] lg:text-[16px] leading-relaxed text-[rgb(var(--fg))] whitespace-pre-wrap">
          {pred.predicted_question}
        </p>
      )}

      {/* Reasoning */}
      {pred.confidence_reasoning && (
        <div className="mt-3">
          <AnnotationBlock label="Why this is likely" tone="mint">
            {pred.confidence_reasoning}
          </AnnotationBlock>
        </div>
      )}

      {/* Source references */}
      {Array.isArray(pred.source_references) && pred.source_references.length > 0 && (
        <div className="mt-3">
          <p className="caption mb-1.5">Source references</p>
          <ul className="flex flex-wrap gap-1.5">
            {pred.source_references.map((s: string, i: number) => (
              <li
                key={i}
                className="rounded-pill border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[11.5px] text-chalk-300"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* OR variant */}
      {orv?.question && (
        <div className="mt-3 rounded-card border border-ember-400/20 bg-ember-400/[0.04] p-4">
          <p className="caption text-ember-400 mb-1.5">OR variant</p>
          <p className="text-[13.5px] leading-relaxed text-chalk-200 whitespace-pre-wrap">
            {orv.question}
          </p>
          {orv.source && (
            <p className="mt-2 text-[11px] text-chalk-500">Source: {orv.source}</p>
          )}
        </div>
      )}

      {/* How to answer */}
      {(Array.isArray(hta.steps) && hta.steps.length > 0) ||
      (Array.isArray(hta.key_formulas) && hta.key_formulas.length > 0) ||
      hta.time_estimate ? (
        <div className="mt-3 rounded-card border border-white/[0.06] p-4">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <p className="caption">How to answer</p>
            {hta.time_estimate && (
              <p className="text-[11px] font-semibold text-mint-400">
                {hta.time_estimate}
              </p>
            )}
          </div>
          {Array.isArray(hta.steps) && hta.steps.length > 0 && (
            <ol className="space-y-1.5 text-[13px] text-chalk-200 list-decimal pl-4">
              {hta.steps.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {Array.isArray(hta.key_formulas) && hta.key_formulas.length > 0 && (
            <div className="mt-3">
              <p className="caption mb-1.5">Key formulas</p>
              <ul className="flex flex-wrap gap-1.5">
                {hta.key_formulas.map((f: string, i: number) => (
                  <li
                    key={i}
                    className="rounded-pill border border-mint-500/20 bg-mint-500/5 px-2.5 py-1 text-[11.5px] font-mono text-mint-400"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(hta.common_mistakes) && hta.common_mistakes.length > 0 && (
            <div className="mt-3">
              <AnnotationBlock label="Common mistakes" tone="flame">
                <ul className="space-y-0.5 list-disc pl-4">
                  {hta.common_mistakes.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </AnnotationBlock>
            </div>
          )}
        </div>
      ) : null}

      {/* Specific questions to prepare */}
      {Array.isArray(pred.specific_questions_to_prepare) &&
        pred.specific_questions_to_prepare.length > 0 && (
          <div className="mt-3">
            <p className="caption mb-1.5">Specific questions to prepare</p>
            <ul className="space-y-1.5 text-[12.5px] text-chalk-300 list-disc pl-4">
              {pred.specific_questions_to_prepare.map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

      {/* Hinglish tip */}
      {pred.hinglish_tip && (
        <div className="mt-3 rounded-card border border-mint-500/20 bg-mint-500/[0.04] p-4">
          <p className="caption text-mint-400 mb-1.5">Hinglish tip</p>
          <p className="text-[13px] leading-relaxed text-chalk-200 whitespace-pre-wrap">
            {pred.hinglish_tip}
          </p>
        </div>
      )}
    </article>
  );
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-cap text-chalk-500">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-[rgb(var(--fg))]">
        {value || "—"}
      </p>
    </div>
  );
}

function Stat2({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "mint";
}) {
  return (
    <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
      <p className="caption">{label}</p>
      <p
        className={`mt-1 text-[20px] font-bold ${tone === "mint" ? "text-mint" : "text-[rgb(var(--fg))]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StratCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4">
      <p className="caption mb-1.5">{label}</p>
      <p className="text-[13px] leading-relaxed text-chalk-200">{body}</p>
    </div>
  );
}
