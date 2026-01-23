"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { projects } from "@/lib/data";
import { easeOut } from "@/lib/motion";

export function Work() {
  const reducedMotion = useReducedMotion();

  const transition = {
    duration: reducedMotion ? 0 : 0.6,
    ease: easeOut,
  };

  return (
    <section
      id="work"
      className="relative z-10 bg-bg px-5 py-9 sm:px-8 sm:py-9 lg:px-12"
    >
      <div className="mx-auto max-w-240">
        {/* Section header */}
        <motion.div
          className="mb-8 flex items-baseline justify-between border-b border-border pb-4 sm:mb-9"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={transition}
        >
          <h2 className="text-lg font-medium tracking-tight sm:text-xl">
            Selected Work
          </h2>
          <span className="font-mono text-xs text-fg-subtle">02</span>
        </motion.div>

        {/* Projects list */}
        <div className="flex flex-col">
          {projects.map((project, index) => (
            <motion.article
              key={project.id}
              className="py-7 first:pt-0 sm:py-8"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                ...transition,
                delay: reducedMotion ? 0 : index * 0.1,
              }}
            >
              {/* Two-column header: text left, buttons right (stacked on mobile) */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                {/* Left column: text content */}
                <div className="flex-1">
                  {/* Project title with index */}
                  <h3 className="relative text-lg font-medium tracking-tight sm:text-xl md:text-2xl">
                    <span className="absolute -left-8 hidden font-mono text-[10px] font-normal text-fg-subtle/50 lg:-left-10 lg:inline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted sm:mt-3 sm:text-base">
                    {project.description}
                  </p>

                  {/* Metadata */}
                  <p className="mt-4 font-mono text-xs text-fg-subtle">
                    {project.meta}
                  </p>
                </div>

                {/* Action buttons: horizontal on mobile, stacked on desktop */}
                <div className="flex shrink-0 flex-row gap-3 sm:flex-col">
                  <a
                    href={project.href}
                    className="rounded-full border border-fg-subtle/40 px-4 py-2 text-center font-mono text-xs text-fg-muted transition-all duration-150 hover:border-fg-muted hover:opacity-80 focus:outline-none focus-visible:border-fg-muted"
                  >
                    View Project
                  </a>
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-fg-subtle/40 px-4 py-2 text-center font-mono text-xs text-fg-muted transition-all duration-150 hover:border-fg-muted hover:opacity-80 focus:outline-none focus-visible:border-fg-muted"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>

              {/* Project image */}
              <div className="relative mt-6 aspect-2/1 w-full overflow-hidden sm:mt-7">
                <Image
                  src={project.image}
                  alt=""
                  fill
                  className="object-cover grayscale"
                  style={{ filter: "grayscale(100%) contrast(0.95)" }}
                  sizes="(max-width: 640px) 100vw, 960px"
                />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
