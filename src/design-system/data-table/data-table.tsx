"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, X, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Checkbox } from "../forms/choice";
import { Button } from "../primitives/button";
import { Pagination, type PaginationProps } from "../primitives/pagination";
import { Skeleton } from "../primitives/skeleton";
import { EmptyState, ErrorState } from "../primitives/states";

export type SortDirection = "asc" | "desc";

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

/**
 * Role of a column in the phone card:
 * - `title`    main line (one column)
 * - `subtitle` second line, muted
 * - `badge`    top-right corner (status)
 * - `field`    "label: value" line — the default, nothing is dropped silently
 * - `detail`   a "label: value" line shown once the card is opened with
 *              "Voir plus": secondary data, one tap away instead of dropped
 * - `hidden`   left out on phones; an explicit choice, for redundant data only
 */
export type MobileRole = "title" | "subtitle" | "badge" | "field" | "detail" | "hidden";

export interface DataTableColumn<Row> {
  id: string;
  /** Column heading; also the field label in the phone card. */
  header: string;
  cell: (row: Row) => ReactNode;
  /**
   * Content of the phone card when it differs from the table cell. A `field`
   * or `detail` that returns `null` gets no line in the card: a label with
   * nothing next to it is noise.
   */
  mobileCell?: (row: Row) => ReactNode;
  /** Right-aligned with tabular figures: amounts, counts, quantities. */
  numeric?: boolean;
  /**
   * Marks the column as sortable. The header only becomes interactive when
   * the table also receives `onSortChange`: no handler, no sort control.
   */
  sortable?: boolean;
  mobile?: MobileRole;
  /** Extra classes on the header and body cells (widths, wrapping). */
  className?: string;
}

export interface DataTableSelection<Row> {
  selectedIds: readonly string[];
  onChange: (selectedIds: string[]) => void;
  /** Accessible name of a row's checkbox, e.g. the order reference. */
  getRowLabel: (row: Row) => string;
  isRowSelectable?: (row: Row) => boolean;
}

export interface DataTableProps<Row> {
  /** Accessible name of the table, e.g. "Commandes". */
  caption: string;
  columns: DataTableColumn<Row>[];
  /** The rows of the current page, in the order the server returned them. */
  rows: Row[];
  getRowId: (row: Row) => string;
  /** `loading`: first load. `error`: the load failed. Defaults to `ready`. */
  state?: "ready" | "loading" | "error";
  /** A new page or sort is being fetched while the current rows stay visible. */
  refreshing?: boolean;
  error?: { title?: string; description?: ReactNode; onRetry?: () => void; retrying?: boolean };
  empty: { title: string; description?: ReactNode; action?: ReactNode; icon?: LucideIcon };
  /**
   * Controlled sort. The table never reorders `rows` itself: with server
   * pagination, sorting the loaded page would pass for a full sort.
   * The page turns `onSortChange` into a query parameter.
   */
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  /** Controlled selection. Omit it and no checkbox is rendered. */
  selection?: DataTableSelection<Row>;
  /** Buttons for the selected rows. Rendered only while a selection exists. */
  bulkActions?: (selectedIds: string[]) => ReactNode;
  /** Per-row actions: an `IconButton`, or a `DropdownMenu` when there are several. */
  rowActions?: (row: Row) => ReactNode;
  /** Server pagination. Omit for short, complete lists. */
  pagination?: Omit<PaginationProps, "className">;
  /** Narrow containers (under 672px): declarative cards (default) or the table itself, scrolling sideways. */
  mobileLayout?: "cards" | "scroll";
  /**
   * Where `rowActions` go in a phone card. `header` (default): next to the
   * status, for a menu or an icon button. `footer`: a row of its own, each
   * action as wide as the card allows, for a labelled button.
   */
  mobileRowActions?: "header" | "footer";
  /** Skeleton rows shown during the first load. */
  loadingRowCount?: number;
  className?: string;
}

