"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────
// Meta caption — tiny ALL-CAPS tracked-out label
// ─────────────────────────────────────────────────────────
export function MetaCaption({
  children,
  dot,
  className,
}: {
  children: ReactNode;
  dot?: "mint" | "flame" | "ember" | null;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500",
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dot === "mint" && "bg-mint-400 animate-pulse-soft",
            dot === "flame" && "bg-flame-500",
            dot === "ember" && "bg-ember-400",
          )}
        />
      )}
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────
// Pill / status chip
// ─────────────────────────────────────────────────────────
export function Pill({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?:
    | "default"
    | "mint"
    | "mint-solid"
    | "flame"
    | "ember"
    | "outline";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "pill",
        variant === "mint" && "pill-mint",
        variant === "mint-solid" && "pill-mint-solid",
        variant === "flame" && "pill-flame",
        variant === "ember" && "pill-ember",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Card surfaces
// ─────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  variant = "surface",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  variant?: "surface" | "subtle" | "highlight";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        variant === "surface" && "card-surface",
        variant === "subtle" && "card-subtle",
        variant === "highlight" && "card-highlight",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Highlight card — green-tinted with caption + content
// ─────────────────────────────────────────────────────────
export function HighlightCard({
  caption,
  dot = "mint",
  children,
  className,
}: {
  caption?: ReactNode;
  dot?: "mint" | "flame" | "ember" | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card variant="highlight" className={cn("p-4", className)}>
      {caption ? (
        <MetaCaption dot={dot} className="mb-2">
          {caption}
        </MetaCaption>
      ) : null}
      {children}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Alert card — colored left stripe (red/amber)
// ─────────────────────────────────────────────────────────
export function AlertCard({
  tone = "ember",
  title,
  meta,
  onClick,
  trailing,
}: {
  tone?: "flame" | "ember";
  title: string;
  meta?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] p-4 text-left transition-colors hover:bg-[rgb(var(--bg-subtle))]"
    >
      <span
        className={cn(
          "h-10 w-1 shrink-0 rounded-full",
          tone === "flame" && "bg-flame-500",
          tone === "ember" && "bg-ember-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[rgb(var(--fg))] truncate">
          {title}
        </p>
        {meta && (
          <p className="mt-0.5 text-[12px] text-chalk-400 truncate">{meta}</p>
        )}
      </div>
      {trailing}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Segmented dashed progress bar
// ─────────────────────────────────────────────────────────
export function SegmentedProgress({
  value,
  segments = 24,
  tone = "mint",
  className,
}: {
  value: number; // 0..100
  segments?: number;
  tone?: "mint" | "flame" | "ember";
  className?: string;
}) {
  const filled = Math.max(
    0,
    Math.min(segments, Math.round((value / 100) * segments)),
  );
  return (
    <div className={cn("flex h-1 w-full gap-[3px]", className)}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-full flex-1 rounded-[1px]",
            i < filled
              ? tone === "mint"
                ? "bg-mint-400"
                : tone === "flame"
                  ? "bg-flame-500"
                  : "bg-ember-400"
              : "bg-white/10",
          )}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Stat tile — caption above value
// ─────────────────────────────────────────────────────────
export function StatTile({
  value,
  label,
  tone = "default",
  className,
}: {
  value: ReactNode;
  label: string;
  tone?: "default" | "mint" | "flame" | "ember";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-white/[0.06] bg-[rgb(var(--bg-elev))] px-4 py-4",
        className,
      )}
    >
      <p
        className={cn(
          "text-[22px] font-bold tracking-tight",
          tone === "mint" && "text-mint",
          tone === "flame" && "text-flame-500",
          tone === "ember" && "text-ember-400",
          tone === "default" && "text-[rgb(var(--fg))]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-cap text-chalk-500">
        {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subject progress row — used in Learn / High-probability lists
// ─────────────────────────────────────────────────────────
export function SubjectProgressRow({
  index,
  meta,
  title,
  footer,
  pct,
  status,
  statusTone = "mint",
  onClick,
}: {
  index?: string;
  meta?: string;
  title: string;
  footer?: string;
  pct: number;
  status?: string;
  statusTone?: "mint" | "ember" | "flame";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left transition-colors hover:bg-white/[0.02] rounded-card px-1 py-3"
    >
      <div className="flex items-baseline gap-3">
        {index && (
          <span className="text-[10px] font-mono text-chalk-500 mt-1">
            {index}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {meta && (
            <MetaCaption className="mb-1.5 truncate">{meta}</MetaCaption>
          )}
          <div className="flex items-end justify-between gap-3">
            <p className="text-[15px] font-semibold text-[rgb(var(--fg))] leading-tight">
              {title}
            </p>
            <div className="text-right">
              <p
                className={cn(
                  "text-[16px] font-bold leading-none",
                  statusTone === "mint" && "text-mint",
                  statusTone === "ember" && "text-ember-400",
                  statusTone === "flame" && "text-flame-500",
                )}
              >
                {pct}%
              </p>
              {status && (
                <p
                  className={cn(
                    "mt-0.5 text-[9px] font-bold uppercase tracking-cap",
                    statusTone === "mint" && "text-mint-400",
                    statusTone === "ember" && "text-ember-400",
                    statusTone === "flame" && "text-flame-500",
                  )}
                >
                  {status}
                </p>
              )}
            </div>
          </div>
          <SegmentedProgress
            value={pct}
            tone={statusTone}
            className="mt-2.5"
          />
          {footer && (
            <p className="mt-2 text-[11px] text-chalk-400">{footer}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Section header — H2 with optional right-side meta
// ─────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  meta,
  className,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-baseline justify-between gap-4", className)}
    >
      <h2 className="h-2 text-[rgb(var(--fg))]">{title}</h2>
      {meta && (
        <span className="text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
          {meta}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sticky CTA bar — anchored at bottom (hides bottom tab bar)
// ─────────────────────────────────────────────────────────
export function StickyCTA({ children }: { children: ReactNode }) {
  return <div className="sticky-cta">{children}</div>;
}

// ─────────────────────────────────────────────────────────
// Mini donut — used for syllabus overall readiness
// ─────────────────────────────────────────────────────────
export function MiniDonut({
  value,
  size = 56,
  stroke = 4,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgb(var(--mint))"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c / 4}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgb(var(--fg))"
        fontSize="14"
        fontWeight="700"
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Primary / outline / ghost button helpers
// ─────────────────────────────────────────────────────────
export function PrimaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={cn("btn-primary", className)} {...rest}>
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={cn("btn-outline", className)} {...rest}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={cn("btn-ghost", className)} {...rest}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Annotation triplet (for predictor papers / long notes)
// ─────────────────────────────────────────────────────────
export function AnnotationBlock({
  label,
  tone = "mint",
  children,
}: {
  label: string;
  tone?: "mint" | "flame" | "ember";
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-[12px] border border-white/[0.06] bg-[rgb(var(--bg-subtle))] p-3.5">
      <span
        className={cn(
          "h-full w-[3px] shrink-0 rounded-full",
          tone === "mint" && "bg-mint-400",
          tone === "flame" && "bg-flame-500",
          tone === "ember" && "bg-ember-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "mb-1 text-[10px] font-semibold uppercase tracking-cap",
            tone === "mint" && "text-mint-400",
            tone === "flame" && "text-flame-500",
            tone === "ember" && "text-ember-400",
          )}
        >
          {label}
        </p>
        <div className="text-[13px] text-[rgb(var(--fg-muted))] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Tab strip (filter pills row)
// ─────────────────────────────────────────────────────────
export function TabStrip<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("tab-strip", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          data-active={t.id === active}
          onClick={() => onChange(t.id)}
          className="tab-pill"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Theme toggle button (sun/moon)
// ─────────────────────────────────────────────────────────
export function ThemeToggle() {
  return null; // imported elsewhere — kept here as placeholder
}
