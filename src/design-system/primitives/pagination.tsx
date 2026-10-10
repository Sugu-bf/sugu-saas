"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../cn";
import { IconButton } from "./button";

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageSize: number;
  /** Total number of items across all pages, as reported by the server. */
  total: number;
  onPageChange: (page: number) => void;
  /** Disable navigation while a page is being fetched. */
  disabled?: boolean;
  /** Plural noun for the range text, e.g. "commandes". */
  itemLabel?: string;
  className?: string;
}

const NUMBER = new Intl.NumberFormat("fr-FR");

export function pageCountOf(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Server pagination: reports the range shown and moves one page at a time. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  itemLabel,
  className,
}: PaginationProps) {
  const pageCount = pageCountOf(total, pageSize);
  const current = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)}
    >
      <p className="text-meta text-foreground-muted tabular-nums" aria-live="polite">
        {total === 0
          ? `0 ${itemLabel ?? "résultat"}`
          : `${NUMBER.format(from)}–${NUMBER.format(to)} sur ${NUMBER.format(total)}${itemLabel ? ` ${itemLabel}` : ""}`}
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          label="Page précédente"
          variant="secondary"
          size="compact"
          tooltip={false}
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(current - 1)}
        />
        <span className="min-w-24 px-1 text-center text-meta text-foreground-muted tabular-nums">
          Page {NUMBER.format(current)} sur {NUMBER.format(pageCount)}
        </span>
        <IconButton
          icon={ChevronRight}
          label="Page suivante"
          variant="secondary"
          size="compact"
          tooltip={false}
          disabled={disabled || current >= pageCount}
          onClick={() => onPageChange(current + 1)}
        />
      </div>
    </nav>
  );
}
