import type { InventorySortKey } from "@/features/vendor/catalog/api";
import { STOCK_LEVELS, type StockLevel } from "@/features/vendor/catalog/contract";

// State of the inventory list, carried by the URL query string. Anything
// not recognised is dropped.

export interface ListState {
  level: StockLevel | "";
  search: string;
  sort: InventorySortKey;
  direction: "asc" | "desc";
  page: number;
}

export const DEFAULT_LIST_STATE: ListState = { level: "", search: "", sort: "updated", direction: "desc", page: 1 };

const SORTS: InventorySortKey[] = ["updated", "name", "stock"];

interface ReadableParams {
  get(name: string): string | null;
}

export function readListState(params: ReadableParams): ListState {
  const level = params.get("level") as StockLevel | null;
  const sort = params.get("sort") as InventorySortKey | null;
  const page = Number(params.get("page"));

  return {
    level: level && STOCK_LEVELS.includes(level) ? level : "",
    search: (params.get("q") ?? "").trim().slice(0, 100),
    sort: sort && SORTS.includes(sort) ? sort : "updated",
    direction: params.get("dir") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function writeListState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.level) params.set("level", state.level);
  if (state.search) params.set("q", state.search);
  if (state.sort !== DEFAULT_LIST_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_LIST_STATE.direction) params.set("dir", state.direction);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}
