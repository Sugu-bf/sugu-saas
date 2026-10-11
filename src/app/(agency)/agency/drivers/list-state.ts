import type { CourierListFilters, CourierSortKey } from "@/features/agency/couriers/api";
import { COURIER_ACTIVITIES, type CourierActivity } from "@/features/agency/couriers/contract";

// State of the couriers list, carried by the URL query string. Anything not
// recognised is dropped: a hand-edited URL can never send an invalid filter.

export interface ListState {
  activity: CourierActivity | "";
  quartier: string;
  search: string;
  sort: CourierSortKey;
  direction: "asc" | "desc";
  page: number;
}

export const DEFAULT_LIST_STATE: ListState = { activity: "", quartier: "", search: "", sort: "name", direction: "asc", page: 1 };

const SORTS: CourierSortKey[] = ["name", "created_at", "total_deliveries", "rating_avg", "last_delivery_at"];

interface ReadableParams {
  get(name: string): string | null;
}

export function readListState(params: ReadableParams): ListState {
  const activity = params.get("activity");
  const sort = params.get("sort") as CourierSortKey | null;
  const page = Number(params.get("page"));
  return {
    activity: activity !== null && (COURIER_ACTIVITIES as readonly string[]).includes(activity) ? (activity as CourierActivity) : "",
    quartier: (params.get("quartier") ?? "").trim().slice(0, 100),
    search: (params.get("q") ?? "").trim().slice(0, 100),
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_LIST_STATE.sort,
    direction: params.get("dir") === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Only what differs from the defaults is written: the plain list has a clean URL. */
export function writeListState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.activity) params.set("activity", state.activity);
  if (state.quartier) params.set("quartier", state.quartier);
  if (state.search) params.set("q", state.search);
  if (state.sort !== DEFAULT_LIST_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_LIST_STATE.direction) params.set("dir", state.direction);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function filtersOf(state: ListState): CourierListFilters {
  return {
    activity: state.activity || undefined,
    quartier: state.quartier || undefined,
    search: state.search || undefined,
    sort: state.sort,
    direction: state.direction,
  };
}

export const isNarrowed = (state: ListState): boolean => Boolean(state.activity || state.quartier || state.search);

export const CLEARED_FILTERS = { activity: "", quartier: "", search: "" } as const satisfies Partial<ListState>;
