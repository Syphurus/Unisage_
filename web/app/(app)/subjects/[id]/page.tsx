"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSubject } from "@/lib/hooks/useSubjects";
import { useSubjectProgress } from "@/lib/hooks/useProgress";
import { subjectsAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  ChevronLeft,
  BookOpen,
  Brain,
  HelpCircle,
  FileText,
} from "lucide-react";

type Category =
  | "long_notes"
  | "short_notes"
  | "flashcard"
  | "quiz"
  | "paper_predictor"
  | "exam_tips"
  | "pyqs";

type UnitGroupedContent = {
  id: string;
  title: string;
  data: any;
};

type SubjectContentResponse = {
  subject: {
    id: string;
    name: string;
    code: string;
    year: number;
    semester: number;
  };
  content: Record<Category, UnitGroupedContent[]>;
  counts: Record<Category, number>;
};

// Helper function to get the correct navigation link for quizzes
function getContentLink(item: UnitGroupedContent, category: Category): string {
  if (category === "quiz" && item.data?.parent) {
    // For flattened quizzes, use parent ID and add quiz type parameter
    const quizType = item.data.type || "unknown";
    return `/content/${item.data.parent}?quizType=${quizType}`;
  }
  return `/content/${item.id}`;
}
function flattenQuizzes(quizzes: UnitGroupedContent[]): UnitGroupedContent[] {
  const flattened: UnitGroupedContent[] = [];

  for (const quiz of quizzes) {
    if (quiz.data && typeof quiz.data === "object") {
      // Check if this quiz has nested quiz sections (mini_quizzes, unit_quiz, true_false, fill_in_blanks)
      const { mini_quizzes, unit_quiz, true_false, fill_in_blanks } = quiz.data;

      // If it has nested structures, create separate items for each
      let hasNested = false;

      if (Array.isArray(mini_quizzes) && mini_quizzes.length > 0) {
        mini_quizzes.forEach((mq: any, idx: number) => {
          flattened.push({
            id: `${quiz.id}_mini_${idx}`,
            title: `${quiz.title} - ${mq.topic}`,
            data: { type: "mini_quiz", ...mq, parent: quiz.id },
          });
        });
        hasNested = true;
      }

      if (
        unit_quiz &&
        typeof unit_quiz === "object" &&
        unit_quiz.questions &&
        unit_quiz.questions.length > 0
      ) {
        flattened.push({
          id: `${quiz.id}_unit`,
          title: `${quiz.title} - Unit Quiz`,
          data: { type: "unit_quiz", ...unit_quiz, parent: quiz.id },
        });
        hasNested = true;
      }

      if (
        true_false &&
        typeof true_false === "object" &&
        Array.isArray(true_false.questions) &&
        true_false.questions.length > 0
      ) {
        flattened.push({
          id: `${quiz.id}_tf`,
          title: `${quiz.title} - True/False`,
          data: {
            type: "true_false",
            questions: true_false.questions,
            parent: quiz.id,
          },
        });
        hasNested = true;
      }

      if (
        fill_in_blanks &&
        typeof fill_in_blanks === "object" &&
        Array.isArray(fill_in_blanks.questions) &&
        fill_in_blanks.questions.length > 0
      ) {
        flattened.push({
          id: `${quiz.id}_fib`,
          title: `${quiz.title} - Fill in the Blanks`,
          data: {
            type: "fill_in_blanks",
            questions: fill_in_blanks.questions,
            parent: quiz.id,
          },
        });
        hasNested = true;
      }

      // If no nested structures found, just add the original quiz
      if (!hasNested) {
        flattened.push(quiz);
      }
    } else {
      flattened.push(quiz);
    }
  }

  return flattened;
}

interface SubjectDetailPageProps {
  params: { id: string };
}

