"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { Unit } from "@/lib/types";
import type { ContentByType } from "@/lib/hooks/useSubjectContent";

interface UnitsRailProps {
  units: (Unit & { content: ContentByType })[];
  activeUnitId: string | "all";
  onSelect: (id: string | "all") => void;
}

export function UnitsRail({
  units,
  activeUnitId,
  onSelect,
}: UnitsRailProps) {
  return (
    <nav className="space-y-1">
      <SidebarHeading>Units</SidebarHeading>
      <UnitButton
        active={activeUnitId === "all"}
        onClick={() => onSelect("all")}
        title="All units"
        meta={`${units.reduce((sum, u) => sum + Object.values(u.content).flat().length, 0)} resources`}
      />
      {units.map((u, i) => {
        const total = Object.values(u.content).flat().length;
        return (
          <UnitButton
            key={u.id}
            active={activeUnitId === u.id}
            onClick={() => onSelect(u.id)}
            title={u.title}
            index={String((u as any).unitNumber || i + 1).padStart(2, "0")}
            meta={`${total} item${total === 1 ? "" : "s"}`}
          />
        );
      })}
    </nav>
  );
}

function SidebarHeading({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-cap text-chalk-500">
      {children}
    </p>
  );
}

function UnitButton({
  active,
  onClick,
  title,
  index,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  index?: string;
  meta?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full text-left rounded-[10px] px-3 py-2.5 transition-colors group",
        active
          ? "bg-mint-500/10 text-mint-400"
          : "text-chalk-300 hover:bg-white/[0.04] hover:text-[rgb(var(--fg))]",
      )}
    >
      <div className="flex items-baseline gap-2.5">
        {index && (
          <span
            className={cn(
              "text-[10px] font-mono tabular-nums shrink-0",
              active ? "text-mint-400" : "text-chalk-500",
            )}
          >
            {index}
          </span>
        )}
        <span className="text-[13px] font-medium leading-snug truncate flex-1">
          {title}
        </span>
        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
      </div>
      {meta && (
        <p className="mt-0.5 ml-[26px] text-[10.5px] text-chalk-500">{meta}</p>
      )}
    </button>
  );
}
