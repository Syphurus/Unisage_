import { z } from "zod";

const semesterRangeByYear = (year: number) => {
  const start = Math.max(1, (year - 1) * 2 + 1);
  return [start, Math.min(8, start + 1)] as const;
};

/* ─── Auth ──────────────────────────────────────────── */

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

/* ─── Subject ───────────────────────────────────────── */

export const subjectSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    code: z.string().min(2, "Code is required"),
    year: z.coerce.number().min(1).max(4),
    semester: z.coerce.number().min(1).max(8),
    credits: z.coerce.number().min(0).max(10).optional(),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      const [minSemester, maxSemester] = semesterRangeByYear(data.year);
      return data.semester >= minSemester && data.semester <= maxSemester;
    },
    {
      message: "Semester must match the selected year",
      path: ["semester"],
    }
  );
export type SubjectFormData = z.infer<typeof subjectSchema>;

/* ─── Unit ──────────────────────────────────────────── */

export const unitSchema = z.object({
  unitNumber: z.coerce.number().min(1, "Unit number is required"),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  orderIndex: z.coerce.number().min(0).optional(),
});
export type UnitFormData = z.infer<typeof unitSchema>;

/* ─── Content (Notes) ───────────────────────────────── */

export const notesSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});
export type NotesFormData = z.infer<typeof notesSchema>;

/* ─── Flashcard ─────────────────────────────────────── */

export const flashcardItemSchema = z.object({
  front: z.string().min(1, "Question is required"),
  back: z.string().min(1, "Answer is required"),
});
export type FlashcardItem = z.infer<typeof flashcardItemSchema>;

/* ─── Quiz Question ─────────────────────────────────── */

export const quizQuestionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctAnswer: z.coerce.number().min(0).max(3),
  explanation: z.string().optional(),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
