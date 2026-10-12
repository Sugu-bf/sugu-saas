import {
  DEFAULT_DELIVERY_PAGE_SIZE,
  DELIVERY_PAGE_SIZES,
  type DeliveryDateFilter,
  type DeliveryListFilters,
  type DeliveryPriorityFilter,
  type DeliverySortKey,
} from "@/features/agency/deliveries/api";
import { DELIVERY_SCOPES, DELIVERY_STATUS_CODES, type DeliveryScope } from "@/features/agency/deliveries/contract";

// State of the deliveries list, carried by the URL query string. Anything not
// recognised is dropped: a hand-edited URL can never send an invalid filter.

export interface ListState {
  /** A status of the enum. */
  status: string;
  /** One of the groups counted above the list. */
  scope: DeliveryScope | "";
  search: string;
  date: DeliveryDateFilter | "";
  zone: string;
  /** User id of a courier. */
  courier: string;
  priority: DeliveryPriorityFilter | "";
  sort: DeliverySortKey;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_LIST_STATE: ListState = {
  status: "",
  scope: "",
  search: "",
  date: "",
  zone: "",
  courier: "",
  priority: "",
  sort: "created_at",
  direction: "desc",
  page: 1,
  pageSize: DEFAULT_DELIVERY_PAGE_SIZE,
};

const DATES: DeliveryDateFilter[] = ["today", "yesterday", "week"];
const PRIORITIES: DeliveryPriorityFilter[] = ["urgent", "normal", "low"];
const SORTS: DeliverySortKey[] = ["created_at", "status", "eta", "shipping_amount"];
/** Ids come from the server (ULIDs): anything else in the URL is not one. */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

interface ReadableParams {
  get(name: string): string | null;
}

const among = <T extends string>(value: string | null, allowed: readonly T[]): T | "" =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : "";

export function readListState(params: ReadableParams): ListState {
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("size"));
  const zone = params.get("zone") ?? "";
  const courier = params.get("courier") ?? "";

  return {
    status: among(params.get("status"), DELIVERY_STATUS_CODES),
    scope: among(params.get("scope"), DELIVERY_SCOPES),
    search: (params.get("q") ?? "").trim().slice(0, 100),
    date: among(params.get("date"), DATES),
    zone: ID.test(zone) ? zone : "",
    courier: ID.test(courier) ? courier : "",
    priority: among(params.get("priority"), PRIORITIES),
    sort: among(params.get("sort"), SORTS) || DEFAULT_LIST_STATE.sort,
    direction: params.get("dir") === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: (DELIVERY_PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_DELIVERY_PAGE_SIZE,
  };
}

/** Only what differs from the defaults is written: the plain list has a clean URL. */
export function writeListState(state: ListState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.status) params.set("status", state.status);
  if (state.scope) params.set("scope", state.scope);
  if (state.search) params.set("q", state.search);
  if (state.date) params.set("date", state.date);
  if (state.zone) params.set("zone", state.zone);
  if (state.courier) params.set("courier", state.courier);
  if (state.priority) params.set("priority", state.priority);
  if (state.sort !== DEFAULT_LIST_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_LIST_STATE.direction) params.set("dir", state.direction);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_LIST_STATE.pageSize) params.set("size", String(state.pageSize));
  return params;
}

/** The filters of a state, as the API takes them. */
export function filtersOf(state: ListState): DeliveryListFilters {
  return {
    status: state.status || undefined,
    scope: state.scope || undefined,
    search: state.search || undefined,
    date: state.date || undefined,
    zoneId: state.zone || undefined,
    courierId: state.courier || undefined,
    priority: state.priority || undefined,
    sort: state.sort,
    direction: state.direction,
  };
}

/** Whether anything narrows the list. */
export function isNarrowed(state: ListState): boolean {
  return Boolean(state.status || state.scope || state.search || state.date || state.zone || state.courier || state.priority);
}

/** What « Tout afficher » resets: every filter, not the sort nor the page size. */
export const CLEARED_FILTERS = { status: "", scope: "", search: "", date: "", zone: "", courier: "", priority: "" } as const satisfies Partial<ListState>;

/**
 * Three choices of the status select are groups of the server, not a status
 * of the enum taken alone:
 *   - « À accepter », the requests waiting for a decision;
 *   - « À traiter en priorité », what the dashboard lists first;
 *   - « À assigner », what the agency accepted and that waits for a courier.
 *     By its status alone (`pending`) it also listed the requests the agency
 *     has not accepted, which read « À accepter »: four rows under a figure
 *     that said two.
 */
const GROUP_OF_CHOICE: Record<string, DeliveryScope> = { to_accept: "awaiting_decision", needs_action: "needs_action", pending: "to_assign" };
const CHOICE_OF_GROUP: Partial<Record<DeliveryScope, string>> = { awaiting_decision: "to_accept", needs_action: "needs_action", to_assign: "pending" };

/** The value of the status select. */
export function statusSelectValue(state: Pick<ListState, "status" | "scope">): string {
  return (state.scope && CHOICE_OF_GROUP[state.scope]) || state.status;
}

export function withStatusSelect(value: string, state: Pick<ListState, "scope">): Pick<ListState, "status" | "scope"> {
  const group = GROUP_OF_CHOICE[value];
  if (group) return { status: "", scope: group };
  // Leaving one of these three leaves its group; another group chosen above the list stays.
  return { status: value, scope: state.scope && CHOICE_OF_GROUP[state.scope] ? "" : state.scope };
}
