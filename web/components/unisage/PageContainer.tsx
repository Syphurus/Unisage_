"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard horizontal padding for app pages.
 * Mobile keeps a comfortable 20px gutter; desktop expands to 40-56px.
 * No max-width — pages are full-width by design.
 */
export function PageContainer({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  // "default" — full app width
  // "narrow" — capped reading width (notes / forms)
  // "wide"   — slightly more breathing room
  width?: "default" | "narrow" | "wide";
}) {
  return (
    <div
      className={cn(
        "px-5 md:px-8 lg:px-10 xl:px-14",
        width === "narrow" && "max-w-[820px] mx-auto",
        width === "wide" && "max-w-[1480px] mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Vertical section spacer with consistent rhythm.
 */
export function Section({
  children,
  className,
  density = "default",
}: {
  children: ReactNode;
  className?: string;
  density?: "compact" | "default" | "spacious";
}) {
  return (
    <section
      className={cn(
        density === "compact" && "py-6 md:py-8",
        density === "default" && "py-8 md:py-10 lg:py-12",
        density === "spacious" && "py-10 md:py-14 lg:py-16",
        className,
      )}
    >
      {children}
    </section>
  );
}
