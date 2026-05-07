export const APP_NAME = "UniSage";
export const APP_DESCRIPTION =
  "AI-powered study platform built for UPES CSE students";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const YEARS = [
  { value: 1, label: "Year 1" },
  { value: 2, label: "Year 2" },
  { value: 3, label: "Year 3" },
  { value: 4, label: "Year 4" },
];

export const SEMESTERS = [
  { value: 1, label: "Semester 1" },
  { value: 2, label: "Semester 2" },
  { value: 3, label: "Semester 3" },
  { value: 4, label: "Semester 4" },
  { value: 5, label: "Semester 5" },
  { value: 6, label: "Semester 6" },
  { value: 7, label: "Semester 7" },
  { value: 8, label: "Semester 8" },
];

export function getSemestersForYear(year: number) {
  const start = Math.max(1, (year - 1) * 2 + 1);
  const end = Math.min(8, start + 1);

  return SEMESTERS.filter(
    (semester) => semester.value >= start && semester.value <= end
  );
}

export const CONTENT_TYPES = {
  LONG_NOTES: "long_notes",
  SHORT_NOTES: "short_notes",
  FLASHCARD: "flashcard",
  QUIZ: "quiz",
} as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Subjects", href: "/subjects", icon: "BookOpen" },
  { label: "Progress", href: "/progress", icon: "BarChart3" },
] as const;

export const MOTIVATIONAL_MESSAGES = [
  "Keep it going! 🔥",
  "You're on fire! 🚀",
  "Great momentum! 💪",
  "Consistency is key! ⭐",
  "Don't stop now! 🎯",
  "You're crushing it! 🏆",
];

export function getMotivationalMessage(streak: number): string {
  if (streak >= 7) return "You're on fire! 🚀";
  if (streak >= 5) return "You're crushing it! 🏆";
  if (streak >= 3) return "Great momentum! 💪";
  if (streak >= 1) return "Keep it going! 🔥";
  return "Start your streak today! ⭐";
}
