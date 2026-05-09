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
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5">
        <Wordmark size="md" />
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-full text-chalk-300 hover:bg-white/[0.05]"
        >
          <Sun className="h-4 w-4" />
        </button>
      </header>

      {/* Hero */}
      <section className="px-5 pt-10">
        <Pill variant="mint" className="mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
          AI Exam OS · v2.6
        </Pill>
        <h1 className="text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-[rgb(var(--fg))]">
          Stop revising
          <br />
          <span className="text-chalk-400">everything</span>
          <br />
          <span className="text-mint">equally.</span>
        </h1>
        <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.55] text-chalk-300">
          Compressed revision for maximum marks. Predict what repeats, focus on
          what matters, walk in prepared.
        </p>
      </section>

      {/* Predicted card */}
      <section className="px-5 pt-7">
        <HighlightCard
          caption={
            <>
              <span className="text-mint-400">PREDICTED</span> · DBMS · 2024
              CYCLE
            </>
          }
          dot="mint"
        >
          <h3 className="text-[16px] font-semibold leading-snug text-[rgb(var(--fg))]">
            Normalization gives highest marks-per-minute this exam.
          </h3>
          <div className="mt-4 space-y-3">
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
      </section>

      {/* Stats row */}
      <section className="px-5 pt-7">
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-card border border-white/[0.05] bg-[rgb(var(--bg-elev))] px-3 py-4 text-center"
            >
              <p className="text-[20px] font-bold text-[rgb(var(--fg))]">
                {s.value}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-cap text-chalk-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What it does */}
      <section className="px-5 pt-9">
        <MetaCaption className="mb-3">What it does</MetaCaption>
        <div className="space-y-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-card border border-white/[0.05] bg-[rgb(var(--bg-elev))] p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-mint-500/10 text-mint-400 text-[14px]">
                {f.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[rgb(var(--fg))]">
                  {f.title}
                </p>
                <p className="mt-0.5 text-[12px] text-chalk-400">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted at */}
      <section className="px-5 pt-9">
        <MetaCaption className="mb-3 text-center">Trusted at</MetaCaption>
        <div className="flex flex-wrap justify-center gap-2">
          {COLLEGES.map((c) => (
            <span
              key={c}
              className="rounded-pill border border-white/[0.06] bg-transparent px-3 py-1.5 text-[11px] font-medium text-chalk-300"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="sticky-cta">
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
