"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { easeOut } from "@/lib/motion";

const sections = [
  { label: "Main", id: "hero" },
  { label: "Work", id: "work" },
  { label: "Principles", id: "principles" },
  { label: "Contact", id: "contact" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export function Nav() {
  const reducedMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // SCROLL VISIBILITY LOGIC (SIMPLE)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip for reduced motion - nav always visible
    if (reducedMotion) return;

    function handleScroll() {
      // On any scroll event: hide nav, reset timer
      setIsScrolling(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // After 400ms of no scroll events: show nav
      timerRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 400);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [reducedMotion]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE SECTION DETECTION
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sectionElements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (sectionElements.length === 0) return;

    const visibleSections = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        if (visibleSections.size > 0) {
          let maxRatio = 0;
          let activeId: SectionId = "hero";

          visibleSections.forEach((ratio, id) => {
            if (ratio > maxRatio) {
              maxRatio = ratio;
              activeId = id as SectionId;
            }
          });

          setActiveSection(activeId);
        }
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
        rootMargin: "-10% 0px -10% 0px",
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FOCUS HANDLERS (ACCESSIBILITY)
  // ─────────────────────────────────────────────────────────────────────────
  const handleFocus = () => setHasFocus(true);
  const handleBlur = () => setHasFocus(false);

  // ─────────────────────────────────────────────────────────────────────────
  // NAV CLICK HANDLER
  // Blur after scroll to release focus - scroll visibility takes over
  // ─────────────────────────────────────────────────────────────────────────
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;

    // Blur the clicked element to release focus state
    // This ensures scroll visibility logic takes over immediately
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    target.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VISIBILITY CALCULATION
  // - Reduced motion: always visible
  // - Has focus: always visible (accessibility)
  // - Otherwise: visible when not scrolling
  // ─────────────────────────────────────────────────────────────────────────
  const isVisible = reducedMotion || hasFocus || !isScrolling;
  const navOpacity = isVisible ? 1 : 0;

  // Transition for active item spacing/opacity changes
  const itemTransition = reducedMotion
    ? "none"
    : "padding 250ms ease-in-out, opacity 250ms ease-in-out, color 250ms ease-in-out";

  return (
    <>
      {/* Mobile: bottom horizontal nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-bg/90 px-5 py-4 backdrop-blur-sm sm:hidden"
        aria-label="Page navigation"
        style={{
          opacity: navOpacity,
          transition: reducedMotion ? "none" : "opacity 150ms ease-in-out",
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <ul className="flex items-center justify-center gap-6">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => handleNavClick(e, section.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="font-mono text-[11px] tracking-wide focus:outline-none focus-visible:text-fg active:opacity-70"
                  style={{
                    color: isActive
                      ? "var(--color-fg)"
                      : "var(--color-fg-muted)",
                    opacity: isActive ? 1 : 0.6,
                    transition: itemTransition,
                  }}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: right-side vertical nav */}
      <nav
        className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 sm:right-8 sm:block lg:right-12"
        aria-label="Page navigation"
        style={{
          opacity: navOpacity,
          transition: reducedMotion ? "none" : "opacity 150ms ease-in-out",
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <ul className="flex flex-col items-end">
          {sections.map((section, index) => {
            const isActive = section.id === activeSection;

            return (
              <motion.li
                key={section.id}
                initial={{ opacity: 0, x: reducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: reducedMotion ? 0 : 0.5,
                  delay: reducedMotion ? 0 : 0.6 + index * 0.08,
                  ease: easeOut,
                }}
                style={{
                  paddingTop: isActive ? 16 : 4,
                  paddingBottom: isActive ? 16 : 4,
                  transition: itemTransition,
                }}
              >
                <a
                  href={`#${section.id}`}
                  onClick={(e) => handleNavClick(e, section.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="block font-mono text-xs tracking-wide focus:outline-none focus-visible:text-fg active:opacity-70"
                  style={{
                    color: isActive
                      ? "var(--color-fg)"
                      : "var(--color-fg-muted)",
                    opacity: isActive ? 1 : 0.5,
                    transition: itemTransition,
                  }}
                >
                  {section.label}
                </a>
              </motion.li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
