import { api } from "@/lib/http/client";
import { parseActivityReport, type ActivityReport } from "../statistics/contract";

/**
 * The activity of the agency over a period (`7j`, `30j`, `90j`): the server
 * computes the period, the one before it, and every figure, from the
 * shipments of this agency only.
 */
export async function getAgencyStats(agencyId: string, period: string = "30j"): Promise<ActivityReport> {
  return parseActivityReport(await api.get<unknown>(`agencies/${encodeURIComponent(agencyId)}/statistics`, { params: { period } }));
}
