import type { ProductSortKey } from "@/features/vendor/catalog/api";
import { PRODUCT_STATUS_CODES, STOCK_LEVELS, type StockLevel } from "@/features/vendor/catalog/contract";

// State of the product list, carried by the URL query string. Anything not
// recognised is dropped: a hand-edited URL can never send an invalid filter.

export interface ListState {
  status: string;
  /** Id of a category, as the server names it. */
  category: string;
  stock: StockLevel | "";
  search: string;
  sort: ProductSortKey;
  direction: "asc" | "desc";
  page: number;
}

export const DEFAULT_LIST_STATE: ListState = {
  status: "",
  category: "",
  stock: "",
  search: "",
  sort: "created",
  direction: "desc",
  page: 1,
};

const SORTS: ProductSortKey[] = ["created", "name", "price", "stock"];

/** The shape of an id (ULID, UUID or number): the list of categories is the server's, not known here. */
const ID = /^[0-9A-Za-z_-]{1,64}$/;

interface ReadableParams {
  get(name: string): string | null;
}

export function readListState(params: ReadableParams): ListState {
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const stock = params.get("stock") as StockLevel | null;
  const sort = params.get("sort") as ProductSortKey | null;
  const page = Number(params.get("page"));

  return {
    status: (PRODUCT_STATUS_CODES as readonly string[]).includes(status) ? status : "",
    category: ID.test(category) ? category : "",
    stock: stock && STOCK_LEVELS.includes(stock) ? stock : "",
    search: (params.get("q") ?? "").trim().slice(0, 100),
    sort: sort && SORTS.includes(sort) ? sort : "created",
    direction: params.get("dir") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Only what differs from the defaults is written: the plain list has a clean URL. */
export function writeListState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.status) params.set("status", state.status);
  if (state.category) params.set("category", state.category);
  if (state.stock) params.set("stock", state.stock);
  if (state.search) params.set("q", state.search);
  if (state.sort !== DEFAULT_LIST_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_LIST_STATE.direction) params.set("dir", state.direction);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}
