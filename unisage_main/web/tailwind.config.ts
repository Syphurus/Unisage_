import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ECF3FF",
          100: "#DCE9FF",
          200: "#BED5FF",
          300: "#92B9FF",
          400: "#6297F5",
          500: "#3B79E0",
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
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(0, 0, 0, 0.08)",
        card: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
        elevated: "0 8px 24px -4px rgba(0, 0, 0, 0.12)",
        float: "0 12px 32px -8px rgba(0, 0, 0, 0.15)",
        glow: "0 20px 60px -18px rgba(79, 70, 229, 0.4)",
        innerSoft: "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "bounce-soft": "bounceSoft 0.6s ease-out",
        shimmer: "shimmer 2s linear infinite",
        float: "float 6s ease-in-out infinite",
        drift: "drift 12s ease-in-out infinite",
        "glow-pulse": "glowPulse 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        bounceSoft: {
          "0%": { transform: "scale(0.9)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0px, 0px, 0px) scale(1)" },
          "50%": { transform: "translate3d(10px, -8px, 0px) scale(1.03)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.06)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
