import { api } from "@/lib/http/client";
import {
  parseMission,
  parseMissionDetail,
  parseMissionList,
  parseOverview,
  type Mission,
  type MissionDetail,
  type MissionListPage,
  type MissionPhase,
  type MissionScope,
  type Overview,
} from "./contract";

// ============================================================
// Missions of a courier — HTTP calls. Every call goes through the
// BFF; Laravel authorises each one: the courier can work
// (`courier.operational`) and the mission is their own.
// ============================================================

export const MISSION_PAGE_SIZE = 10;

export interface MissionListQuery {
  scope: MissionScope;
  /** Within what is in hand: still to collect, or on the way to the customer. */
  phase?: MissionPhase;
  search?: string;
  page: number;
}

const mission = (id: string) => `courier/deliveries/${encodeURIComponent(id)}`;

export async function fetchOverview(): Promise<Overview> {
  const response = await api.get<{ data: unknown }>("courier/dashboard");
  return parseOverview(response.data);
}

export async function fetchMissions(query: MissionListQuery): Promise<MissionListPage> {
  const response = await api.get<{ data: unknown }>("courier/deliveries", {
    params: {
      scope: query.scope,
      phase: query.scope === "in_progress" ? query.phase : undefined,
      search: query.search?.trim() || undefined,
      page: query.page,
      per_page: MISSION_PAGE_SIZE,
    },
  });
  return parseMissionList(response.data);
}

export async function fetchMission(id: string): Promise<MissionDetail> {
  const response = await api.get<{ data: unknown }>(mission(id));
  return parseMissionDetail(response.data);
}

// ── What a courier does to a mission ────────────────────────

/** Why a delivery could not be made, among what a courier can know at a door (`CourierDeliveryService::FAILURE_CODES`). */
export const FAILURE_CODES = ["NO_ANSWER", "WRONG_ADDRESS", "CLIENT_REFUSED", "OUT_OF_COVERAGE", "RESCHEDULED"] as const;
export type FailureCode = (typeof FAILURE_CODES)[number];

export async function acceptMission(id: string): Promise<Mission | null> {
  const response = await api.post<{ data?: { mission?: unknown } }>(`${mission(id)}/accept`);
  return response.data?.mission ? parseMission(response.data.mission) : null;
}

export async function refuseMission(id: string): Promise<void> {
  await api.post(`${mission(id)}/refuse`);
}

/** The code is the one the boutique tells the courier; the server checks it. */
export async function confirmCollection(id: string, productId: string, pickupCode: string): Promise<void> {
  await api.post(`${mission(id)}/confirm-collection/${encodeURIComponent(productId)}`, { pickup_code: pickupCode.trim() || undefined });
}

export async function startTransit(id: string): Promise<void> {
  await api.post(`${mission(id)}/start-transit`);
}

export async function markArrived(id: string): Promise<void> {
  await api.post(`${mission(id)}/mark-arrived`);
}

/** The code is the one the customer tells the courier; the server checks it, and the payments of a COD Mixte with it. */
export async function markDelivered(id: string, code: string): Promise<void> {
  await api.post(`${mission(id)}/mark-delivered`, { code: code.trim() });
}

export async function signalDelay(id: string, reason: string): Promise<void> {
  await api.post(`${mission(id)}/signal-delay`, { reason: reason.trim() || undefined });
}

export async function markFailed(id: string, code: FailureCode, reason: string): Promise<void> {
  await api.post(`${mission(id)}/mark-failed`, { code, reason: reason.trim() || undefined });
}
