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
   * `ToolbarFilter`s (status, period, sort…). Inline when there is room; else
   * they move into a "Filtres" bottom sheet, opened by a button that sits
   * on the same row as the search. On a phone that button is an icon when
   * the row also holds a view switch.
   */
  filters?: ReactNode;
  /**
   * When the filters leave the row for the sheet. `phone` (default): under
   * 768px. `narrow`: whenever the toolbar itself is under 912px wide, for a
   * list with three filters or more, which do not fit a tablet either.
   */
  collapseFilters?: "phone" | "narrow";
  /** Number of active filters, shown on the phone "Filtres" button. */
  activeFilterCount?: number;
  /** Called by "Réinitialiser" in the phone sheet. Omit to hide that button. */
  onResetFilters?: () => void;
  /** A `ToolbarCount`. */
  count?: ReactNode;
  /**
   * Sits next to the count: the way back to the whole list while a tab, a
   * search or a filter narrows it (a quiet, compact "Tout afficher").
   */
  countAction?: ReactNode;
  /**
   * A view switch (grid, list…), at the end of the first row at every width:
   * search, filters and view read as one line, on a phone too.
   */
  view?: ReactNode;
  /** Buttons on the right (export…). */
  actions?: ReactNode;
  className?: string;
}

// Where the filters sit inline, and where the search stops growing to leave them the row.
const COLLAPSE = {
  phone: { inline: "hidden md:flex", sheet: "md:hidden", search: "md:max-w-xs md:basis-56" },
  narrow: { inline: "hidden @[57rem]:flex", sheet: "@[57rem]:hidden", search: "@[57rem]:max-w-xs @[57rem]:basis-56" },
} as const;

/** Control bar above a list. Every control is controlled by the page. */
export function Toolbar({
  search,
  filters,
  collapseFilters = "phone",
  activeFilterCount = 0,
  onResetFilters,
  count,
  countAction,
  view,
  actions,
  className,
}: ToolbarProps) {
  const collapse = COLLAPSE[collapseFilters];
  return (
    <div className={cn("@container flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search && <div className={cn("min-w-0 flex-1 basis-40", collapse.search)}>{search}</div>}
        {filters && (
          <>
            {/* `data-inline` tells a `ToolbarFilter` it sits on the row, not in the sheet. */}
            <div data-inline="" className={cn("group/filters flex-wrap items-center gap-2", collapse.inline)}>
              {filters}
            </div>
            <div className={cn("shrink-0", collapse.sheet)}>
              <Sheet>
                <SheetTrigger asChild>
                  {/* Next to a view switch, a phone has no room for the word: the icon keeps the name. */}
                  <Button icon={SlidersHorizontal} className={cn(view && "max-md:relative max-md:w-control max-md:px-0 touch:max-md:w-touch touch:max-md:px-0")}>
                    <span className={cn(view && "max-md:sr-only")}>Filtres</span>
                    {activeFilterCount > 0 && (
                      <span
                        className={cn(
                          "rounded-pill bg-brand-subtle px-1.5 text-meta text-foreground tabular-nums",
                          view && "max-md:absolute max-md:-top-1 max-md:-right-1 max-md:bg-primary max-md:text-primary-foreground",
                        )}
                      >
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
        {(actions || view) && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
            {view}
          </div>
        )}
      </div>
      {countAction ? (
        <div className="flex min-h-control-sm items-center gap-x-2">
          {count}
          {countAction}
        </div>
      ) : (
        count
      )}
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
          "h-control w-full min-w-0 rounded-control border border-border-control bg-surface pl-9 text-body text-ellipsis text-foreground",
          value === "" ? "pr-3" : "pr-9",
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
  /**
   * Leaves the label out of the row, where room is short, when every option
   * already says what the filter is about ("Toutes les catégories"). It stays
   * the name of the control, and shows above it in the "Filtres" sheet.
   */
  hideLabelInline?: boolean;
  className?: string;
}

/**
 * Labelled compact select. Covers status filters, period pickers and server
 * sort. On the row of a `Toolbar` the label sits beside the select, which is
 * as wide as its options; in the "Filtres" sheet it sits above a full-width one.
 */
export function ToolbarFilter({ label, value, onValueChange, options, hideLabelInline = false, className }: ToolbarFilterProps) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        "group-data-[inline]/filters:flex-row group-data-[inline]/filters:items-center group-data-[inline]/filters:gap-2",
        className,
      )}
    >
      <label
        htmlFor={id}
        className={cn("text-label whitespace-nowrap text-foreground-muted", hideLabelInline && "group-data-[inline]/filters:sr-only")}
      >
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        options={options}
        className="text-label group-data-[inline]/filters:w-auto group-data-[inline]/filters:max-w-52 group-data-[inline]/filters:min-w-32"
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
