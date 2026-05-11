"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import HtmlContent from "@/components/content/HtmlContent";
import { ChevronDown, ChevronRight, ListTree, X } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocNode extends TocItem {
  children: TocNode[];
}

function buildTocTree(items: TocItem[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const item of items) {
    const node: TocNode = { ...item, children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return root;
}

function tocSignature(items: TocItem[]) {
  return items.map((item) => `${item.id}:${item.text}:${item.level}`).join("|");
}

function collapsedByDefault(nodes: TocNode[]) {
  const next: Record<string, boolean> = {};
  const walk = (items: TocNode[]) => {
    for (const item of items) {
      if (item.children.length) next[item.id] = true;
      walk(item.children);
    }
  };
  walk(nodes);
  return next;
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
  const tocSignatureRef = useRef("");
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const tocTree = useMemo(() => buildTocTree(toc), [toc]);

  // Inject ids onto headings + extract TOC after sanitized HTML lands.
  // HtmlContent sanitizes asynchronously, so observe the article instead of
  // only scanning immediately after React renders.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const refreshToc = () => {
      const headings = Array.from(
        article.querySelectorAll("h1, h2, h3, h4")
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
        h.setAttribute("data-rv-heading", "1");
        return {
          id: h.id,
          text: h.textContent || "",
          level: parseInt(h.tagName.slice(1), 10),
        };
      });
      const signature = tocSignature(items);
      if (signature !== tocSignatureRef.current) {
        tocSignatureRef.current = signature;
        setToc(items);
      }
    };

    refreshToc();
    const observer = new MutationObserver(refreshToc);
    observer.observe(article, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [html]);

  // Track scroll for progress + active heading.
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
        articleRef.current.querySelectorAll("h1, h2, h3, h4")
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

      {toc.length > 0 && (
        <div className="fixed left-5 right-5 top-[calc(var(--safe-top)+0.5rem)] z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOutlineOpen(true)}
            className="inline-flex w-full items-center justify-between rounded-card border border-white/[0.08] bg-[rgb(var(--bg))]/95 px-3 py-2.5 text-left text-[13px] font-semibold text-[rgb(var(--fg))] shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md"
          >
            <span className="inline-flex items-center gap-2">
              <ListTree className="h-4 w-4 text-mint-400" />
              Outline
            </span>
            <span className="text-[11px] font-medium text-chalk-500">
              {toc.length} sections
            </span>
          </button>
        </div>
      )}

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
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2">
              <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500 mb-3">
                Outline
              </p>
              <Outline
                nodes={tocTree}
                activeId={activeId}
                onSelect={handleTocClick}
              />
            </div>
          </aside>
        )}
      </div>

      {toc.length > 0 && mobileOutlineOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close outline"
            onClick={() => setMobileOutlineOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[78vh] rounded-t-[16px] border border-white/[0.08] bg-[rgb(var(--bg))] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
                  Table of contents
                </p>
                <h2 className="mt-1 text-[18px] font-semibold text-[rgb(var(--fg))]">
                  Outline
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileOutlineOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] text-chalk-300"
                aria-label="Close outline"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto pr-1">
              <Outline
                nodes={tocTree}
                activeId={activeId}
                onSelect={(id) => {
                  setMobileOutlineOpen(false);
                  window.setTimeout(() => handleTocClick(id), 80);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Outline({
  nodes,
  activeId,
  onSelect,
}: {
  nodes: TocNode[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const ancestors = useMemo(() => {
    const map: Record<string, string[]> = {};
    const walk = (ns: TocNode[], chain: string[]) => {
      for (const node of ns) {
        map[node.id] = chain;
        if (node.children.length) walk(node.children, [...chain, node.id]);
      }
    };
    walk(nodes, []);
    return map;
  }, [nodes]);

  useEffect(() => {
    setCollapsed(collapsedByDefault(nodes));
  }, [nodes]);

  const handleSelect = (id: string) => {
    const chain = ancestors[id] || [];
    if (chain.length) {
      setCollapsed((prev) => {
        const next = { ...prev };
        for (const parentId of chain) next[parentId] = false;
        return next;
      });
    }
    onSelect(id);
  };

  return (
    <nav className="space-y-0 border-l border-white/[0.06]">
      {nodes.map((node) => (
        <OutlineNode
          key={node.id}
          node={node}
          depth={0}
          activeId={activeId}
          collapsed={collapsed}
          onToggle={(id) =>
            setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          onSelect={handleSelect}
        />
      ))}
    </nav>
  );
}

function OutlineNode({
  node,
  depth,
  activeId,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: TocNode;
  depth: number;
  activeId: string;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const isActive = activeId === node.id;
  const hasChildren = node.children.length > 0;
  const isCollapsed = !!collapsed[node.id];
  const indent = depth * 14;

  return (
    <div>
      <div
        className={cn(
          "group flex w-full items-center -ml-px border-l text-left text-[12.5px] leading-snug transition-colors",
          isActive
            ? "border-mint-400 text-mint-400"
            : "border-transparent text-chalk-400 hover:text-[rgb(var(--fg))]"
        )}
        style={{ paddingLeft: indent }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
            className="ml-1 grid h-5 w-5 shrink-0 place-items-center rounded text-chalk-500 hover:text-[rgb(var(--fg))]"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="ml-1 inline-block h-5 w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "min-w-0 flex-1 py-1.5 pr-2 text-left",
            node.level === 1 && "font-semibold text-[13px]",
            node.level === 2 && "font-medium",
            node.level >= 4 && "text-[12px] text-chalk-500"
          )}
        >
          <span className="line-clamp-2">{node.text}</span>
        </button>
      </div>
      {hasChildren && !isCollapsed && (
        <div>
          {node.children.map((child) => (
            <OutlineNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
