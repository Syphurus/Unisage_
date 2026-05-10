"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import HtmlContent from "@/components/content/HtmlContent";
import { ChevronRight } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Premium long-form reading view.
 *  - sticky table of contents (desktop only)
 *  - reading progress bar at top
 *  - markdown / HTML rendering through HtmlContent
 *  - smooth scroll, anchor links
 */
export function ReadingView({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Inject ids onto headings + extract TOC after each render
  useEffect(() => {
    if (!articleRef.current) return;
    const headings = Array.from(
      articleRef.current.querySelectorAll("h1, h2, h3"),
    ) as HTMLElement[];
    const items: TocItem[] = headings.map((h, i) => {
      if (!h.id) {
        const slug = (h.textContent || `section-${i}`)
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 64);
        h.id = `${slug}-${i}`;
      }
      return {
        id: h.id,
        text: h.textContent || "",
        level: parseInt(h.tagName.slice(1), 10),
      };
    });
    setToc(items);
  }, [html]);

  // Track scroll for progress + active heading
  useEffect(() => {
    const onScroll = () => {
      if (!articleRef.current) return;
      const rect = articleRef.current.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const pct =
        totalHeight > 0 ? Math.min(100, (scrolled / totalHeight) * 100) : 0;
      setProgress(pct);

      // Active heading = last one whose top is above 25% of viewport
      const headings = Array.from(
        articleRef.current.querySelectorAll("h1, h2, h3"),
      ) as HTMLElement[];
      const threshold = window.innerHeight * 0.25;
      let current = "";
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= threshold) current = h.id;
      }
      if (current && current !== activeId) setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeId, html]);

  const handleTocClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 h-[2px] bg-transparent pointer-events-none"
        aria-hidden
      >
        <div
          className="h-full bg-mint-400 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-10", className)}>
        {/* Article */}
        <article
          ref={articleRef}
          className="lg:col-span-9 prose-notes max-w-3xl"
        >
          <HtmlContent html={html} />
        </article>

        {/* TOC sidebar */}
        {toc.length > 0 && (
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-8">
              <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500 mb-3">
                On this page
              </p>
              <nav className="space-y-0.5 border-l border-white/[0.06]">
                {toc.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTocClick(item.id)}
                      className={cn(
                        "group flex w-full items-start gap-2 -ml-px border-l py-1.5 pl-3 text-left text-[12.5px] leading-snug transition-colors",
                        isActive
                          ? "border-mint-400 text-mint-400"
                          : "border-transparent text-chalk-400 hover:text-[rgb(var(--fg))]",
                        item.level === 1 && "font-semibold",
                        item.level === 2 && "pl-3",
                        item.level === 3 && "pl-6 text-[12px]",
                      )}
                    >
                      <span className="line-clamp-2">{item.text}</span>
                      {isActive && (
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
