"use client";

import Link from "next/link";
import { ArrowRight, Sun, Sparkles } from "lucide-react";
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
  { value: "700+", label: "students" },
  { value: "54%", label: "time saved" },
  { value: "2.3×", label: "marks lift" },
];

const FEATURES = [
  {
    title: "Predicts what repeats",
    sub: "Trained on 8 cycles of past papers per subject. Surfaces the 12 questions most likely to repeat.",
    icon: "↗",
  },
  {
    title: "Compresses your syllabus",
    sub: "Cuts noise. Reveals the 20% of topics that score 80% of marks for your specific exam.",
    icon: "≡",
  },
  {
    title: "Targets your weak zones",
    sub: "Memory decay tracking. Adaptive recall cycles. Re-tests where you forgot most.",
    icon: "◎",
  },
];

export default function LandingPage() {
  const { toggleTheme, theme } = useTheme();

  return (
    <div className="min-h-screen relative">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-white/[0.04] bg-[rgb(var(--bg))]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-6 px-5 md:px-8 lg:px-12 py-4">
          <Wordmark size="md" />
          <nav className="hidden lg:flex items-center gap-7 text-[13.5px] text-chalk-300">
            <a href="#features" className="hover:text-[rgb(var(--fg))]">
              Features
            </a>
            <a href="#how" className="hover:text-[rgb(var(--fg))]">
              How it works
            </a>
            <a href="#trusted" className="hover:text-[rgb(var(--fg))]">
              Trusted at
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-[13px] text-chalk-300 hover:text-[rgb(var(--fg))] px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-pill bg-mint-500 px-4 py-2 text-[13px] font-semibold text-ink-950 hover:bg-mint-400 transition-colors"
            >
              Enter <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
            >
              <Sun className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8 lg:px-12 pt-12 md:pt-20 lg:pt-28 pb-12 lg:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <Pill variant="mint" className="mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
              AI Exam OS · v2.6
            </Pill>
            <h1 className="text-[44px] md:text-[64px] lg:text-[84px] xl:text-[96px] font-bold leading-[1.02] tracking-[-0.025em] text-[rgb(var(--fg))]">
              Stop revising <span className="text-chalk-400">everything</span>{" "}
              <span className="text-mint">equally.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] lg:text-[18px] leading-[1.6] text-chalk-300">
              Compressed revision for maximum marks. Predict what repeats, focus
              on what matters, walk in prepared.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-mint-500 px-7 py-4 text-[15px] font-semibold text-ink-950 hover:bg-mint-400 transition-colors shadow-[0_8px_32px_-8px_rgba(31,184,144,0.45)]"
              >
                Enter mission control <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="text-[14px] text-chalk-400 hover:text-[rgb(var(--fg))] px-3 py-2"
              >
                Skip · view demo
              </Link>
            </div>

            {/* Stats inline */}
            <div className="mt-12 grid grid-cols-3 gap-6 lg:gap-10 max-w-2xl">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-[28px] md:text-[36px] lg:text-[44px] font-bold text-[rgb(var(--fg))] leading-none">
                    {s.value}
                  </p>
                  <p className="mt-2 text-[10.5px] uppercase tracking-cap text-chalk-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Predicted card */}
          <div className="lg:col-span-5">
            <HighlightCard
              caption={
                <>
                  <span className="text-mint-400">PREDICTED</span> · DBMS · 2024
                  CYCLE
                </>
              }
              dot="mint"
              className="lg:p-7 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]"
            >
              <h3 className="text-[18px] lg:text-[22px] font-semibold leading-snug text-[rgb(var(--fg))]">
                Normalization gives highest marks-per-minute this exam.
              </h3>
              <div className="mt-5 lg:mt-6 space-y-3.5 lg:space-y-4">
                {PREDICTED_TOPICS.map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between gap-3 mb-2">
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
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative border-t border-white/[0.04] bg-[rgb(var(--bg-subtle))]/30"
      >
        <div className="mx-auto max-w-[1400px] px-5 md:px-8 lg:px-12 py-16 lg:py-24">
          <div className="max-w-2xl">
            <MetaCaption className="mb-3">What it does</MetaCaption>
            <h2 className="text-[32px] md:text-[44px] lg:text-[56px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
              Three forces compress your prep.
            </h2>
          </div>
          <div className="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-6 lg:p-8 hover:border-mint-500/20 transition-colors"
              >
                <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-mint-500/10 text-mint-400 text-[18px]">
                  {f.icon}
                </span>
                <h3 className="mt-6 text-[18px] lg:text-[20px] font-semibold leading-snug text-[rgb(var(--fg))]">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13.5px] lg:text-[14.5px] leading-relaxed text-chalk-400">
                  {f.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8 lg:px-12 py-16 lg:py-24">
          <div className="max-w-3xl">
            <Pill variant="mint" className="mb-5">
              <Sparkles className="h-3 w-3" />
              How it works
            </Pill>
            <h2 className="text-[32px] md:text-[44px] lg:text-[56px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
              Built like a study OS,
              <br />
              <span className="text-chalk-400">not another notes app.</span>
            </h2>
          </div>
          <div className="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {[
              {
                step: "01",
                title: "Pull syllabus",
                body: "We import your subjects from your college and branch in seconds.",
              },
              {
                step: "02",
                title: "Crawl 8 cycles",
                body: "Past papers are clustered, weighted, and scored for repeat probability.",
              },
              {
                step: "03",
                title: "Predict & compress",
                body: "AI rebuilds a paper that mirrors what your exam will likely look like.",
              },
              {
                step: "04",
                title: "Curate & drill",
                body: "Daily plan re-sequenced by memory decay and marks-per-minute yield.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-6 lg:p-7"
              >
                <p className="text-[11px] font-mono text-mint-400">{s.step}</p>
                <h3 className="mt-3 text-[16.5px] font-semibold text-[rgb(var(--fg))]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] text-chalk-400 leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8 lg:px-12 py-16 lg:py-28 text-center">
          <h2 className="text-[36px] md:text-[56px] lg:text-[80px] font-bold leading-[1.02] tracking-[-0.02em] text-[rgb(var(--fg))]">
            Walk in <span className="text-mint">prepared.</span>
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-[15px] lg:text-[17px] text-chalk-400">
            Free for students. No credit card. Set up in 60 seconds.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-[14px] bg-mint-500 px-8 py-4 text-[15px] font-semibold text-ink-950 hover:bg-mint-400 transition-colors shadow-[0_8px_32px_-8px_rgba(31,184,144,0.5)]"
          >
            Enter mission control <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04]">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8 lg:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Wordmark size="sm" />
          <p className="text-[12px] text-chalk-500">
            © {new Date().getFullYear()} UniSage · The Digital Curator
          </p>
        </div>
      </footer>
    </div>
  );
}
