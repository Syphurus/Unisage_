// Type definitions for the UniSage platform
// Backend returns camelCase fields

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  year: number;
  semester?: number | null;
  specialization?: string | null;
  collegeCode?: string | null;
  branchCode?: string | null;
  enrollmentNumber?: string | null;
  isActive?: boolean;
  college?: { name: string; code: string } | null;
  branch?: { name: string; code: string } | null;
  createdAt?: string;
  lastActive?: string;
  // snake_case aliases for compatibility
  full_name?: string;
  enrollment_number?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  year: number;
  semester: number;
  credits: number;
  description?: string;
  createdAt?: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  unitNumber: number;
  title: string;
  description?: string;
  orderIndex?: number;
  createdAt?: string;
  // snake_case alias
  unit_number?: number;
  subject_id?: string;
}

export interface Content {
  id: string;
  type:
    | "long_notes"
    | "short_notes"
    | "flashcard"
    | "quiz"
    | "paper_predictor"
    | "exam_tips"
    | "pyqs"
    | "syllabus"
    | "assignments";
  title: string;
  data: ContentData;
  orderIndex?: number;
  isPublished?: boolean;
  createdAt?: string;
  unit?: {
    id: string;
    title: string;
    unitNumber?: number;
    subject?: { id: string; name: string; code: string } | null;
  } | null;
  // Keep these for compatibility
  unit_id?: string;
  is_published?: boolean;
}

export type ContentData =
  | { html: string } // long_notes, short_notes — backend stores html
  | { content: string } // long_notes, short_notes — fallback
  | { items: { front: string; back: string }[] } // flashcard — nested items
  | { front: string; back: string } // flashcard — single card fallback
  | {
      // quiz — nested questions
      questions: {
        question: string;
        options: { text: string; isCorrect: boolean }[];
        explanation?: string;
      }[];
    }
  | {
      // quiz — flat single question fallback
      question: string;
      options: string[];
      correct_answer: number;
      explanation?: string;
    };

// Allow arbitrary JSON for paper_predictor and exam_tips
export type GenericContentData = { [key: string]: any };

export interface UserProgress {
  id: string;
  completed: boolean;
  timeSpent: number;
  lastAccessed?: string;
  completedAt?: string | null;
  content?: {
    id: string;
    type: string;
    title: string;
    unit?: {
      id: string;
      title: string;
      subject?: { id: string; name: string; code: string } | null;
    } | null;
  } | null;
}

export interface SubjectProgress {
  totalContent: number;
  completedContent: number;
  percentage: number;
  progress: {
    id: string;
    contentId: string;
    completed: boolean;
    timeSpent: number;
    completedAt?: string | null;
  }[];
}

export interface QuizAttempt {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken?: number | null;
  attemptedAt?: string;
  content?: {
    id: string;
    title: string;
    unit?: {
      id: string;
      title: string;
      subjects?: { id: string; name: string };
    } | null;
  } | null;
}

export interface Bookmark {
  id: string;
  createdAt?: string;
  contentId?: string;
  content?: {
    id: string;
    type: string;
    title: string;
    unit?: {
      id: string;
      title: string;
      unitNumber?: number;
      subject?: { id: string; name: string; code: string } | null;
    } | null;
  } | null;
}

export interface StudySession {
  id: string;
  subjectId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  durationMinutes?: number;
}

export interface SessionStats {
  totalStudyMinutes: number;
  totalSessions: number;
  sessionsThisWeek: number;
  completedContent: number;
  quizzesAttempted: number;
  averageQuizScore: number;
  currentStreak: number;
  weeklyActivity: boolean[];
}

export interface UnitWithContent {
  unit: { id: string; title: string };
  content: {
    long_notes: Content[];
    short_notes: Content[];
    flashcard: Content[];
    quiz: Content[];
    paper_predictor: Content[];
    exam_tips: Content[];
    pyqs: Content[];
    syllabus: Content[];
    assignments: Content[];
  };
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  collegeCode: string;
  branchCode: string;
  year: number;
  semester: number;
  specialization?: string | null;
  enrollmentNumber: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface QuizAttemptData {
  contentId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, number>;
  timeTaken: number;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
}

export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
