"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThreeDCard } from "@/components/shared/ThreeDCard";
import {
  GraduationCap,
  BookOpen,
  Brain,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Star,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Complete Notes",
    description:
      "Syllabus-based study material organized by subject and unit.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Brain,
    title: "Smart Flashcards",
    description:
      "Interactive flashcards that make revision faster and more memorable.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: CheckCircle2,
    title: "Practice Quizzes",
    description:
      "Instant feedback and detailed explanations to lock in concepts.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    description:
      "Monitor momentum with analytics, streaks, and completion insights.",
    color: "bg-amber-50 text-amber-600",
  },
];

const stats = [
  { icon: Users, value: "500+", label: "Active Students" },
  { icon: BookOpen, value: "100+", label: "Study Materials" },
  { icon: Star, value: "4.8", label: "Student Rating" },
  { icon: Zap, value: "10k+", label: "Flashcards Created" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f7ff]">
      <header className="fixed top-0 z-50 w-full border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 shadow-glow">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">UniSage</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  Get Started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl animate-drift" />
          <div className="absolute -left-20 top-20 h-60 w-60 rounded-full bg-violet-200/50 blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-cyan-200/40 blur-3xl animate-glow-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-1.5 text-sm font-medium text-brand-700 shadow-soft backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Built for UPES CSE Students
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Study Smarter,
            <br />
            <span className="gradient-text">Not Harder</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            The all-in-one study platform with complete notes, interactive
            flashcards, practice quizzes, and progress tracking — built for
            your syllabus.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="xl" className="w-full sm:w-auto shadow-glow">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 mx-auto mt-16 max-w-6xl"
        >
          <div className="relative mx-auto h-[460px] perspective-1000 sm:h-[500px]">
            <motion.div
              initial={{ opacity: 0, x: -40, y: 24, rotateY: 18, rotateX: 10 }}
              animate={{ opacity: 1, x: 0, y: 0, rotateY: 18, rotateX: 10 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="absolute left-0 top-10 hidden w-[240px] rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-float backdrop-blur-xl lg:block"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                  Focus
                </span>
                <span className="text-xs text-gray-400">+14%</span>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded-full bg-gray-200" />
                <div className="h-4 w-1/2 rounded-full bg-gray-100" />
                <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 p-4 text-white shadow-glow">
                  <div className="text-3xl font-black">3D</div>
                  <div className="text-sm opacity-90">study flow</div>
                </div>
              </div>
            </motion.div>

            <ThreeDCard className="absolute left-1/2 top-0 w-[min(100%,960px)] -translate-x-1/2">
              <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-float backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/70 bg-white/80 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <span className="ml-2 text-xs text-gray-400">
                    unisage.app/dashboard
                  </span>
                </div>
                <div className="bg-gradient-to-br from-surface-50 via-white to-brand-50/40 p-6 sm:p-8">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft">
                      <div className="mb-2 text-3xl">🔥</div>
                      <div className="text-2xl font-bold text-gray-900">
                        5-day streak
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Keep it going!
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft sm:col-span-2">
                      <div className="mb-1 text-sm text-gray-500">
                        Continue studying
                      </div>
                      <div className="mb-2 text-lg font-semibold text-gray-900">
                        Data Structures & Algorithms
                      </div>
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-cyan-400" />
                      </div>
                      <div className="text-xs text-gray-400">67% complete</div>
                    </div>
                  </div>
                </div>
              </div>
            </ThreeDCard>

            <motion.div
              initial={{ opacity: 0, x: 40, y: 34, rotateY: -18, rotateX: 10 }}
              animate={{ opacity: 1, x: 0, y: 0, rotateY: -18, rotateX: 10 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="absolute bottom-8 right-0 hidden w-[260px] rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-float backdrop-blur-xl lg:block"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                  Momentum
                </span>
                <span className="text-xs text-gray-400">98%</span>
              </div>
              <div className="h-28 rounded-[24px] bg-gradient-to-br from-cyan-100 via-white to-brand-100 p-4 shadow-innerSoft">
                <div className="flex h-full items-end gap-2">
                  <div className="h-8 w-8 rounded-xl bg-brand-500/80" />
                  <div className="h-14 w-8 rounded-xl bg-violet-500/80" />
                  <div className="h-20 w-8 rounded-xl bg-cyan-500/80" />
                  <div className="h-12 w-8 rounded-xl bg-amber-400/80" />
                  <div className="h-24 w-8 rounded-xl bg-brand-700/80" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="border-y border-white/70 bg-white/70 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <ThreeDCard key={stat.label} hover={false} className="h-full">
                  <div className="text-center">
                    <Icon className="mx-auto mb-2 h-5 w-5 text-brand-500" />
                    <div className="text-2xl font-bold text-gray-900 sm:text-3xl">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to ace your exams
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              From detailed notes to interactive quizzes, UniSage keeps the
              full study workflow in one place.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={itemVariants}>
                  <ThreeDCard className="h-full">
                    <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
                      <div
                        className={`mb-4 inline-flex rounded-xl p-3 transition-transform ${feature.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-500">
                        {feature.description}
                      </p>
                    </div>
                  </ThreeDCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-violet-600 to-cyan-700 px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 h-60 w-60 rounded-full bg-white" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to study smarter?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-brand-100">
            Join students already using UniSage to organize notes, revise with
            flashcards, and track progress.
          </p>
          <Link href="/signup">
            <Button size="xl" className="bg-white text-brand-700 shadow-lg hover:bg-brand-50">
              Start Learning Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-gray-100 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">UniSage</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="#" className="transition-colors hover:text-gray-900">
                About
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
                Contact
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
                Privacy
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
                Terms
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} UniSage. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
