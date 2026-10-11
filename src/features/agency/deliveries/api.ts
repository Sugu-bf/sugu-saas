import { api } from "@/lib/http/client";
import { downloadBlob, saveBlob } from "@/lib/http/download";
import {
  parseBulkOutcome,
  parseDeliveryDetail,
  parseDeliveryListPage,
  parseDeliveryRow,
  type BulkOutcome,
  type DeliveryDetail,
  type DeliveryListPage,
  type DeliveryRow,
  type DeliveryScope,
} from "./contract";
import { SHOP_SUGGESTIONS, parseShopSuggestions, type ShopSuggestion } from "./shops";

// ============================================================
// Agency deliveries — HTTP calls. Every call goes through the BFF;
// Laravel authorises each one (scope: the agency of the account).
// ============================================================

export const DELIVERY_PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_DELIVERY_PAGE_SIZE = 10;

export type DeliverySortKey = "created_at" | "status" | "eta" | "shipping_amount";
export type DeliveryDateFilter = "today" | "yesterday" | "week";
export type DeliveryPriorityFilter = "urgent" | "normal" | "low";

/** Filters of the list, exactly as `GET agencies/{id}/shipments` understands them. */
export interface DeliveryListFilters {
  status?: string;
  scope?: DeliveryScope;
  search?: string;
  /** User id of the courier. */
  courierId?: string;
  zoneId?: string;
  date?: DeliveryDateFilter;
  priority?: DeliveryPriorityFilter;
  sort?: DeliverySortKey;
  direction?: "asc" | "desc";
}

export interface DeliveryListQuery extends DeliveryListFilters {
  page: number;
  pageSize: number;
}

function filterParams(filters: DeliveryListFilters): Record<string, string | undefined> {
  return {
    status: filters.status || undefined,
    scope: filters.scope,
    search: filters.search?.trim() || undefined,
    courier_id: filters.courierId || undefined,
    zone_id: filters.zoneId || undefined,
    date: filters.date,
    priority: filters.priority,
    sort: filters.sort,
    direction: filters.direction,
  };
}

const shipments = (agencyId: string) => `agencies/${encodeURIComponent(agencyId)}/shipments`;
const shipment = (agencyId: string, id: string) => `${shipments(agencyId)}/${encodeURIComponent(id)}`;

export async function fetchDeliveries(agencyId: string, query: DeliveryListQuery): Promise<DeliveryListPage> {
  const response = await api.get<{ data: unknown }>(shipments(agencyId), {
    params: { ...filterParams(query), page: query.page, per_page: query.pageSize },
  });
  return parseDeliveryListPage(response.data, { page: query.page, pageSize: query.pageSize });
}

export async function fetchDelivery(agencyId: string, id: string): Promise<DeliveryDetail> {
  const response = await api.get<{ data: unknown }>(shipment(agencyId, id));
  return parseDeliveryDetail(response.data);
}

// ── One delivery ────────────────────────────────────────────

async function rowOf(request: Promise<{ data: unknown }>): Promise<DeliveryRow> {
  return parseDeliveryRow((await request).data);
}

export const acceptDelivery = (agencyId: string, id: string) => rowOf(api.post<{ data: unknown }>(`${shipment(agencyId, id)}/accept`));

export const refuseDelivery = (agencyId: string, id: string, reason: string) =>
  rowOf(api.post<{ data: unknown }>(`${shipment(agencyId, id)}/refuse`, { reason }));

/**
 * Gives the delivery to a courier (his USER id). The server makes it a
 * reassignment, which renews the codes, when it already has another one.
 */
export const assignDelivery = (agencyId: string, id: string, courierUserId: string) =>
  rowOf(api.post<{ data: unknown }>(`${shipment(agencyId, id)}/assign`, { courier_id: courierUserId }));

export const changeDeliveryStatus = (agencyId: string, id: string, status: string, memo?: string) =>
  rowOf(api.post<{ data: unknown }>(`${shipment(agencyId, id)}/status`, { status, memo: memo?.trim() || undefined }));

export async function addDeliveryNote(agencyId: string, id: string, memo: string): Promise<void> {
  await api.post(`${shipment(agencyId, id)}/notes`, { memo: memo.trim() });
}

/** New price of the delivery, in francs. Owner or manager only; the server checks the ceiling. */
export const changeDeliveryPrice = (agencyId: string, id: string, francs: number) =>
  // The endpoint counts in centimes.
  rowOf(api.put<{ data: unknown }>(`${shipment(agencyId, id)}/price`, { amount: Math.round(francs * 100) }));

// ── Several at once ─────────────────────────────────────────

/** At most what the server takes in one call. */
export const BULK_LIMIT = 50;

export async function assignDeliveries(agencyId: string, ids: string[], courierUserId: string): Promise<BulkOutcome> {
  const response = await api.post<{ data: unknown }>(`${shipments(agencyId)}/bulk-assign`, {
    shipment_ids: ids,
    courier_id: courierUserId,
  });
  return parseBulkOutcome(response.data);
}

export async function changeDeliveriesStatus(agencyId: string, ids: string[], status: string): Promise<BulkOutcome> {
  const response = await api.post<{ data: unknown }>(`${shipments(agencyId)}/bulk-status`, { shipment_ids: ids, status });
  return parseBulkOutcome(response.data);
}

// ── Manual delivery ─────────────────────────────────────────

/** `StoreAgencyShipmentRequest`. Amounts in FRANCS: the endpoint converts them. */
export interface NewDeliveryRequest {
  vendor_name: string;
  items_count: number;
  order_total: number;
  payment_status: "paid" | "pending";
  payment_method?: string;
  order_notes?: string;
  pickup_address: string;
  pickup_phone?: string;
  delivery_address: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  delivery_instructions?: string;
  /** User id of the courier, when one is chosen straight away. */
  courier_id?: string;
  priority?: number;
  shipping_amount?: number;
  delivery_date?: string;
  time_slot_from?: string;
  time_slot_to?: string;
}

export const createDelivery = (agencyId: string, request: NewDeliveryRequest) =>
  rowOf(api.post<{ data: unknown }>(shipments(agencyId), request));

/**
 * Shops of the marketplace whose name (or city) holds the text, to fill in
 * who sends a parcel. The public listing: verified, active shops only.
 */
export async function searchShops(search: string, signal?: AbortSignal): Promise<ShopSuggestion[]> {
  const raw = await api.get<unknown>("vendors", { params: { q: search, limit: SHOP_SUGGESTIONS }, signal });
  return parseShopSuggestions(raw);
}

// ── Documents ───────────────────────────────────────────────

/**
 * CSV of the deliveries matching the filters, or of an explicit selection.
 * Built by the server over the whole matching population, not from the
 * rows loaded in the page.
 */
export async function exportDeliveriesCsv(agencyId: string, filters: DeliveryListFilters, ids?: string[]): Promise<void> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filterParams(filters))) {
    if (value !== undefined) query.set(key, value);
  }
  for (const id of ids ?? []) query.append("ids[]", id);
  const qs = query.toString();
  const blob = await downloadBlob(`${shipments(agencyId)}/export${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { Accept: "text/csv" },
  });
  saveBlob(blob, `livraisons-${new Date().toISOString().slice(0, 10)}.csv`);
}
