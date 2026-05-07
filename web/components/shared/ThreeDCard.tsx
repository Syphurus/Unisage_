"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThreeDCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function ThreeDCard({
  children,
  className,
  hover = true,
}: ThreeDCardProps) {
  return (
    <motion.div
      initial={false}
      whileHover={
        hover
          ? {
              y: -6,
              scale: 1.015,
              rotateX: -6,
              rotateY: 8,
            }
          : undefined
      }
      whileTap={
        hover
          ? {
              scale: 0.99,
              rotateX: 0,
              rotateY: 0,
            }
          : undefined
      }
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{ perspective: 1400, transformStyle: "preserve-3d" }}
      className={cn("relative will-change-transform", className)}
    >
      <div className="relative z-10 h-full w-full [transform-style:preserve-3d]">
        {children}
      </div>
    </motion.div>
  );
}
