"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  X,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { Pill, PrimaryButton, OutlineButton } from "@/components/unisage/primitives";
import { quizAPI } from "@/lib/api";
import type { Content } from "@/lib/types";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface QuizViewerProps {
  questions: Content[];
  subjectId?: string;
  backHref?: string;
  title?: string;
  subjectCode?: string;
}

/**
 * Extract a flat list of QuizQuestion from whatever shape the admin stored.
 * Supported shapes (any of these can appear inside `data`):
 *   { questions: [{ question, options: [{text,isCorrect}|string], correctAnswer? }] }
 *   { questions: [{ question, options: [...], correct_option: "B" or "0" or 0 }] }
 *   { mini_quizzes: [{ questions: [...] }, ...] }
 *   { unit_quiz: { questions: [...] } }
 *   { true_false: { questions: [{ statement, answer: true|false }] } }
 *   { fill_in_blanks: { questions: [{ prompt, answer, acceptable_answers? }] } }
 *   { question, options, correct_answer }                  (flat single)
 * Stringified JSON in data is also handled.
 */
function extractQuestions(contentItems: Content[]): QuizQuestion[] {
  const out: QuizQuestion[] = [];

  const letterToIndex = (s: string): number | null => {
    if (!s) return null;
    const ch = s.trim().toUpperCase().charAt(0);
    if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 65;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

  const pushQuestion = (q: any) => {
    if (!q || typeof q !== "object") return;
    const questionText: string =
      q.question ?? q.statement ?? q.prompt ?? q.title ?? q.text ?? "";
    if (!questionText) return;

    let opts: string[] = [];
    let correctIndex = 0;

    if (Array.isArray(q.options) && q.options.length > 0) {
      q.options.forEach((o: any, i: number) => {
        if (typeof o === "string") {
          opts.push(o);
        } else if (o && typeof o === "object") {
          opts.push(o.text ?? o.label ?? o.value ?? String(o));
          if (o.isCorrect || o.correct === true) correctIndex = i;
        }
      });
      // Resolve correct answer if it wasn't marked on options
      if (q.correct_option !== undefined) {
        const idx = letterToIndex(String(q.correct_option));
        if (idx !== null) correctIndex = idx;
        // also support "matches the text"
        const matchIdx = opts.findIndex(
          (t) =>
            t &&
            (t === q.correct_option || t.endsWith(String(q.correct_option))),
        );
        if (matchIdx >= 0) correctIndex = matchIdx;
      }
      if (typeof q.correctAnswer === "number") correctIndex = q.correctAnswer;
      if (typeof q.correct_answer === "number") correctIndex = q.correct_answer;
      if (typeof q.correctIndex === "number") correctIndex = q.correctIndex;
    } else if (q.answer !== undefined && (q.statement || q.prompt)) {
      // True/False
      opts = ["True", "False"];
      correctIndex =
        q.answer === true || String(q.answer).toLowerCase() === "true" ? 0 : 1;
    } else if (q.answer !== undefined) {
      // Fill in the blanks — render answer + acceptable as choices, answer first
      const answer = String(q.answer);
      const acc: string[] = Array.isArray(q.acceptable_answers)
        ? q.acceptable_answers.filter((a: any) => a && String(a) !== answer)
        : [];
      opts = [answer, ...acc.map(String)];
      correctIndex = 0;
    }

    if (opts.length === 0) return;
    out.push({
      question: questionText,
      options: opts,
      correctIndex,
      explanation: q.explanation,
    });
  };

  const visit = (data: any) => {
    if (!data) return;
    // Strings: try to JSON.parse
    if (typeof data === "string") {
      try {
        return visit(JSON.parse(data));
      } catch {
        return;
      }
    }
    if (Array.isArray(data)) {
      data.forEach(visit);
      return;
    }
    if (typeof data !== "object") return;

    if (Array.isArray(data.questions)) {
      data.questions.forEach(pushQuestion);
    }
    if (Array.isArray(data.mini_quizzes)) {
      data.mini_quizzes.forEach((mq: any) =>
        Array.isArray(mq?.questions) ? mq.questions.forEach(pushQuestion) : null,
      );
    }
    if (data.unit_quiz?.questions) {
      data.unit_quiz.questions.forEach(pushQuestion);
    }
    if (data.true_false?.questions) {
      data.true_false.questions.forEach(pushQuestion);
    }
    if (data.fill_in_blanks?.questions) {
      data.fill_in_blanks.questions.forEach(pushQuestion);
    }
    // Flat single question (no questions[] wrapper)
    if (
      data.question !== undefined &&
      !Array.isArray(data.questions) &&
      Array.isArray(data.options)
    ) {
      pushQuestion(data);
    }
  };

  for (const item of contentItems) {
    visit((item as any).data);
  }
  return out;
}

export function QuizViewer({
  questions: contentItems,
  backHref,
  title,
  subjectCode,
}: QuizViewerProps) {
  const router = useRouter();
  const allQuestions = useMemo(() => extractQuestions(contentItems), [contentItems]);
  const total = Math.max(allQuestions.length, 1);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Per-question response time. Tracked in refs so we don't trigger
  // re-renders on every tick and so the value is captured at the moment
  // of answer (not at submit time).
  const questionShownAtRef = useRef<number>(Date.now());
  const responseMsRef = useRef<number[]>([]);

  useEffect(() => {
    setAnswers(Array(total).fill(null));
    setIdx(0);
    setSelected(null);
    setScore(0);
    setTime(0);
    setDone(false);
    responseMsRef.current = Array(total).fill(0);
    questionShownAtRef.current = Date.now();
  }, [total]);

  // Stamp the start time each time a new question is shown.
  useEffect(() => {
    questionShownAtRef.current = Date.now();
  }, [idx]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setTime((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [done]);

  const current = allQuestions[idx];

  const next = () => {
    if (selected != null && current) {
      // Capture response time for this question at the moment of answer.
      // Cap at 1h so a tab left open doesn't write absurd values.
      const responseMs = Math.min(
        60 * 60 * 1000,
        Math.max(0, Date.now() - questionShownAtRef.current)
      );
      const arr = responseMsRef.current.slice();
      arr[idx] = responseMs;
      responseMsRef.current = arr;

      setAnswers((prev) => {
        const next = [...prev];
        next[idx] = selected;
        return next;
      });
      if (selected === current.correctIndex) {
        setScore((s) => s + 4);
      }
    }
    if (idx >= total - 1) {
      setDone(true);
      // Submit attempt with per-question breakdown so the cron can roll
      // it into quiz_question_stats.
      try {
        // Resolve final answer + correctness arrays by treating the
        // current selection as the answer for the current index.
        const finalAnswers = answers.map((a, i) =>
          i === idx ? selected : a
        );
        const correct = allQuestions.filter(
          (q, i) => finalAnswers[i] === q.correctIndex
        ).length;
        const contentId = contentItems[0]?.id;
        if (contentId) {
          // Per-question payload matches the server's persisted shape.
          const perQuestion = allQuestions.map((q, i) => ({
            i,
            selected: finalAnswers[i] ?? null,
            correct: finalAnswers[i] === q.correctIndex,
            ms: responseMsRef.current[i] ?? null,
          }));

          quizAPI.submitAttempt({
            contentId,
            score: correct, // server stores raw correct count
            totalQuestions: total,
            answers: finalAnswers.map((a, i) => ({
              questionIndex: i,
              selectedIndex: a,
              correct: a === allQuestions[i]?.correctIndex,
            })),
            timeTaken: time,
            perQuestion,
          } as any);
        }
      } catch {
        // analytics submission must never break completion UX
      }
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  const reset = () => {
    setIdx(0);
    setSelected(null);
    setAnswers(Array(total).fill(null));
    setScore(0);
    setTime(0);
    setDone(false);
  };

  const onBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  if (!current) {
    return (
      <div className="p-8 text-center text-[13px] text-chalk-400">
        No questions available.
      </div>
    );
  }

  if (done) {
    const correct = answers.filter(
      (a, i) => a !== null && a === allQuestions[i]?.correctIndex,
    ).length;
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="min-h-screen px-5 pt-12 pb-32 text-center mx-auto w-full lg:max-w-2xl">
        <Trophy className="mx-auto h-12 w-12 text-mint-400" />
        <h1 className="mt-6 text-[28px] font-bold text-[rgb(var(--fg))]">
          Lab session complete
        </h1>
        <p className="mt-2 text-[14px] text-chalk-300">
          {correct} of {total} correct · {fmt(time)}
        </p>
        <p className="mt-8 text-[64px] font-bold text-mint">{pct}%</p>
        <p className="text-[10px] uppercase tracking-cap text-chalk-500">
          Recall accuracy
        </p>
        <div className="mt-8 mx-auto max-w-sm space-y-3">
          <PrimaryButton onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Drill again
          </PrimaryButton>
          <OutlineButton onClick={onBack}>Back to subject</OutlineButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 mx-auto w-full lg:max-w-2xl">
      <header className="flex items-center justify-between gap-4 px-5 pt-5">
        <button
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-[rgb(var(--fg))] hover:bg-white/[0.05]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
            RETRIEVAL LAB · Q {idx + 1}/{total}
          </span>
          <span className="text-[20px] font-bold tabular-nums text-mint">
            {fmt(time)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[14px] font-bold tabular-nums text-mint">
            +{score}
          </span>
        </div>
      </header>

      <div className="px-5 pt-5">
        <Pill variant="mint" className="mb-4">
          ↗ {Math.floor(60 + Math.random() * 36)}% probability cluster
        </Pill>
        <h1 className="text-[22px] font-bold leading-snug tracking-[-0.005em] text-[rgb(var(--fg))]">
          {current.question}
        </h1>
      </div>

      <div className="mt-6 px-5 space-y-2.5">
        {current.options.map((opt, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "block w-full rounded-card border px-4 py-3.5 text-left transition-colors",
                active
                  ? "border-mint-500 bg-mint-500/10 text-[rgb(var(--fg))]"
                  : "border-white/[0.08] bg-[rgb(var(--bg-elev))] text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--bg-subtle))]",
              )}
            >
              <span className="text-[14px] leading-snug">{opt}</span>
            </button>
          );
        })}
      </div>

      <div className="sticky-cta">
        <PrimaryButton disabled={selected === null} onClick={next}>
          {idx >= total - 1 ? "Finish" : "Next question"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default QuizViewer;
