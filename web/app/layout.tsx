import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "UniSage - Study Smarter, Not Harder",
    template: "%s | UniSage",
  },
  description:
    "AI-powered study platform built for UPES CSE students. Complete notes, flashcards, quizzes, and progress tracking.",
  keywords: [
    "UPES",
    "study",
    "CSE",
    "notes",
    "flashcards",
    "quiz",
    "education",
  ],
  authors: [{ name: "UniSage" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
