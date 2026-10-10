import { ORDER_STATUS_CODES } from "@/features/vendor/orders/contract";
import type { OrderOrigin, OrderSortKey } from "@/features/vendor/orders/api";

// State of the orders list, carried by the URL query string. Anything not
// recognised is dropped: a hand-edited URL can never send an invalid filter.

export type PeriodKey = "" | "today" | "7d" | "30d" | "month";

export interface ListState {
  status: string;
  search: string;
  origin: OrderOrigin | "";
  period: PeriodKey;
  sort: OrderSortKey;
  direction: "asc" | "desc";
  page: number;
}

export const DEFAULT_LIST_STATE: ListState = {
  status: "",
  search: "",
  origin: "",
  period: "",
  sort: "date",
  direction: "desc",
  page: 1,
};

const PERIODS: PeriodKey[] = ["today", "7d", "30d", "month"];

interface ReadableParams {
  get(name: string): string | null;
}

export function readListState(params: ReadableParams): ListState {
  const status = params.get("status") ?? "";
  const origin = params.get("origin");
  const period = params.get("period") as PeriodKey | null;
  const page = Number(params.get("page"));

  return {
    status: (ORDER_STATUS_CODES as readonly string[]).includes(status) ? status : "",
    search: (params.get("q") ?? "").trim().slice(0, 100),
    origin: origin === "direct" || origin === "marketplace" ? origin : "",
    period: period && PERIODS.includes(period) ? period : "",
    sort: params.get("sort") === "amount" ? "amount" : "date",
    direction: params.get("dir") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Only what differs from the defaults is written: the plain list has a clean URL. */
export function writeListState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.status) params.set("status", state.status);
  if (state.search) params.set("q", state.search);
  if (state.origin) params.set("origin", state.origin);
  if (state.period) params.set("period", state.period);
  if (state.sort !== DEFAULT_LIST_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_LIST_STATE.direction) params.set("dir", state.direction);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Inclusive date bounds of a period, in the seller's local calendar. */
export function periodBounds(period: PeriodKey, now: Date = new Date()): { dateFrom?: string; dateTo?: string } {
  if (!period) return {};
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "7d") from.setDate(from.getDate() - 6);
  if (period === "30d") from.setDate(from.getDate() - 29);
  if (period === "month") from.setDate(1);
  return { dateFrom: isoDay(from), dateTo: isoDay(now) };
}
