"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { NotesViewerWithTracking } from "@/components/content/NotesViewer";
import HtmlContent from "@/components/content/HtmlContent";
import { FlashcardViewer } from "@/components/content/FlashcardViewer";
import { QuizViewer } from "@/components/content/QuizViewer";
import PyqsViewer from "@/components/content/PyqsViewer";
import { useContent, useUnitContent } from "@/lib/hooks/useContent";
import type { Content } from "@/lib/types";

/**
 * Backend stores flashcard data as { items: [{front, back}] } inside one Content.
 * FlashcardViewer expects each Content to have data: { front, back }.
 * This expands nested items into individual Content objects.
 */
function expandFlashcards(contentItems: Content[]): Content[] {
  const result: Content[] = [];
  for (const item of contentItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = item.data as any;
    if (d?.items && Array.isArray(d.items)) {
      // Nested format: { items: [{front, back}, ...] }
      d.items.forEach((card: { front: string; back: string }, idx: number) => {
        result.push({
          ...item,
          id: `${item.id}-${idx}`,
          data: { front: card.front, back: card.back },
        });
      });
    } else if (d?.front && d?.back) {
      // Already flat format
      result.push(item);
    }
  }
  return result;
}

/**
 * Extracts a specific nested quiz section from quiz data based on quizType parameter.
 * For mini_quiz, unit_quiz, true_false, fill_in_blanks types.
 * Transforms questions into the format expected by QuizViewer.
 */
function extractQuizSection(
  content: Content,
  quizType: string | null
): Content[] {
  if (!quizType || !content.data) {
    return [content];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = content.data as any;
  const result: Content[] = [];

  const transformedData = (() => {
    switch (quizType) {
      case "mini_quiz": {
        // mini_quizzes is an array, take the first one
        if (
          data.mini_quizzes &&
          Array.isArray(data.mini_quizzes) &&
          data.mini_quizzes.length > 0
        ) {
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
                      opt === q.correct_option || opt.endsWith(q.correct_option)
                  ) ?? 0,
              })) || [],
          };
        }
        break;
      }

      case "unit_quiz": {
        // unit_quiz is a single object
        if (data.unit_quiz && data.unit_quiz.questions) {
          return {
            ...data.unit_quiz,
            questions:
              data.unit_quiz.questions?.map((q: any) => ({
                ...q,
                options: q.options || [],
                correctIndex:
                  q.options?.findIndex(
                    (opt: string) =>
                      opt === q.correct_option || opt.endsWith(q.correct_option)
                  ) ?? 0,
              })) || [],
          };
        }
        break;
      }

      case "true_false": {
        // true_false is an object with questions array
        if (data.true_false && data.true_false.questions) {
          return {
            ...data.true_false,
            questions:
              data.true_false.questions?.map((q: any) => ({
                ...q,
                // Convert true/false to options format
                question: q.statement || q.question || "",
                options: ["True", "False"],
                correctIndex: q.answer === true ? 0 : 1,
              })) || [],
          };
        }
        break;
      }

      case "fill_in_blanks": {
        // fill_in_blanks is an object with questions array
        if (data.fill_in_blanks && data.fill_in_blanks.questions) {
          return {
            ...data.fill_in_blanks,
            questions:
              data.fill_in_blanks.questions?.map((q: any) => ({
                ...q,
                // For fill in blanks, treat answer as the single correct option
                options: [
                  q.answer,
                  ...(q.acceptable_answers || []).filter(
                    (a: string) => a !== q.answer
                  ),
                ],
                correctIndex: 0,
              })) || [],
          };
        }
        break;
      }

      default:
        return null;
    }
    return null;
  })();

  if (
    transformedData &&
    transformedData.questions &&
    transformedData.questions.length > 0
  ) {
    result.push({
      ...content,
      data: transformedData,
    });
  }

  return result.length > 0 ? result : [content];
}

export default function ContentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const quizType = searchParams.get("quizType");

  const { content, isLoading, error, mutate } = useContent(contentId);

  // For flashcards and quizzes, we need all items from the same unit+type
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
    return (
      <ErrorState
        message="Content not found or failed to load."
        onRetry={() => mutate()}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      <div>
        {(content.type === "long_notes" || content.type === "short_notes") && (
          <div className="p-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(content.data as any)?.html ? (
              <HtmlContent html={(content.data as any).html} />
            ) : (
              <NotesViewerWithTracking content={content} />
            )}
          </div>
        )}

        {content.type === "flashcard" && (
          <FlashcardViewer
            flashcards={expandFlashcards(
              siblingContent.length > 0 ? siblingContent : [content]
            )}
          />
        )}

        {content.type === "quiz" && (
          <QuizViewer
            questions={
              quizType
                ? extractQuizSection(content, quizType)
                : siblingContent.length > 0
                  ? siblingContent
                  : [content]
            }
          />
        )}

        {content.type === "paper_predictor" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-3">Paper Predictor</h2>
            {/* If admin provided HTML, render via NotesViewer; otherwise show JSON */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(content.data as any)?.html ? (
              <NotesViewerWithTracking content={content} />
            ) : (
              <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">
                {JSON.stringify(content.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {content.type === "exam_tips" && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-3">Exam Tips</h2>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(content.data as any)?.html ? (
              <HtmlContent html={(content.data as any).html} />
            ) : (
              <div className="space-y-2">
                {content.data && typeof content.data === "object" ? (
                  Object.entries(content.data).map(([k, v]) => (
                    <div key={k} className="p-3 bg-gray-50 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(v, null, 2)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <pre className="whitespace-pre-wrap">
                    {String(content.data)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {(content.type === "pyqs" ||
          content.type === "syllabus" ||
          content.type === "assignments") && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {content.type === "pyqs"
                ? "Previous Year Questions"
                : content.type === "syllabus"
                  ? "Syllabus"
                  : "Assignments"}
            </h2>
            <PyqsViewer
              content={siblingContent.length > 0 ? siblingContent : [content]}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
