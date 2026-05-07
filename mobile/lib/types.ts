// ============================================
// UniSage Mobile — TypeScript Type Definitions
// ============================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** API error shape */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// ---- Auth ----

export interface User {
  id: string;
  email: string;
  name: string;
  enrollment_number?: string;
  year?: number;
  semester?: number;
  avatar_url?: string;
  created_at: string;
}

export interface AuthTokens {
  token: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  enrollmentNumber?: string;
  year?: number;
  collegeCode?: string;
  branchCode?: string;
}

// ---- Subjects ----

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  year: number;
  semester: number;
  total_units: number;
  completed_units?: number;
  progress?: number;
  last_accessed?: string;
  image_url?: string;
  created_at: string;
}

// ---- Units ----

export interface Unit {
  id: string;
  subject_id?: string;
  title: string;
  unit_number?: number;
  unitNumber?: number;
  description?: string;
  orderIndex?: number;
  is_completed?: boolean;
  content_count?: number;
  contents?: ContentItem[];
  created_at?: string;
  createdAt?: string;
}

// ---- Content ----

export type ContentType =
  | "long_notes"
  | "short_notes"
  | "flashcard"
  | "quiz"
  | "notes"
  | "flashcards";

export interface ContentItem {
  id: string;
  unit_id?: string;
  title: string;
  type: ContentType;
  data?: any;
  content_data?: NotesData | FlashcardData[] | QuizData;
  orderIndex?: number;
  is_completed?: boolean;
  is_bookmarked?: boolean;
  created_at?: string;
  createdAt?: string;
}

export interface NotesData {
  html?: string;
  markdown?: string;
  text?: string;
}

export interface FlashcardData {
  id: string;
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number; // index
  explanation?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  time_limit?: number; // minutes
}

// ---- Progress ----

export interface Progress {
  id: string;
  user_id: string;
  content_id: string;
  time_spent: number;
  completed: boolean;
  created_at: string;
}

export interface ProgressStats {
  total_completed: number;
  total_content: number;
  quiz_average: number;
  total_study_time: number;
  current_streak: number;
  subjects: SubjectProgress[];
  weekly_study_time?: WeeklyStudyTime[];
}

export interface SubjectProgress {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  completed: number;
  total: number;
  progress: number;
  quiz_avg?: number;
}

export interface WeeklyStudyTime {
  date: string;
  minutes: number;
}

// ---- Quiz ----

export interface QuizAttempt {
  id: string;
  user_id: string;
  content_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, number>;
  time_taken: number; // seconds
  created_at: string;
}

export interface QuizAttemptPayload {
  contentId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, number>;
  timeTaken: number;
}

// ---- Bookmarks ----

export interface Bookmark {
  id: string;
  user_id: string;
  content_id: string;
  content?: ContentItem;
  created_at: string;
}

// ---- Sessions ----

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
}

// ---- Offline queue ----

export interface OfflineAction {
  id: string;
  type: "progress" | "bookmark" | "quiz_attempt";
  payload: Record<string, unknown>;
  created_at: string;
}
