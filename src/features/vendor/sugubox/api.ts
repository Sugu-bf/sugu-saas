import { api } from "@/lib/http/client";
import { downloadBlob, saveBlob } from "@/lib/http/download";
import {
  parseExpeditionDetail,
  parseExpeditionPage,
  parseFilters,
  parseMovementPage,
  parseReceptionDetail,
  parseReceptionPage,
  parseStockPage,
  parseSummary,
} from "./contract";

// ============================================================
// Sugu Box — HTTP calls, all reads, all through the BFF. Laravel
// resolves the store from the session and answers 404 for what
// belongs to another one.
// ============================================================

const BASE = "sellers/sugubox/board";

/** Empty values are not sent: Laravel would validate them. */
function clean(params: Record<string, string | number | undefined | null>): Record<string, string | number> {
  const sent: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") sent[key] = typeof value === "string" ? value.trim() : value;
  }
  return sent;
}

export const fetchSummary = async () => parseSummary(await api.get<unknown>(`${BASE}/summary`));
export const fetchFilters = async () => parseFilters(await api.get<unknown>(`${BASE}/filters`));

export interface StockQuery {
  search?: string;
  state?: string;
  warehouseId?: string;
  sort?: string;
  page: number;
  pageSize: number;
}

const stockParams = (query: Omit<StockQuery, "page" | "pageSize">) => clean({ search: query.search, state: query.state, warehouse_id: query.warehouseId, sort: query.sort });

export const fetchStock = async (query: StockQuery) =>
  parseStockPage(await api.get<unknown>(`${BASE}/stock`, { params: { ...stockParams(query), page: query.page, per_page: query.pageSize } }));

export interface ListQuery {
  search?: string;
  status?: string;
  warehouseId?: string;
  /** Days, both included: `2026-10-12`. */
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

const listParams = (query: Omit<ListQuery, "page" | "pageSize">) => clean({ search: query.search, status: query.status, warehouse_id: query.warehouseId, date_from: query.from, date_to: query.to });

export interface ReceptionQuery extends ListQuery {
  sort?: string;
}

export const fetchReceptions = async (query: ReceptionQuery) =>
  parseReceptionPage(await api.get<unknown>(`${BASE}/inbound`, { params: { ...listParams(query), ...clean({ sort: query.sort }), page: query.page, per_page: query.pageSize } }));

export const fetchReception = async (id: string) => parseReceptionDetail(await api.get<unknown>(`${BASE}/inbound/${encodeURIComponent(id)}`));

export interface ExpeditionQuery extends ListQuery {
  city?: string;
}

export const fetchExpeditions = async (query: ExpeditionQuery) =>
  parseExpeditionPage(await api.get<unknown>(`${BASE}/outbound`, { params: { ...listParams(query), ...clean({ city: query.city }), page: query.page, per_page: query.pageSize } }));

export const fetchExpedition = async (id: string) => parseExpeditionDetail(await api.get<unknown>(`${BASE}/outbound/${encodeURIComponent(id)}`));

export interface MovementQuery extends Omit<ListQuery, "status"> {
  type?: string;
  userId?: string;
}

const movementParams = (query: Omit<MovementQuery, "page" | "pageSize">) =>
  clean({ search: query.search, type: query.type, warehouse_id: query.warehouseId, user_id: query.userId, date_from: query.from, date_to: query.to });

export const fetchMovements = async (query: MovementQuery) =>
  parseMovementPage(await api.get<unknown>(`${BASE}/movements`, { params: { ...movementParams(query), page: query.page, per_page: query.pageSize } }));

// ── Exports: the file Laravel builds, with the filters of the screen ──

async function exportCsv(path: string, params: Record<string, string | number>, filename: string) {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
  const blob = await downloadBlob(`${BASE}/${path}${query ? `?${query}` : ""}`, { headers: { Accept: "text/csv" } });
  saveBlob(blob, `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
}

export const exportStock = (query: Omit<StockQuery, "page" | "pageSize">) => exportCsv("stock/export", stockParams(query), "sugu-box-stock");
export const exportMovements = (query: Omit<MovementQuery, "page" | "pageSize">) => exportCsv("movements/export", movementParams(query), "sugu-box-mouvements");
