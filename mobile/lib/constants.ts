// ============================================
// UniSage Mobile — Design Tokens & Constants
// ============================================

import { Platform } from "react-native";
import Constants from "expo-constants";

/** Brand and UI color palette (matches web app) */
export const COLORS = {
  brand: {
    50: "#ECF3FF",
    100: "#DCE9FF",
    200: "#BED5FF",
    300: "#92B9FF",
    400: "#6297F5",
    500: "#3B79E0", // Primary
    600: "#245FC2",
    700: "#1C4B99",
    800: "#173C78",
    900: "#142F5E",
  },

  violet: {
    50: "#F4F0FF",
    100: "#E7DFFF",
    200: "#D3C2FF",
    300: "#B79BFF",
    400: "#9670FA",
    500: "#7A4FE6",
    600: "#653CC3",
    700: "#532FA0",
    800: "#452A80",
    900: "#3A2668",
  },

  cyan: {
    50: "#EDFCFA",
    100: "#D2F7F1",
    200: "#A5EEE4",
    300: "#71E0D3",
    400: "#3CCABF",
    500: "#1FAEA3",
    600: "#188C84",
    700: "#146F69",
    800: "#125954",
    900: "#114A46",
  },

  amber: {
    50: "#FFF8E8",
    100: "#FFEDBF",
    200: "#FFE08F",
    300: "#FFD05C",
    400: "#F8BD34",
    500: "#E9A81D",
    600: "#C98616",
    700: "#A66715",
    800: "#875215",
    900: "#6F4414",
  },

  surface: {
    50: "#F6F8FC",
    100: "#EDF2FA",
    200: "#D8E1EF",
  },

  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  white: "#FFFFFF",
  black: "#000000",
} as const;

export const THEMES = {
  light: {
    background: "#F6F8FC",
    surface: "#FFFFFF",
    surfaceSubtle: "#EDF2FA",
    border: "#D8E1EF",
    text: "#132238",
    textMuted: "#5C6C84",
    primary: "#245FC2",
    secondary: "#1FAEA3",
    accent: "#E9A81D",
  },
  dark: {
    background: "#0C1424",
    surface: "#121D31",
    surfaceSubtle: "#1A2740",
    border: "#263755",
    text: "#EAF0FA",
    textMuted: "#A6B3C9",
    primary: "#6297F5",
    secondary: "#3CCABF",
    accent: "#F8BD34",
  },
} as const;

/** Spacing scale (in points) */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Border radius scale */
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** Font sizes */
export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

/** Animation timing (ms) */
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: 420,
} as const;

/** API configuration */
function resolveDevApiBaseUrl() {
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost;

  const host = hostUri?.split(":")[0];

  return host ? `http://${host}:3000` : "http://localhost:3000";
}

export const API_CONFIG = {
  // Optional override for localtunnel/ngrok or custom environments.
  BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    (__DEV__ ? resolveDevApiBaseUrl() : "https://your-production-url.com"),
  TIMEOUT: 30000,
} as const;

/** Storage keys */
export const STORAGE_KEYS = {
  TOKEN: "auth_token",
  USER: "user_data",
  CACHED_SUBJECTS: "cached_subjects",
  CACHED_PROGRESS: "cached_progress",
  OFFLINE_QUEUE: "offline_queue",
  LAST_CONTENT: "last_viewed_content",
  ONBOARDING_DONE: "onboarding_complete",
} as const;

/** Year/semester filter options */
export const YEAR_OPTIONS = [
  { label: "All", value: 0 },
  { label: "Year 1", value: 1 },
  { label: "Year 2", value: 2 },
  { label: "Year 3", value: 3 },
  { label: "Year 4", value: 4 },
] as const;

/** Content type labels & icons */
export const CONTENT_TYPES = {
  notes: { label: "Notes", icon: "document-text-outline" },
  flashcards: { label: "Flashcards", icon: "albums-outline" },
  quiz: { label: "Quiz", icon: "help-circle-outline" },
} as const;
