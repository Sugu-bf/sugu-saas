import { api } from "@/lib/http/client";
import { downloadBlob, saveBlob } from "@/lib/http/download";
import { parseClientPage, parseClientSheet, parseClientSummary, parseCreatedClient, type ClientSort, type NewClient } from "./contract";

// ============================================================
// Clients — HTTP calls, all through the BFF. Laravel resolves the
// store from the session: another store's customer answers 404.
// ============================================================

const BASE = "sellers/customers";

export const CLIENT_PAGE_SIZES = [10, 25, 50] as const;

/** Filters of the list, exactly as `GET sellers/customers` understands them. */
export interface ClientFilters {
  search?: string;
  segment?: string;
  city?: string;
  sort?: ClientSort;
  direction?: "asc" | "desc";
}

export interface ClientQuery extends ClientFilters {
  page: number;
  pageSize: number;
}

/** Empty values are not sent: Laravel would validate them. */
function filterParams(filters: ClientFilters): Record<string, string> {
  const sent: Record<string, string> = {};
  for (const [key, value] of Object.entries({ search: filters.search?.trim(), segment: filters.segment, city: filters.city, sort: filters.sort, direction: filters.direction })) {
    if (value) sent[key] = value;
  }
  return sent;
}

export const fetchClients = async (query: ClientQuery) => parseClientPage(await api.get<unknown>(BASE, { params: { ...filterParams(query), page: query.page, limit: query.pageSize } }));

export const fetchClientSummary = async () => parseClientSummary(await api.get<unknown>(`${BASE}/summary`));

export const fetchClient = async (id: string) => parseClientSheet(await api.get<unknown>(`${BASE}/${encodeURIComponent(id)}`));

export async function createClient(values: NewClient) {
  const body: Record<string, string> = { firstName: values.firstName.trim(), lastName: values.lastName.trim() };
  if (values.phone.trim()) body.phone = values.phone.trim();
  if (values.email.trim()) body.email = values.email.trim();
  return parseCreatedClient(await api.post<unknown>(BASE, body));
}

/**
 * CSV of the customers matching the filters. Built by the server over the
 * whole matching population, not from the rows loaded in the page. Says
 * whether the server had to cut the file.
 */
export async function exportClientsCsv(filters: ClientFilters): Promise<void> {
  const blob = await downloadBlob(`${BASE}/export`, {
    method: "POST",
    headers: { Accept: "text/csv", "Content-Type": "application/json" },
    body: JSON.stringify({ ...filterParams(filters), format: "csv" }),
  });
  saveBlob(blob, `clients-${new Date().toISOString().slice(0, 10)}.csv`);
}
