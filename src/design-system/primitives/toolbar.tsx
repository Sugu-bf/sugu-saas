"use client";

import { useId, type FormEvent, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "../cn";
import { Select, type SelectOption } from "../forms/input";
import { Button } from "./button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./sheet";

export interface ToolbarProps {
  /** A `ToolbarSearch`. */
  search?: ReactNode;
  /**
   * `ToolbarFilter`s (status, period, sort…). Inline from 768px; on phones
   * they move into a "Filtres" bottom sheet so nothing gets squeezed.
   */
  filters?: ReactNode;
  /** Number of active filters, shown on the phone "Filtres" button. */
  activeFilterCount?: number;
  /** Called by "Réinitialiser" in the phone sheet. Omit to hide that button. */
  onResetFilters?: () => void;
  /** A `ToolbarCount`. */
  count?: ReactNode;
  /** Buttons on the right (export, view switch…). */
  actions?: ReactNode;
  className?: string;
}

/** Control bar above a list. Every control is controlled by the page. */
export function Toolbar({
  search,
  filters,
  activeFilterCount = 0,
  onResetFilters,
  count,
  actions,
  className,
}: ToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search && <div className="min-w-0 flex-1 basis-full md:max-w-xs md:basis-56">{search}</div>}
        {filters && (
          <>
            <div className="hidden flex-wrap items-center gap-2 md:flex">{filters}</div>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button icon={SlidersHorizontal}>
                    Filtres
                    {activeFilterCount > 0 && (
                      <span className="rounded-pill bg-brand-subtle px-1.5 text-meta text-foreground tabular-nums">
                        {activeFilterCount}
                        <span className="sr-only"> actifs</span>
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  title="Filtres"
                  footer={
                    <>
                      {onResetFilters && (
                        <Button variant="quiet" icon={X} onClick={onResetFilters}>
                          Réinitialiser
                        </Button>
                      )}
                      <SheetClose asChild>
                        <Button variant="primary">Voir les résultats</Button>
                      </SheetClose>
                    </>
                  }
                >
                  <div className="flex flex-col gap-4 [&>*]:w-full">{filters}</div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {count}
    </div>
  );
}

export interface ToolbarSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Called on Enter or on the search key of a phone keyboard. The page sends
   * the query to the server: searching one loaded page would mislead.
   */
  onSubmit?: (value: string) => void;
  /** Accessible name and placeholder, e.g. "Rechercher une commande". */
  label: string;
  className?: string;
}

export function ToolbarSearch({ value, onValueChange, onSubmit, label, className }: ToolbarSearchProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.(value);
  }
  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle"
        aria-hidden="true"
      />
      <input
        type="search"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label={label}
        placeholder={label}
        className={cn(
          "h-control w-full min-w-0 rounded-control border border-border-control bg-surface pr-9 pl-9 text-body text-foreground",
          "placeholder:text-foreground-subtle hover:border-foreground-muted touch:h-touch touch:text-base",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value !== "" && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => {
            onValueChange("");
            onSubmit?.("");
          }}
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-button text-foreground-muted hover:bg-surface-hover hover:text-foreground touch:size-9"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

export interface ToolbarFilterProps {
  /** What the filter is about: "Statut", "Période", "Trier par". */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

/** Labelled compact select. Covers status filters, period pickers and server sort. */
export function ToolbarFilter({ label, value, onValueChange, options, className }: ToolbarFilterProps) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2", className)}>
      <label htmlFor={id} className="text-label whitespace-nowrap text-foreground-muted">
        {label}
      </label>
      <Select
        id={id}
        compact
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        options={options}
        className="md:w-auto md:min-w-32"
      />
    </div>
  );
}

export interface ToolbarCountProps {
  /** Total reported by the server, not the length of the loaded page. */
  total: number | undefined;
  /** Noun forms, e.g. `{ one: "commande", other: "commandes" }`. */
  noun: { one: string; other: string };
  /** Number of selected rows, when a selection is active. */
  selected?: number;
}

const NUMBER = new Intl.NumberFormat("fr-FR");

export function ToolbarCount({ total, noun, selected = 0 }: ToolbarCountProps) {
  return (
    <p className="text-meta text-foreground-muted tabular-nums" aria-live="polite">
      {total === undefined ? " " : `${NUMBER.format(total)} ${total > 1 ? noun.other : noun.one}`}
      {selected > 0 && ` · ${NUMBER.format(selected)} sélectionné${selected > 1 ? "s" : ""}`}
    </p>
  );
}
