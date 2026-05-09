"use client";

import Link from "next/link";
import { ArrowRight, Sun } from "lucide-react";
import { Wordmark } from "@/components/unisage/AppShell";
import {
  Pill,
  HighlightCard,
  SegmentedProgress,
  MetaCaption,
} from "@/components/unisage/primitives";
import { useTheme } from "@/lib/hooks/useTheme";

const PREDICTED_TOPICS = [
  { name: "Normalization · 3NF/BCNF", pct: 96 },
  { name: "Transaction · ACID", pct: 84 },
  { name: "Indexing · B+ Tree", pct: 72 },
];

const STATS = [
  { value: "127K", label: "students" },
  { value: "54%", label: "time saved" },
  { value: "2.3×", label: "marks lift" },
];

const FEATURES = [
  {
    title: "Predicts what repeats",
    sub: "Trained on 8 cycles of past papers per subject.",
    icon: "↗",
  },
  {
    title: "Compresses your syllabus",
    sub: "Cuts noise. Surfaces the 20% that scores 80%.",
    icon: "≡",
  },
  {
    title: "Targets your weak zones",
    sub: "Memory decay tracking. Adaptive recall cycles.",
    icon: "◎",
  },
];

const COLLEGES = ["IIT-D", "BITS", "VIT", "NIT-T", "DTU", "IIIT-H"];

export default function LandingPage() {
  const { toggleTheme, theme } = useTheme();

  return (
    <div className="min-h-screen pb-32 lg:pb-12">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 md:px-8 md:pt-7 lg:px-12">
        <Wordmark size="md" />
        <div className="hidden lg:flex items-center gap-6 text-[13px] text-chalk-300">
          <a href="#features" className="hover:text-[rgb(var(--fg))]">
            Features
          </a>
          <a href="#trusted" className="hover:text-[rgb(var(--fg))]">
            Trusted at
          </a>
          <Link href="/login" className="hover:text-[rgb(var(--fg))]">
            Sign in
          </Link>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
        >
          <Sun className="h-4 w-4" />
        </button>
      </header>

      {/* Hero (2-col on lg+) */}
      <section className="px-5 pt-10 md:px-8 md:pt-14 lg:px-12 lg:pt-20 lg:grid lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6 xl:col-span-7">
          <Pill variant="mint" className="mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
            AI Exam OS · v2.6
          </Pill>
          <h1 className="text-[44px] md:text-[56px] lg:text-[68px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
            Stop revising
            <br />
            <span className="text-chalk-400">everything</span>
            <br />
            <span className="text-mint">equally.</span>
          </h1>
          <p className="mt-5 max-w-[40ch] text-[15px] md:text-[17px] leading-[1.55] text-chalk-300">
            Compressed revision for maximum marks. Predict what repeats, focus
            on what matters, walk in prepared.
          </p>

          {/* Desktop CTA inline */}
          <div className="hidden lg:flex items-center gap-3 mt-9">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-mint-500 px-7 py-4 text-[15px] font-semibold text-ink-950 hover:bg-mint-400 transition-colors"
            >
              Enter mission control <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-[14px] text-chalk-400 hover:text-[rgb(var(--fg))]"
            >
              Skip · view demo
            </Link>
          </div>
        </div>

        {/* Predicted card */}
        <div className="mt-7 lg:mt-0 lg:col-span-6 xl:col-span-5">
          <HighlightCard
            caption={
              <>
                <span className="text-mint-400">PREDICTED</span> · DBMS · 2024
                CYCLE
              </>
            }
            dot="mint"
            className="lg:p-6"
          >
            <h3 className="text-[16px] lg:text-[20px] font-semibold leading-snug text-[rgb(var(--fg))]">
              Normalization gives highest marks-per-minute this exam.
            </h3>
            <div className="mt-4 lg:mt-6 space-y-3 lg:space-y-4">
              {PREDICTED_TOPICS.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[13px] text-chalk-300 truncate">
                      {t.name}
                    </span>
                    <span className="text-[12px] font-semibold text-mint">
                      {t.pct}%
                    </span>
                  </div>
                  <SegmentedProgress value={t.pct} segments={28} />
                </div>
              ))}
            </div>
          </HighlightCard>
        </div>
      </section>

      {/* Stats row */}
      <section className="px-5 pt-7 md:px-8 md:pt-12 lg:px-12">
        <div className="grid grid-cols-3 gap-3 md:gap-5 lg:max-w-3xl">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-card border border-white/[0.05] bg-[rgb(var(--bg-elev))] px-3 py-4 md:py-6 text-center"
            >
              <p className="text-[20px] md:text-[28px] lg:text-[32px] font-bold text-[rgb(var(--fg))]">
                {s.value}
              </p>
              <p className="mt-1 text-[10px] md:text-[11px] uppercase tracking-cap text-chalk-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What it does */}
      <section id="features" className="px-5 pt-9 md:px-8 md:pt-14 lg:px-12">
        <MetaCaption className="mb-3 lg:mb-5">What it does</MetaCaption>
        <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-card border border-white/[0.05] bg-[rgb(var(--bg-elev))] p-4 lg:p-6 lg:flex-col lg:gap-4"
            >
              <span className="grid h-9 w-9 lg:h-11 lg:w-11 shrink-0 place-items-center rounded-[10px] bg-mint-500/10 text-mint-400 text-[14px] lg:text-[16px]">
                {f.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] lg:text-[16px] font-semibold text-[rgb(var(--fg))]">
                  {f.title}
                </p>
                <p className="mt-0.5 lg:mt-1 text-[12px] lg:text-[13px] text-chalk-400">
                  {f.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted at */}
      <section
        id="trusted"
        className="px-5 pt-9 pb-8 md:px-8 md:pt-14 md:pb-12 lg:px-12"
      >
        <MetaCaption className="mb-3 lg:mb-5 text-center">Trusted at</MetaCaption>
        <div className="flex flex-wrap justify-center gap-2 lg:gap-3">
          {COLLEGES.map((c) => (
            <span
              key={c}
              className="rounded-pill border border-white/[0.06] bg-transparent px-3 py-1.5 lg:px-5 lg:py-2 text-[11px] lg:text-[13px] font-medium text-chalk-300"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Sticky CTA — only on mobile/tablet */}
      <div className="sticky-cta lg:hidden">
        <Link
          href="/login"
          className="btn-primary"
          aria-label="Enter mission control"
        >
          Enter mission control <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-2 text-center text-[12px] text-chalk-400">
          <Link href="/login" className="hover:text-[rgb(var(--fg))]">
            Skip · view demo
          </Link>
        </p>
      </div>
    </div>
  );
}
