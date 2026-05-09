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
        mint: {
          50: "#E7FBF5",
          100: "#C7F4E6",
          200: "#9BE9D2",
          300: "#6BDDB8",
          400: "#3CCE9C",
          500: "#1FB890",
          600: "#199677",
          700: "#157660",
          800: "#125B4C",
          900: "#0F4A3F",
        },
        ink: {
          950: "#06090A",
          900: "#0A0E0F",
          800: "#0F1416",
          700: "#141A1D",
          600: "#1B2226",
          500: "#232C30",
          400: "#3A4549",
        },
        cream: {
          50: "#FBFAF6",
          100: "#F4F1EA",
          200: "#E8E3D6",
          300: "#D6CFBE",
        },
        chalk: {
          50: "#F6F8F7",
          100: "#E5E9E8",
          200: "#C7CECC",
          300: "#A0A8A4",
          400: "#7E8784",
          500: "#5A6360",
          600: "#404745",
        },
        flame: {
          400: "#F26B6B",
          500: "#E84F4F",
          600: "#C93A3A",
        },
        ember: {
          300: "#F2C97A",
          400: "#E6B25C",
          500: "#D49538",
        },
        brand: {
          50: "#E7FBF5",
          100: "#C7F4E6",
          200: "#9BE9D2",
          300: "#6BDDB8",
          400: "#3CCE9C",
          500: "#1FB890",
          600: "#199677",
          700: "#157660",
          800: "#125B4C",
          900: "#0F4A3F",
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
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        cap: "0.14em",
        capwide: "0.18em",
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        cardDark: "0 1px 0 rgba(255,255,255,0.04) inset",
        glowMint: "0 12px 48px -16px rgba(31,184,144,0.45)",
        soft: "0 2px 8px -2px rgba(0, 0, 0, 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
