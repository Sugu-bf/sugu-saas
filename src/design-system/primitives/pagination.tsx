"use client";

import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../cn";
import { Select } from "../forms/input";
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
  /**
   * `compact` (default): previous, "Page 2 sur 9", next.
   * `numbered`: every page a tap away (1 2 3 … 25), for a list people page
   * through; it falls back to the compact form on a phone.
   */
  variant?: "compact" | "numbered";
  /** Sizes offered in a "10 par page" select. Needs `onPageSizeChange`. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

const NUMBER = new Intl.NumberFormat("fr-FR");

export function pageCountOf(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The pages to offer around the current one: first, last, the current page
 * and its neighbours, with `null` where pages are skipped.
 */
export function pageWindow(current: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  // Near an end, five pages in a row; in the middle, the current one and its two neighbours.
  const around = current <= 4 ? [1, 2, 3, 4, 5] : current >= pageCount - 3 ? [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount] : [current - 1, current, current + 1];
  const pages = [...new Set([1, ...around, pageCount])].sort((a, b) => a - b);
  return pages.flatMap((page, index) => (index > 0 && page - pages[index - 1] > 1 ? [null, page] : [page]));
}

/** Server pagination: reports the range shown and moves from page to page. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
  itemLabel,
  variant = "compact",
  pageSizeOptions,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const sizeId = useId();
  const pageCount = pageCountOf(total, pageSize);
  const current = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const numbered = variant === "numbered";
  const noun = itemLabel ? ` ${itemLabel}` : "";

  const range =
    total === 0
      ? `0 ${itemLabel ?? "résultat"}`
      : numbered
        ? `Affichage de ${NUMBER.format(from)} à ${NUMBER.format(to)} sur ${NUMBER.format(total)}${noun}`
        : `${NUMBER.format(from)}–${NUMBER.format(to)} sur ${NUMBER.format(total)}${noun}`;

  const previous = (
    <IconButton
      icon={ChevronLeft}
      label="Page précédente"
      variant="secondary"
      size="compact"
      tooltip={false}
      disabled={disabled || current <= 1}
      onClick={() => onPageChange(current - 1)}
    />
  );
  const next = (
    <IconButton
      icon={ChevronRight}
      label="Page suivante"
      variant="secondary"
      size="compact"
      tooltip={false}
      disabled={disabled || current >= pageCount}
      onClick={() => onPageChange(current + 1)}
    />
  );
  const position = (
    <span className={cn("min-w-24 px-1 text-center text-meta text-foreground-muted tabular-nums", numbered && "md:hidden")}>
      Page {NUMBER.format(current)} sur {NUMBER.format(pageCount)}
    </span>
  );

  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)}>
      <p className={cn("text-foreground-muted tabular-nums", numbered ? "text-label font-normal" : "text-meta")} aria-live="polite">
        {range}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {pageSizeOptions && onPageSizeChange && (
          <>
            <label htmlFor={sizeId} className="sr-only">
              Nombre de lignes par page
            </label>
            <Select
              id={sizeId}
              compact
              value={String(pageSize)}
              disabled={disabled}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              options={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} par page` }))}
              className="w-auto min-w-32"
            />
          </>
        )}
        <div className="flex items-center gap-1">
          {previous}
          {position}
          {numbered && (
            <ol className="hidden items-center gap-1 md:flex">
              {pageWindow(current, pageCount).map((entry, index) =>
                entry === null ? (
                  <li key={`gap-${index}`} aria-hidden="true" className="w-control-sm text-center text-meta text-foreground-subtle">
                    …
                  </li>
                ) : (
                  <li key={entry}>
                    <button
                      type="button"
                      aria-label={`Page ${NUMBER.format(entry)}`}
                      aria-current={entry === current ? "page" : undefined}
                      disabled={disabled}
                      onClick={() => entry !== current && onPageChange(entry)}
                      className={cn(
                        "flex h-control-sm min-w-control-sm items-center justify-center rounded-button border px-2 text-label tabular-nums transition-colors duration-100",
                        entry === current
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-border bg-surface text-foreground hover:bg-surface-subtle disabled:cursor-not-allowed disabled:text-disabled-foreground",
                      )}
                    >
                      {NUMBER.format(entry)}
                    </button>
                  </li>
                ),
              )}
            </ol>
          )}
          {next}
        </div>
      </div>
    </nav>
  );
}
