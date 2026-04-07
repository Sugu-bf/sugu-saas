import { api } from "@/lib/http/client";

// ── Agency Zone Management Service ────────────────────────
// Calls real API endpoints that create delivery_zones + delivery_rates
// so that zones appear at checkout.

export interface AgencyZoneData {
  id: string;
  name: string;
  countryCode: string;
  tarif: string;
  delay: string;
  enabled: boolean;
  rateId?: string;
}

/**
 * Fetch all zones for the agency (from real delivery_zones table).
 */
export async function getAgencyZones(agencyId: string): Promise<AgencyZoneData[]> {
  const res = await api.get<{ success: boolean; data: AgencyZoneData[] }>(
    `agencies/${agencyId}/zones`,
  );
  return res.data;
}

/**
 * Create a new zone for the agency.
 * Creates a real delivery_zone + delivery_rate in the backend.
 */
export async function createAgencyZone(
  agencyId: string,
  data: { name: string; tarif: number; delay: string; countryCode?: string; enabled?: boolean },
): Promise<AgencyZoneData> {
  const res = await api.post<{ success: boolean; data: AgencyZoneData }>(
    `agencies/${agencyId}/zones`,
    data,
  );
  return res.data;
}

/**
 * Update a zone's rate/delay/enabled for the agency.
 */
export async function updateAgencyZone(
  agencyId: string,
  zoneId: string,
  data: { tarif?: number; delay?: string; enabled?: boolean },
): Promise<AgencyZoneData> {
  const res = await api.put<{ success: boolean; data: AgencyZoneData }>(
    `agencies/${agencyId}/zones/${zoneId}`,
    data,
  );
  return res.data;
}

/**
 * Remove a zone from the agency (deletes the delivery_rate).
 */
export async function deleteAgencyZone(
  agencyId: string,
  zoneId: string,
): Promise<void> {
  await api.delete(`agencies/${agencyId}/zones/${zoneId}`);
}
