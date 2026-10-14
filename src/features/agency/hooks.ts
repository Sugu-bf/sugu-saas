"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/features/auth/hooks";
import * as agencyService from "./service";

// ============================================================
// Statistics Hook
// ============================================================

/**
 * Hook: Agency statistics page (KPIs, chart, top drivers, failures, weekly).
 *
 * Uses `keepPreviousData` so switching periods doesn't flash blank.
 * 3-minute staleTime — statistical data doesn't change rapidly.
 *
 * @param period — "7j" | "30j" | "90j"
 */
export function useAgencyStats(period?: string) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.statistics(period),
    queryFn: () => agencyService.getAgencyStats(agencyId!, period),
    staleTime: 3 * 60 * 1000,
    enabled: !!agencyId,
    placeholderData: keepPreviousData,
  });
}

// ============================================================
// Settings Hooks
// ============================================================

// ============================================================
// Invitation Code Hooks
// ============================================================

/**
 * Hook: Fetch the agency's driver invitation / referral code.
 *
 * 5-minute staleTime — the code almost never changes.
 */
export function useAgencyInvitationCode() {
  return useQuery({
    queryKey: queryKeys.agency.invitationCode(),
    queryFn: () => agencyService.getInvitationCode(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Regenerate the agency invitation code.
 *
 * Directly updates the cache on success so the UI reflects the new code instantly.
 */
export function useRegenerateInvitationCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => agencyService.getInvitationCode(true),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.agency.invitationCode(), data);
    },
  });
}

// ============================================================
// Zone Management Hooks
// ============================================================

