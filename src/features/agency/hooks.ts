"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/features/auth/hooks";
import * as agencyService from "./service";
import type { UpdateAgencySettingsPayload, UpdatePasswordPayload } from "./service";
import type { AgencySettingsResponse } from "./schema";
import { useIdempotencyKey } from "@/lib/utils/use-idempotency-key";

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

/**
 * Hook: Fetch agency settings for the settings page.
 *
 * 5-minute staleTime — settings change rarely.
 * All data comes directly from the backend API.
 */
export function useAgencySettings() {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.settings(),
    queryFn: () => agencyService.getAgencySettings(agencyId!),
    staleTime: 5 * 60 * 1000,
    enabled: !!agencyId,
  });
}

/**
 * Hook: Update agency settings (onglet "Mon agence").
 *
 * Implements optimistic updates: merges partial data into the cache
 * immediately, then reconciles on server response.
 */
export function useUpdateAgencySettings() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (data: UpdateAgencySettingsPayload) =>
      agencyService.updateAgencySettings(agencyId, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.agency.settings() });
      const previous = queryClient.getQueryData(queryKeys.agency.settings());
      queryClient.setQueryData(
        queryKeys.agency.settings(),
        (old: AgencySettingsResponse | undefined) =>
          old ? { ...old, ...newData } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.agency.settings(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.settings() });
    },
  });
}

/**
 * Hook: Change the user's password (onglet "Sécurité").
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (data: UpdatePasswordPayload) =>
      agencyService.updatePassword(data),
  });
}

/**
 * Hook: Upload agency logo.
 *
 * Invalidates settings cache on success so the new logo URL appears.
 */
export function useUploadAgencyLogo() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (file: File) =>
      agencyService.uploadAgencyLogo(agencyId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.settings() });
    },
  });
}

/**
 * Hook: Delete agency logo.
 *
 * Invalidates settings cache on success so the logo is removed from the UI.
 */
export function useDeleteAgencyLogo() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: () =>
      agencyService.deleteAgencyLogo(agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.settings() });
    },
  });
}

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
// Earnings Hook
// ============================================================

/**
 * Hook: Fetch agency earnings/wallet data.
 */
export function useAgencyEarnings() {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.earnings(),
    queryFn: () => agencyService.getAgencyEarnings(agencyId!),
    staleTime: 60 * 1000,
    enabled: !!agencyId,
  });
}

/**
 * Hook: Fetch agency payout settings (payment methods).
 */
export function useAgencyPayoutSettings() {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.payoutSettings(),
    queryFn: () => agencyService.getAgencyPayoutSettings(agencyId!),
    staleTime: 60 * 1000,
    enabled: !!agencyId,
  });
}

/**
 * Mutation: Submit agency withdrawal request.
 */
export function useSubmitAgencyWithdrawal() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  // Stable across retries of the same submission — see finance.service.
  const idempotencyKey = useIdempotencyKey();

  return useMutation({
    mutationFn: (data: { amount: number; payoutSettingId: string; note?: string }) =>
      agencyService.submitAgencyWithdrawal(agencyId!, {
        ...data,
        idempotencyKey: idempotencyKey(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.earnings() });
    },
  });
}

// ============================================================
// Zone Management Hooks
// ============================================================

/**
 * Hook: Fetch agency zones (from real delivery_zones table).
 *
 * Uses the session's delivery_partner_id automatically.
 * 2-minute staleTime — zones change infrequently.
 */
export function useAgencyZones() {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.agency.all, "zones"],
    queryFn: () => agencyService.getAgencyZones(agencyId!),
    staleTime: 2 * 60 * 1000,
    enabled: !!agencyId,
  });
}

/**
 * Hook: Create a new zone for the agency.
 *
 * Invalidates zones cache on success.
 */
export function useCreateAgencyZone() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (data: { name: string; tarif: number; delay: string; countryCode?: string; enabled?: boolean }) =>
      agencyService.createAgencyZone(agencyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.agency.all, "zones"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.settings() });
    },
  });
}

/**
 * Hook: Update a zone's rate/delay/enabled status.
 *
 * Invalidates zones cache on success.
 */
export function useUpdateAgencyZone() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({ zoneId, ...data }: { zoneId: string; tarif?: number; delay?: string; enabled?: boolean }) =>
      agencyService.updateAgencyZone(agencyId, zoneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.agency.all, "zones"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.settings() });
    },
  });
}

/**
 * Hook: Delete a zone from the agency.
 *
 * Invalidates zones cache on success.
 */
export function useDeleteAgencyZone() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (zoneId: string) =>
      agencyService.deleteAgencyZone(agencyId, zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.agency.all, "zones"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.settings() });
    },
  });
}
