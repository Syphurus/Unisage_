"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Content } from "@/lib/types";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  code_snippet?: string;
  language?: string;
}

interface QuizViewerProps {
  questions: Content[];
  subjectId?: string;
}

function extractQuestions(contentItems: Content[]): QuizQuestion[] {
  const result: QuizQuestion[] = [];
  for (const item of contentItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = item.data as any;
    if (d?.questions && Array.isArray(d.questions)) {
      for (const q of d.questions) {
        const opts: string[] = [];
        let correctIdx = 0;
        if (Array.isArray(q.options)) {
          q.options.forEach(
            (o: { text: string; isCorrect: boolean } | string, i: number) => {
              if (typeof o === "string") {
                opts.push(o);
              } else {
                opts.push(o.text);
                if (o.isCorrect) correctIdx = i;
              }
            }
          );
        }
        result.push({
          question: q.question || "",
          options: opts,
          correctIndex: q.correctAnswer ?? q.correct_answer ?? correctIdx,
          explanation: q.explanation,
          code_snippet: q.code_snippet,
          language: q.language,
        });
      }
    } else if (d?.question) {
      result.push({
        question: d.question,
        options: Array.isArray(d.options)
          ? d.options.map((o: string | { text: string }) =>
              typeof o === "string" ? o : o.text
            )
          : [],
        correctIndex: d.correct_answer ?? d.correctAnswer ?? 0,
        explanation: d.explanation,
        code_snippet: d.code_snippet,
        language: d.language,
      });
    }
  }
  return result;
}

