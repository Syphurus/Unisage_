"use client";

import { cn } from "@/lib/utils";
import { FileText, Inbox, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "content";
  className?: string;
}

const variantIcons = {
  default: <Inbox className="h-12 w-12 text-brand-400" />,
  search: <Search className="h-12 w-12 text-brand-400" />,
  content: <FileText className="h-12 w-12 text-brand-400" />,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]/70 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4">{icon || variantIcons[variant]}</div>
      <h3 className="text-lg font-semibold text-[rgb(var(--fg))]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[rgb(var(--muted))]">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