const categories: Array<{ key: Category; label: string }> = [
  { key: "long_notes", label: "Long Notes" },
  { key: "short_notes", label: "Short Notes" },
  { key: "flashcard", label: "Flashcards" },
  { key: "quiz", label: "Quizzes" },
  { key: "paper_predictor", label: "Paper Predictor" },
  { key: "exam_tips", label: "Exam Tips" },
  { key: "pyqs", label: "PYQs" },
  { key: "syllabus", label: "Syllabus" },
  { key: "assignments", label: "Assignments" },
];

export default function SubjectDetailPage({ params }: SubjectDetailPageProps) {
  const { id } = params;
  const { subject, isLoading, error } = useSubject(id);
  const { percentage, totalContent, completedContent } = useSubjectProgress(id);

  const [category, setCategory] = useState<Category>("long_notes");
  const [subjectContent, setSubjectContent] =
    useState<SubjectContentResponse | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Debug: Log when subjectContent changes
  useEffect(() => {
    if (subjectContent) {
      console.debug("Subject content loaded:", {
        subject_name: subjectContent.subject?.name,
        quiz_count: subjectContent.content?.quiz?.length || 0,
        long_notes_count: subjectContent.content?.long_notes?.length || 0,
      });
    }
  }, [subjectContent]);

  useEffect(() => {
    async function loadContent() {
      if (!id) return;
      setLoadingContent(true);
      try {
        const response = await subjectsAPI.getContent(id);

        // axios interceptor returns the HTTP body: { success: true, data: {...} }
        // We need to extract the inner data object
        const innerData = response?.data;

        if (
          innerData?.subject &&
          innerData?.content &&
          typeof innerData.content === "object"
        ) {
          setSubjectContent(innerData);
        } else {
          setSubjectContent(null);
          console.error("Invalid subject content response structure");
        }
      } catch (err) {
        console.error("Failed to load subject content:", err);
        setSubjectContent(null);
      } finally {
        setLoadingContent(false);
      }
    }
    loadContent();
  }, [id]);

  // For quizzes, flatten the nested structure if present
  let selectedItems = subjectContent?.content?.[category] || [];
  if (category === "quiz") {
    selectedItems = flattenQuizzes(selectedItems);
  }

  if (isLoading) return <LoadingSkeleton variant="content" />;

  if (error || !subject) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState
          title="Subject not found"
          message="The subject you're looking for doesn't exist or has been removed."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-[12px] text-[#707891]">
        <Link
          href="/subjects"
          className="inline-flex items-center gap-1 hover:text-[#0D1B2A]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Subjects
        </Link>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <h1 className="text-[32px] font-bold text-[#0D1B2A]">
            {subject.name}
          </h1>
          <p className="text-[13px] text-[#707891] mt-1">
            {subject.code} • Year {subject.year} • Semester {subject.semester}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-[#707891]">Completion</p>
              <p className="text-[24px] font-bold text-[#0D1B2A]">
                {percentage}%
              </p>
              <Progress value={percentage} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-[#707891]">Completed Items</p>
              <p className="text-[24px] font-bold text-[#0D1B2A]">
                {completedContent}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-[#707891]">Total Items</p>
              <p className="text-[24px] font-bold text-[#0D1B2A]">
                {totalContent}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${category === c.key ? "bg-[#0D1B2A] text-white" : "bg-[#EEF1F8] text-[#2A3242]"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loadingContent ? (
        <LoadingSkeleton variant="content" />
      ) : (
        <section className="space-y-3">
          {selectedItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-[#707891]">
                No {category.replace("_", " ")} available for this subject yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0D1B2A] truncate">
                        {item.title || "Untitled"}
                      </p>
                      <p className="text-[12px] text-[#707891] inline-flex items-center gap-1">
                        {category === "flashcard" ? (
                          <Brain className="h-3.5 w-3.5" />
                        ) : category === "quiz" ? (
                          <HelpCircle className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        Subject-level content
                      </p>
                    </div>
                    <Link href={getContentLink(item, category)}>
                      <Button
                        size="sm"
                        className="inline-flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Open
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
