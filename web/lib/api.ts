import axios from "axios";
import type {
  User,
  Subject,
  Unit,
  Content,
  UserProgress,
  QuizAttempt,
  Bookmark,
  SignupData,
  LoginData,
  QuizAttemptData,
  SessionStats,
  SubjectProgress,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: unwraps axios response to return server JSON directly
// So all API calls receive { success, data, ... } directly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        const path = window.location.pathname;
        if (!path.startsWith("/login") && !path.startsWith("/signup")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

// After interceptor, all calls return server JSON: { success, data, ... }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiRes<T> = any; // interceptor changes actual return type

// Auth API
export const authAPI = {
  signup: (data: SignupData) =>
    api.post<unknown, ApiRes<{ token: string; user: User }>>(
      "/api/auth/signup",
      data
    ),
  login: (data: LoginData) =>
    api.post<unknown, ApiRes<{ token: string; user: User }>>(
      "/api/auth/login",
      data
    ),
  me: () => api.get<unknown, ApiRes<User>>("/api/auth/me"),
  updateProfile: (data: {
    fullName?: string;
    collegeCode?: string;
    branchCode?: string;
    year?: number;
    semester?: number;
    specialization?: string | null;
    enrollmentNumber?: string;
  }) => api.put<unknown, ApiRes<User>>("/api/auth/me", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<unknown, ApiRes<void>>("/api/auth/change-password", data),
};

// Subjects API
export const subjectsAPI = {
  getAll: (filters?: { branchId?: string; year?: number; semester?: number }) =>
    api.get<unknown, ApiRes<Subject[]>>("/api/subjects", { params: filters }),
  getById: (id: string) =>
    api.get<unknown, ApiRes<Subject & { units: Unit[] }>>(
      `/api/subjects/${id}`
    ),
  getContent: (id: string) =>
    api.get<
      unknown,
      ApiRes<{
        subject: Subject;
        content: Record<string, Content[]>;
        counts: Record<string, number>;
      }>
    >(`/api/subjects/${id}/content`),
  getUnits: (id: string) =>
    api.get<unknown, ApiRes<{ subject: Subject; units: Unit[] }>>(
      `/api/subjects/${id}/units`
    ),
  getUnitsContent: (id: string) =>
    api.get<
      unknown,
      ApiRes<{
        subject: Subject;
        units: Array<{
          unit: Unit;
          content: Record<string, Content[]>;
        }>;
      }>
    >(`/api/subjects/${id}/units/content`),
};

export const metaAPI = {
  getColleges: () =>
    api.get<unknown, ApiRes<Array<{ id: string; name: string; code: string }>>>(
      "/api/meta/colleges"
    ),
  getBranches: (collegeCode?: string) =>
    api.get<
      unknown,
      ApiRes<
        Array<{ id: string; name: string; code: string; college_id: string }>
      >
    >("/api/meta/branches", {
      params: collegeCode ? { collegeCode } : undefined,
    }),
};

// Units API
export const unitsAPI = {
  getById: (id: string) => api.get<unknown, ApiRes<Unit>>(`/api/units/${id}`),
  getContent: (id: string) =>
    api.get<
      unknown,
      ApiRes<{ unit: Unit; content: Record<string, Content[]> }>
    >(`/api/units/${id}/content`),
};

// Content API
export const contentAPI = {
  getById: (id: string) =>
    api.get<unknown, ApiRes<Content>>(`/api/content/${id}`),
};

// Progress API
export const progressAPI = {
  getAll: () => api.get<unknown, ApiRes<UserProgress[]>>("/api/progress"),
  getBySubject: (subjectId: string) =>
    api.get<unknown, ApiRes<SubjectProgress>>(
      `/api/progress/subject/${subjectId}`
    ),
  update: (data: { contentId: string; timeSpent: number }) =>
    api.post<unknown, ApiRes<UserProgress>>("/api/progress", data),
};

// Quiz API
export const quizAPI = {
  submitAttempt: (data: QuizAttemptData) =>
    api.post<unknown, ApiRes<QuizAttempt>>("/api/quiz/attempt", data),
  getAttempts: () =>
    api.get<unknown, ApiRes<QuizAttempt[]>>("/api/quiz/attempts/user"),
};

// Bookmarks API
export const bookmarksAPI = {
  getAll: () => api.get<unknown, ApiRes<Bookmark[]>>("/api/bookmarks"),
  create: (contentId: string) =>
    api.post<unknown, ApiRes<Bookmark>>("/api/bookmarks", { contentId }),
  delete: (id: string) =>
    api.delete<unknown, ApiRes<void>>(`/api/bookmarks/${id}`),
};

// Sessions API
export const sessionsAPI = {
  start: (subjectId: string) =>
    api.post<unknown, ApiRes<{ id: string }>>("/api/sessions/start", {
      subjectId,
    }),
  end: (id: string) =>
    api.put<unknown, ApiRes<unknown>>(`/api/sessions/${id}/end`),
  /**
   * Page-unload variant. Uses fetch with `keepalive: true` so the request
   * survives tab close — required because axios cancels in-flight requests
   * when the page navigates away. Best-effort; we don't read the response.
   */
  endKeepalive: (id: string) => keepaliveFetch(`/api/sessions/${id}/end`, "PUT"),
  getStats: () => api.get<unknown, ApiRes<SessionStats>>("/api/sessions/stats"),
};

// ──────────────────────────────────────────────────────────────────────
// Analytics API — ingestion + dashboard reads (Phase 1+2 endpoints)
// ──────────────────────────────────────────────────────────────────────
export interface HeartbeatBody {
  contentId: string;
  subjectId?: string;
  sessionId?: string;
  deltaActiveSeconds: number;
  maxScrollPct?: number;
  sectionsViewed?: string[];
  end?: boolean;
}

export interface AnalyticsEvent {
  type: string;
  contentId?: string;
  subjectId?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
}

export interface DashboardStats {
  totalStudyMinutes: number;
  totalSessions: number;
  sessionsThisWeek: number;
  completedContent: number;
  quizzesAttempted: number;
  averageQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  weeklyActivity: boolean[];
  weakSubjectIds: string[];
  timeline: Array<{ day: string; activeSeconds: number; quizPct: number | null }>;
}

export interface SubjectAnalytics {
  subjectId: string;
  subject: {
    id: string;
    name: string;
    code: string;
    year: number;
    semester: number;
  } | null;
  totalContent: number;
  completedContent: number;
  completionPct: number;
  activeMinutes: number;
  quizAttempts: number;
  avgQuizPct: number | null;
  flashcardsReviewed: number;
  flashcardsConfident: number;
  weaknessScore: number;
  lastStudiedAt: string | null;
}

export const analyticsAPI = {
  heartbeat: (body: HeartbeatBody) =>
    api.post<unknown, ApiRes<{ sessionId: string; totalActiveSeconds: number }>>(
      "/api/analytics/heartbeat",
      body
    ),
  /**
   * Final flush variant for `pagehide` / unmount. Uses keepalive so the
   * delta is recorded even when the page is closing.
   */
  heartbeatKeepalive: (body: HeartbeatBody) =>
    keepaliveFetch("/api/analytics/heartbeat", "POST", body),
  events: (events: AnalyticsEvent[]) =>
    api.post<unknown, ApiRes<{ inserted: number }>>("/api/analytics/events", {
      events,
    }),
  getMyDashboard: () =>
    api.get<unknown, ApiRes<DashboardStats>>("/api/analytics/me"),
  getMySubjects: () =>
    api.get<unknown, ApiRes<SubjectAnalytics[]>>("/api/analytics/me/subjects"),
};

// ──────────────────────────────────────────────────────────────────────
// Flashcards API — persistence of review decisions
// ──────────────────────────────────────────────────────────────────────
export interface FlashcardReviewBody {
  cardIndex: number;
  rating: "forgot" | "shaky" | "confident";
  responseMs?: number | null;
}

export const flashcardsAPI = {
  submitReviews: (contentId: string, reviews: FlashcardReviewBody[]) =>
    api.post<unknown, ApiRes<{ inserted: number }>>(
      "/api/flashcards/reviews",
      { contentId, reviews }
    ),
};

// ──────────────────────────────────────────────────────────────────────
// keepalive helper — for sendBeacon-style fire-and-forget on unload
// ──────────────────────────────────────────────────────────────────────
function keepaliveFetch(
  path: string,
  method: "POST" | "PUT",
  body?: unknown
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    keepalive: true,
    credentials: "include",
  })
    .then(() => undefined)
    .catch(() => undefined);
}

// Admin API (Content Management)
export const adminAPI = {
  // Content CRUD
  createContent: (data: FormData) =>
    api.post<unknown, ApiRes<Content>>("/api/admin/content", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateContent: (id: string, data: Partial<Content>) =>
    api.put<unknown, ApiRes<Content>>(`/api/admin/content/${id}`, data),
  deleteContent: (id: string) =>
    api.delete<unknown, ApiRes<{ message: string }>>(
      `/api/admin/content/${id}`
    ),
  publishContent: (id: string, isPublished: boolean) =>
    api.put<unknown, ApiRes<Content>>(`/api/admin/content/${id}/publish`, {
      isPublished,
    }),
};

// File API
export const filesAPI = {
  downloadFile: (contentId: string) =>
    api.get(`/api/content/${contentId}/download`, {
      responseType: "blob",
    }),
};

export default api;