export function QuizViewer({ questions: contentItems }: QuizViewerProps) {
  const allQuestions = useMemo(
    () => extractQuestions(contentItems),
    [contentItems]
  );
  const totalQuestions = Math.max(allQuestions.length, 1);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState<number[]>([]);
  const [marked, setMarked] = useState<number[]>([]);

  const current = allQuestions[currentIndex];
  const completion = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  if (!current) {
    return (
      <div className="p-8 text-[13px] text-[#707891]">
        No quiz questions available.
      </div>
    );
  }

  const questionNumbers = Array.from({ length: totalQuestions }).map(
    (_, i) => i + 1
  );

  const saveAndNext = () => {
    if (selectedOption !== null && !answered.includes(currentIndex + 1)) {
      setAnswered((prev) => [...prev, currentIndex + 1]);
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    }
  };

  const toggleMark = () => {
    const n = currentIndex + 1;
    setMarked((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  return (
    <div className="w-full bg-[#F9F9FF] min-h-screen">
      <div className="max-w-[1400px] mx-auto rounded-2xl border border-[#EBEBF5] bg-white overflow-hidden mt-6 mb-6">
        <div className="border-b border-[#EBEBF5] bg-white px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg text-[#0D1B2A]">QuizFlow</div>
          <div className="flex items-center gap-4 flex-1 mx-8">
            <Progress value={completion} />
            <span className="text-[12px] font-bold text-[#707891] uppercase whitespace-nowrap">
              {completion}% Complete
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[13px] text-[#EF4444] font-semibold">
              <Clock className="h-4 w-4" /> 00:45
            </span>
            <Avatar className="h-10 w-10 border border-[#EBEBF5]">
              <AvatarFallback className="bg-[#E2EAF8] text-[#0D1B2A] font-bold">
                S
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_280px] min-h-[700px]">
          <aside className="border-r border-[#EBEBF5] bg-white p-4">
            <p className="text-[14px] font-semibold text-[#0D1B2A]">CSE 101</p>
            <p className="text-[12px] text-[#707891]">Unit 4: Algorithms</p>

            <div className="mt-6 space-y-2 text-[13px]">
              <div className="rounded-lg border-l-4 border-l-[#00B4A6] bg-[#EAF8F7] px-3 py-3 font-medium text-[#0D1B2A]">
                Current Quiz
              </div>
              <div className="rounded-lg px-3 py-3 text-[#707891] hover:bg-[#F9F9FF] cursor-pointer">
                Review
              </div>
              <div className="rounded-lg px-3 py-3 text-[#707891] hover:bg-[#F9F9FF] cursor-pointer">
                Resources
              </div>
            </div>

            <div className="mt-auto pt-12 text-[12px] text-[#707891] cursor-pointer hover:text-[#0D1B2A]">
              ← Exit Session
            </div>
          </aside>

          <main className="p-8 overflow-y-auto">
            <div className="inline-flex rounded-full bg-[#F4F4FC] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#707891]">
              Question {String(currentIndex + 1).padStart(2, "0")}
            </div>

            {current.code_snippet && (
              <div className="mt-6 bg-[#1E293B] text-white rounded-lg p-6 font-mono text-[14px] overflow-x-auto border border-[#334155]">
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {current.code_snippet}
                </pre>
              </div>
            )}

            <h2 className="text-[28px] font-bold text-[#0D1B2A] leading-tight mt-6 max-w-3xl">
              {current.question}
            </h2>

            <div className="mt-8 space-y-3 max-w-3xl">
              {current.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index);
                const selected = selectedOption === index;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedOption(index)}
                    className={cn(
                      "w-full rounded-xl border bg-white p-5 text-left flex items-center gap-4 transition-all",
                      selected
                        ? "border-[#0D1B2A] bg-[#F0F4F8]"
                        : "border-[#EBEBF5] hover:border-[#0D1B2A]/30"
                    )}
                  >
                    <span
                      className={cn(
                        "h-9 w-9 rounded-full border text-[14px] font-bold inline-flex items-center justify-center flex-shrink-0",
                        selected
                          ? "bg-[#0D1B2A] text-white border-[#0D1B2A]"
                          : "bg-white text-[#707891] border-[#EBEBF5]"
                      )}
                    >
                      {letter}
                    </span>
                    <span className="text-[15px] text-[#0D1B2A]">{option}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 border-t border-[#EBEBF5] pt-6 flex items-center justify-between">
              <button
                className="text-[13px] font-medium text-[#707891] hover:text-[#0D1B2A]"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              >
                ← Previous
              </button>
              <button
                className="text-[13px] font-medium text-[#707891] hover:text-[#0D1B2A]"
                onClick={toggleMark}
              >
                Mark for Review
              </button>
              <Button onClick={saveAndNext}>Save and Next →</Button>
            </div>
          </main>

          <aside className="border-l border-[#EBEBF5] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-[#0D1B2A]">
                Question Grid
              </p>
              <p className="text-[11px] text-[#707891] uppercase font-medium">
                {answered.length}/{totalQuestions} Attempted
              </p>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {questionNumbers.map((n) => {
                const isCurrent = n === currentIndex + 1;
                const isAnswered = answered.includes(n);
                const isMarked = marked.includes(n);
                return (
                  <button
                    key={n}
                    onClick={() => setCurrentIndex(n - 1)}
                    className={cn(
                      "h-8 w-8 rounded-full text-[12px] font-semibold border transition-all",
                      isCurrent
                        ? "bg-[#0D1B2A] text-white border-[#0D1B2A]"
                        : isAnswered
                          ? "bg-[#22C55E] text-white border-[#22C55E]"
                          : isMarked
                            ? "bg-[#F59E0B] text-white border-[#F59E0B]"
                            : "bg-white text-[#707891] border-[#EBEBF5] hover:border-[#0D1B2A]"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-2 text-[12px] text-[#707891]">
              <p className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#22C55E]" /> Answered
              </p>
              <p className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#F59E0B]" /> Marked
              </p>
              <p className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-white border border-[#EBEBF5]" />{" "}
                Unvisited
              </p>
              <p className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#0D1B2A]" /> Current
              </p>
            </div>

            <Button
              variant="destructive"
              className="w-full mt-6 py-2 text-[13px]"
            >
              Finish Quiz
            </Button>

            <div className="mt-6 rounded-xl bg-[#0D1B2A] text-white p-4">
              <p className="text-[11px] uppercase font-bold tracking-[0.08em] text-white/90">
                Studying Tip
              </p>
              <p className="text-[12px] italic text-white/85 mt-2 leading-relaxed">
                Think about how live video streaming vs. email delivery requires
                different protocol behaviors.
              </p>
            </div>

            <div className="mt-6 text-[12px] text-[#707891] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#22C55E] flex-shrink-0" />
              <span>Keep going — great pace.</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
