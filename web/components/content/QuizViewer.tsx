"use client";

import { useMemo, useState, useEffect } from "react";
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

function extractQuestions(contentItems: Content[]): QuizQuestion[] {
  const result: QuizQuestion[] = [];
  for (const item of contentItems) {
    const d = item.data as any;
    if (d?.questions && Array.isArray(d.questions)) {
      for (const q of d.questions) {
        const opts: string[] = [];
        let correctIdx = 0;
        if (Array.isArray(q.options)) {
          q.options.forEach((o: { text: string; isCorrect: boolean } | string, i: number) => {
            if (typeof o === "string") {
              opts.push(o);
            } else {
              opts.push(o.text);
              if (o.isCorrect) correctIdx = i;
            }
          });
        }
        result.push({
          question: q.question || "",
          options: opts,
          correctIndex: q.correctAnswer ?? q.correct_answer ?? q.correctIndex ?? correctIdx,
          explanation: q.explanation,
        });
      }
    } else if (d?.question) {
      result.push({
        question: d.question,
        options: Array.isArray(d.options)
          ? d.options.map((o: string | { text: string }) => (typeof o === "string" ? o : o.text))
          : [],
        correctIndex: d.correct_answer ?? d.correctAnswer ?? 0,
        explanation: d.explanation,
      });
    }
  }
  return result;
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

  useEffect(() => {
    setAnswers(Array(total).fill(null));
    setIdx(0);
    setSelected(null);
    setScore(0);
    setTime(0);
    setDone(false);
  }, [total]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setTime((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [done]);

  const current = allQuestions[idx];

  const next = () => {
    if (selected != null && current) {
      setAnswers((arr) => {
        const next = [...arr];
        next[idx] = selected;
        return next;
      });
      if (selected === current.correctIndex) {
        setScore((s) => s + 4);
      }
    }
    if (idx >= total - 1) {
      setDone(true);
      // Submit attempt
      try {
        const correct = allQuestions.filter(
          (q, i) =>
            (i === idx ? selected : answers[i]) === q.correctIndex,
        ).length;
        const contentId = contentItems[0]?.id;
        if (contentId) {
          quizAPI.submitAttempt({
            contentId,
            score: Math.round((correct / total) * 100),
            answers: answers.map((a, i) => ({
              questionIndex: i,
              selectedIndex: i === idx ? selected : a,
              correct:
                (i === idx ? selected : a) === allQuestions[i]?.correctIndex,
            })),
          } as any);
        }
      } catch {}
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
      <div className="min-h-screen px-5 pt-12 pb-32 text-center">
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
    <div className="min-h-screen pb-32">
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
