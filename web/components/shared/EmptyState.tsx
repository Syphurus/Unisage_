"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchX, FileQuestion, BookOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: "search" | "file" | "book";
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = "file",
  action,
  className,
}: EmptyStateProps) {
  const IconComponent = {
    search: SearchX,
    file: FileQuestion,
    book: BookOpen,
  }[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 mb-4">
        <IconComponent className="h-8 w-8 text-brand-500" />
      </div>
      <h3 className="text-lg font-semibold text-[rgb(var(--fg))] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[rgb(var(--muted))] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
