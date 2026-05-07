"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { LoadingSpinner } from "./LoadingSpinner";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "No items found",
  emptyDescription,
  page,
  totalPages,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <LoadingSpinner size="lg" label="Loading data..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        variant="search"
      />
    );
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[rgb(var(--surface-subtle))] hover:bg-[rgb(var(--surface-subtle))]">
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow
              key={idx}
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(item, idx)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {page !== undefined && totalPages !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]/60 px-4 py-3">
          <p className="text-sm text-[rgb(var(--muted))]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
