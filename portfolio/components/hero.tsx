"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { easeOut } from "@/lib/motion";

export function Hero() {
  const reducedMotion = useReducedMotion();

  const transition = {
    duration: reducedMotion ? 0 : 0.7,
    ease: easeOut,
  };

  const variants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      id="hero"
      className="relative flex h-screen w-full flex-col justify-between overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
    >
      {/* Photo as atmospheric background layer */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: reducedMotion ? 0 : 2,
          delay: reducedMotion ? 0 : 0.3,
        }}
        style={{
          animation: reducedMotion
            ? "none"
            : "bgDrift 100s ease-in-out infinite",
        }}
      >
        <Image
          src="/photo.jpg"
          alt=""
          fill
          className="object-cover opacity-[0.12] grayscale"
          style={{
            objectPosition: "50% 20%",
            filter: "contrast(1.1)",
          }}
          sizes="100vw"
          priority
        />
        {/* Vignette overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to right, var(--color-bg) 0%, transparent 40%, transparent 70%, var(--color-bg) 100%),
              linear-gradient(to bottom, var(--color-bg) 0%, transparent 30%, transparent 70%, var(--color-bg) 100%)
            `,
          }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Ambient light - slow drift */}
      <div
        className="pointer-events-none absolute inset-0 z-1 opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 50% 35% at 25% 55%, rgba(100,100,120,0.1), transparent)",
          animation: reducedMotion
            ? "none"
            : "ambient 90s ease-in-out infinite",
        }}
        aria-hidden="true"
      />

      {/* Section index - architectural convention */}
      <motion.div
        className="relative z-10 flex items-start justify-between"
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={{ ...transition, delay: reducedMotion ? 0 : 0.1 }}
      >
        <span className="font-mono text-xs text-fg-subtle">01</span>
        <span className="font-mono text-xs uppercase tracking-wide text-fg-subtle">
          Portfolio
        </span>
      </motion.div>

      {/* Primary typography block */}
      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <div className="relative">
          {/* Name as typographic system - staggered animation */}
          <h1 className="text-5xl font-medium uppercase leading-[0.85] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl lg:leading-[0.9]">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reducedMotion ? 0 : 0.15 }}
            >
              Sharav
            </motion.span>
            <motion.span
              className="block text-fg-muted"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reducedMotion ? 0 : 0.3 }}
            >
              Pravin
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reducedMotion ? 0 : 0.45 }}
            >
              Talmale
            </motion.span>
          </h1>

          {/* Baseline marker */}
          <motion.div
            className="mt-4 h-px w-12 origin-left bg-fg sm:w-16"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ ...transition, delay: reducedMotion ? 0 : 0.6 }}
            style={{ transformOrigin: "left" }}
          />
        </div>

        {/* Role and descriptor */}
        <motion.div
          className="mt-8 max-w-65 sm:mt-10 sm:max-w-xs lg:max-w-sm"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition, delay: reducedMotion ? 0 : 0.7 }}
        >
          <p className="font-mono text-xs uppercase tracking-wide text-fg-muted">
            Software Engineer
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base md:text-lg">
            Systems, clarity, long-term thinking.
          </p>
        </motion.div>
      </div>

      {/* Footer metadata */}
      <motion.div
        className="relative z-10 flex items-end justify-between pb-16 font-mono text-xs text-fg-subtle sm:pb-0"
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={{ ...transition, delay: reducedMotion ? 0 : 0.5 }}
      >
        <div className="flex items-center gap-4">
          <span>India</span>
          <span className="h-px w-6 bg-border" aria-hidden="true" />
          <span>Available</span>
        </div>
        <span className="hidden sm:block">2026</span>
      </motion.div>
    </section>
  );
}