function nextSort(current: SortState | null | undefined, columnId: string): SortState {
  if (current?.columnId === columnId && current.direction === "asc") return { columnId, direction: "desc" };
  return { columnId, direction: "asc" };
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowId,
  state = "ready",
  refreshing = false,
  error,
  empty,
  sort,
  onSortChange,
  selection,
  bulkActions,
  rowActions,
  pagination,
  mobileLayout = "cards",
  mobileRowActions = "header",
  loadingRowCount = 8,
  className,
}: DataTableProps<Row>) {
  // Phone cards opened with "Voir plus".
  const [openCards, setOpenCards] = useState<ReadonlySet<string>>(new Set());
  const toggleCard = (id: string) =>
    setOpenCards((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shell = cn("@container overflow-hidden rounded-panel border border-border bg-surface", className);

  if (state === "error") {
    return (
      <div className={shell}>
        <ErrorState {...error} />
      </div>
    );
  }

  if (state === "ready" && rows.length === 0) {
    return (
      <div className={shell}>
        <EmptyState {...empty} />
      </div>
    );
  }

  const loading = state === "loading";
  const selectedSet = new Set(selection?.selectedIds ?? []);
  const selectableIds = selection
    ? rows.filter((row) => selection.isRowSelectable?.(row) ?? true).map(getRowId)
    : [];
  const selectedOnPage = selectableIds.filter((id) => selectedSet.has(id));
  const allOnPageSelected = selectableIds.length > 0 && selectedOnPage.length === selectableIds.length;
  const selectedCount = selectedSet.size;

  function toggleRow(id: string, checked: boolean) {
    if (!selection) return;
    const next = new Set(selectedSet);
    if (checked) next.add(id);
    else next.delete(id);
    selection.onChange([...next]);
  }

  function togglePage(checked: boolean) {
    if (!selection) return;
    // Ids selected on other pages are kept as they are.
    const next = new Set(selectedSet);
    for (const id of selectableIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    selection.onChange([...next]);
  }

  // Container query, not viewport: the table adapts to the room it really has
  // (a 768px tablet without sidebar gets the table; a narrow panel gets cards).
  const tableVisibility = mobileLayout === "cards" ? "hidden @2xl:block" : "block";
  const titleColumn = columns.find((column) => column.mobile === "title") ?? columns[0];
  const subtitleColumns = columns.filter((column) => column.mobile === "subtitle");
  const badgeColumns = columns.filter((column) => column.mobile === "badge");
  const fieldColumns = columns.filter(
    (column) => column !== titleColumn && (column.mobile ?? "field") === "field",
  );
  const detailColumns = columns.filter((column) => column !== titleColumn && column.mobile === "detail");

  return (
    <div className={shell} aria-busy={loading || refreshing || undefined}>
      {loading && (
        <p role="status" className="sr-only">
          Chargement…
        </p>
      )}

      {selection && selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-brand-subtle px-3 py-2">
          <p className="text-label text-foreground tabular-nums" role="status">
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </p>
          <Button variant="quiet" size="compact" icon={X} onClick={() => selection.onChange([])}>
            Tout désélectionner
          </Button>
          {bulkActions && (
            <div className="ml-auto flex flex-wrap items-center gap-2">{bulkActions([...selectedSet])}</div>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        // `relative`: visually hidden (absolutely positioned) labels inside the table
        // must be clipped by this scroller, or they widen the whole page.
        className={cn(tableVisibility, "relative overflow-x-auto focus-visible:-outline-offset-2")}
      >
        <table className={cn("w-full border-collapse text-left", refreshing && "opacity-60")}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              {selection && (
                <th scope="col" className="w-10 px-3">
                  <Checkbox
                    aria-label="Sélectionner toutes les lignes de cette page"
                    checked={allOnPageSelected}
                    indeterminate={selectedOnPage.length > 0 && !allOnPageSelected}
                    disabled={loading || selectableIds.length === 0}
                    onChange={(event) => togglePage(event.target.checked)}
                  />
                </th>
              )}
              {columns.map((column) => {
                const interactive = Boolean(column.sortable && onSortChange);
                const active = interactive && sort?.columnId === column.id;
                const SortIcon = !active ? ChevronsUpDown : sort?.direction === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      interactive
                        ? active
                          ? sort?.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      "h-9 px-3 text-meta font-medium whitespace-nowrap text-foreground-muted",
                      column.numeric && "text-right",
                      column.className,
                    )}
                  >
                    {interactive ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(nextSort(sort, column.id))}
                        className={cn(
                          "-mx-2 inline-flex h-7 items-center gap-1 rounded-button px-2 hover:text-foreground",
                          active && "text-foreground",
                        )}
                      >
                        {column.header}
                        <SortIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th scope="col" className="w-12 px-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: loadingRowCount }, (_, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    {selection && <td className="px-3" />}
                    {columns.map((column) => (
                      <td key={column.id} className="h-11 px-3">
                        <Skeleton className={cn("h-4", column.numeric ? "ml-auto w-16" : "w-24")} />
                      </td>
                    ))}
                    {rowActions && <td className="px-3" />}
                  </tr>
                ))
              : rows.map((row) => {
                  const id = getRowId(row);
                  const selected = selectedSet.has(id);
                  return (
                    <tr
                      key={id}
                      data-selected={selected || undefined}
                      className="border-b border-border last:border-b-0 hover:bg-surface-subtle data-[selected]:bg-brand-subtle"
                    >
                      {selection && (
                        <td className="px-3">
                          <Checkbox
                            aria-label={`Sélectionner ${selection.getRowLabel(row)}`}
                            checked={selected}
                            disabled={!(selection.isRowSelectable?.(row) ?? true)}
                            onChange={(event) => toggleRow(id, event.target.checked)}
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "h-11 px-3 py-1.5 text-body text-foreground",
                            column.numeric && "text-right whitespace-nowrap tabular-nums",
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="px-2 text-right">
                          <div className="flex justify-end gap-1">{rowActions(row)}</div>
                        </td>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* ── Phone cards ───────────────────────────────────── */}
      {mobileLayout === "cards" && (
        <ul className={cn("divide-y divide-border @2xl:hidden", refreshing && "opacity-60")} aria-label={caption}>
          {loading
            ? Array.from({ length: Math.min(loadingRowCount, 4) }, (_, index) => (
                <li key={index} className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </li>
              ))
            : rows.map((row) => {
                const id = getRowId(row);
                const selected = selectedSet.has(id);
                const open = openCards.has(id);
                const inCard = (column: DataTableColumn<Row>) => (column.mobileCell ?? column.cell)(row);
                const shownFields = (open ? [...fieldColumns, ...detailColumns] : fieldColumns)
                  .map((column) => ({ column, content: inCard(column) }))
                  .filter((field) => field.content !== null && field.content !== undefined && field.content !== false);
                return (
                  <li
                    key={id}
                    data-selected={selected || undefined}
                    className="flex gap-3 p-3 data-[selected]:bg-brand-subtle"
                  >
                    {selection && (
                      <Checkbox
                        className="mt-0.5"
                        aria-label={`Sélectionner ${selection.getRowLabel(row)}`}
                        checked={selected}
                        disabled={!(selection.isRowSelectable?.(row) ?? true)}
                        onChange={(event) => toggleRow(id, event.target.checked)}
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {/* Header: what the row is, its status, its actions. */}
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-body font-medium text-foreground">{titleColumn && inCard(titleColumn)}</div>
                          {subtitleColumns.map((column) => (
                            <div key={column.id} className="mt-0.5 text-body text-foreground-muted">
                              {inCard(column)}
                            </div>
                          ))}
                        </div>
                        {badgeColumns.length > 0 && (
                          <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                            {badgeColumns.map((column) => (
                              <div key={column.id}>{inCard(column)}</div>
                            ))}
                          </div>
                        )}
                        {rowActions && mobileRowActions === "header" && (
                          <div className="-my-1.5 -mr-1.5 flex shrink-0 gap-1">{rowActions(row)}</div>
                        )}
                      </div>

                      {(shownFields.length > 0 || detailColumns.length > 0) && (
                        <div className="overflow-hidden rounded-control border border-border">
                          <dl className="divide-y divide-border">
                            {shownFields.map(({ column, content }) => (
                              <div
                                key={column.id}
                                className="grid grid-cols-[minmax(5.5rem,36%)_minmax(0,1fr)] items-center gap-x-3 px-2.5 py-1.5"
                              >
                                <dt className="text-meta text-foreground-muted">{column.header}</dt>
                                <dd className={cn("min-w-0 text-body text-foreground", column.numeric && "tabular-nums")}>
                                  {content}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          {detailColumns.length > 0 && (
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => toggleCard(id)}
                              className={cn(
                                "flex h-9 w-full items-center justify-center gap-1 text-meta font-medium text-foreground-muted",
                                "hover:bg-surface-subtle hover:text-foreground focus-visible:-outline-offset-2 touch:h-11",
                                shownFields.length > 0 && "border-t border-border",
                              )}
                            >
                              {open ? "Voir moins" : "Voir plus"}
                              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )}

                      {rowActions && mobileRowActions === "footer" && (
                        <div className="flex gap-2 [&>*]:flex-1">{rowActions(row)}</div>
                      )}
                    </div>
                  </li>
                );
              })}
        </ul>
      )}

      {pagination && (
        <div className="border-t border-border px-3 py-2">
          <Pagination {...pagination} disabled={pagination.disabled || loading || refreshing} />
        </div>
      )}
    </div>
  );
}
