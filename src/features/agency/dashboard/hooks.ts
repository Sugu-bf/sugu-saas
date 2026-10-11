"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http/client";
import { queryKeys } from "@/lib/query";
import { useAgencyId } from "../session";
import { parseAgencyDashboard, type AgencyDashboard } from "./contract";

export async function fetchAgencyDashboard(agencyId: string): Promise<AgencyDashboard> {
  const response = await api.get<{ data: unknown }>(`agencies/${encodeURIComponent(agencyId)}/dashboard`);
  return parseAgencyDashboard(response.data);
}

/** The day of the agency. Refreshed every minute while the page is open: it is a board people leave on a screen. */
export function useAgencyOverview() {
  const agencyId = useAgencyId();
  return useQuery({
    queryKey: queryKeys.agency.overview(agencyId ?? ""),
    queryFn: () => fetchAgencyDashboard(agencyId!),
    enabled: Boolean(agencyId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
