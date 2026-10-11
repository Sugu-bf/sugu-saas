import { api, apiFetch } from "@/lib/http/client";
import { ApiError } from "@/lib/http/api-error";
import { downloadBlob, saveBlob } from "@/lib/http/download";
import { parseCourierDetail, parseCourierListPage, type CourierDetail, type CourierListPage } from "./contract";

// ============================================================
// Agency couriers — HTTP calls. Every call goes through the BFF;
// Laravel authorises each one (DeliveryCourierPolicy).
// ============================================================

export const COURIER_PAGE_SIZE = 10;

export type CourierSortKey = "created_at" | "name" | "total_deliveries" | "rating_avg" | "last_delivery_at";

/** Filters of the list, exactly as `GET agencies/{id}/couriers` understands them. */
export interface CourierListFilters {
  activity?: string;
  quartier?: string;
  search?: string;
  sort?: CourierSortKey;
  direction?: "asc" | "desc";
}

export interface CourierListQuery extends CourierListFilters {
  page: number;
  pageSize?: number;
}

function filterParams(filters: CourierListFilters): Record<string, string | undefined> {
  return {
    activity: filters.activity || undefined,
    quartier: filters.quartier || undefined,
    search: filters.search?.trim() || undefined,
    sort_by: filters.sort,
    sort_order: filters.direction,
  };
}

const couriers = (agencyId: string) => `agencies/${encodeURIComponent(agencyId)}/couriers`;
const courier = (agencyId: string, id: string) => `${couriers(agencyId)}/${encodeURIComponent(id)}`;

export async function fetchCouriers(agencyId: string, query: CourierListQuery): Promise<CourierListPage> {
  const pageSize = query.pageSize ?? COURIER_PAGE_SIZE;
  const response = await api.get<{ data: unknown }>(couriers(agencyId), {
    params: { ...filterParams(query), page: query.page, per_page: pageSize },
  });
  return parseCourierListPage(response.data, { page: query.page, pageSize });
}

export async function fetchCourier(agencyId: string, id: string): Promise<CourierDetail> {
  const response = await api.get<{ data: unknown }>(courier(agencyId, id));
  return parseCourierDetail(response.data);
}

// ── Account ─────────────────────────────────────────────────

/** `RegisterCourierRequest`: creates the user account and its courier profile. */
export interface NewCourierRequest {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  gender?: "homme" | "femme";
  quartier?: string;
  address?: string;
  vehicle_type: "moto" | "velo" | "voiture" | "tricycle";
  vehicle_make?: string;
  vehicle_plate?: string;
  vehicle_color?: string;
  vehicle_year?: string;
  /** Sends the courier a link to set his password. Needs `email`. */
  send_email?: boolean;
  /** The backend sends no SMS today: always false. */
  send_sms?: boolean;
}

export async function registerCourier(agencyId: string, request: NewCourierRequest): Promise<{ courierId: string }> {
  const response = await api.post<{ data: { courier_id: string } }>(`${couriers(agencyId)}/register`, request);
  return { courierId: String(response.data.courier_id) };
}

/** `UpdateCourierRequest`: every field is optional; what is absent is left as it is. */
export interface CourierUpdateRequest {
  first_name?: string;
  /** Left out for a courier recorded under one name. */
  last_name?: string;
  email?: string;
  phone?: string;
  quartier?: string;
  address?: string;
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_plate?: string;
  vehicle_color?: string;
  vehicle_year?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  /** Pause (false) or resume (true): a paused courier is offered no delivery. */
  is_active?: boolean;
}

export async function updateCourier(agencyId: string, id: string, request: CourierUpdateRequest): Promise<void> {
  await api.put(courier(agencyId, id), request);
}

export async function suspendCourier(agencyId: string, id: string, reason: string): Promise<void> {
  await api.post(`${courier(agencyId, id)}/suspend`, { reason: reason.trim() || undefined });
}

export async function activateCourier(agencyId: string, id: string): Promise<void> {
  await api.post(`${courier(agencyId, id)}/activate`);
}

/** Decision on the identity documents: approves the account, or sends it back. */
export async function verifyCourierKyc(agencyId: string, id: string, approved: boolean, notes?: string): Promise<void> {
  await api.post(`${courier(agencyId, id)}/verify-kyc`, { approved, notes: notes?.trim() || undefined });
}

/** His own share of each delivery fee, in percent; `null` goes back to the default rate of the agency. */
export async function setCourierCommissionRate(agencyId: string, id: string, rate: number | null): Promise<void> {
  await api.put(`${courier(agencyId, id)}/commission-rate`, { rate });
}

// ── Documents ───────────────────────────────────────────────

export interface NewCourierDocument {
  type: string;
  name: string;
  number?: string;
  expiresOn?: string;
  file: File;
}

/** Multipart: goes through the BFF as a raw request. */
export async function addCourierDocument(agencyId: string, id: string, document: NewCourierDocument): Promise<void> {
  const body = new FormData();
  body.set("document_type", document.type);
  body.set("document_name", document.name);
  if (document.number) body.set("document_number", document.number);
  if (document.expiresOn) body.set("expires_on", document.expiresOn);
  body.append("files[]", document.file);

  let response: Response;
  try {
    response = await apiFetch(`${courier(agencyId, id)}/kyc-documents`, { method: "POST", body });
  } catch {
    throw new ApiError({ message: "Network error", status: 0, code: "NETWORK" });
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let errors: Record<string, string[]> | undefined;
    try {
      const payload = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
      if (payload.message) message = payload.message;
      errors = payload.errors;
    } catch {
      // Not JSON: keep the status.
    }
    throw new ApiError({ message, status: response.status, errors });
  }
}

/** CSV of the couriers matching the filters, built by the server. Reserved to who runs the agency. */
export async function exportCouriersCsv(agencyId: string, filters: CourierListFilters): Promise<void> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filterParams(filters))) {
    if (value !== undefined) query.set(key, value);
  }
  const qs = query.toString();
  const blob = await downloadBlob(`${couriers(agencyId)}/export${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { Accept: "text/csv" },
  });
  saveBlob(blob, `livreurs-${new Date().toISOString().slice(0, 10)}.csv`);
}
