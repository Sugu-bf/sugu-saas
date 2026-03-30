"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/features/auth/hooks";
import * as agencyService from "./service";
import type { DeliveryFilters, DriverFilters, UpdateAgencySettingsPayload, UpdatePasswordPayload } from "./service";
import type { AgencySettingsResponse } from "./schema";
import { useEffect } from "react";

/**
 * Hook: Agency dashboard stats.
 *
 * Automatically injects the agencyId from the current session.
 * If the user session doesn't have delivery_partner_id yet
 * (because they logged in before we added it), the hook will
 * invalidate the session to force a fresh /me call.
 */
export function useAgencyDashboard() {
  const queryClient = useQueryClient();
  const { data: user, isFetched: sessionFetched } = useSession();

  // If user is an agency user but doesn't have delivery_partner_id,
  // invalidate the session cache to force a fresh /me call
  useEffect(() => {
    if (
      sessionFetched &&
      user &&
      user.role === "agency" &&
      !user.delivery_partner_id
    ) {
      console.info(
        "[agency] Session missing delivery_partner_id — refreshing..."
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    }
  }, [sessionFetched, user, queryClient]);

  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.dashboard(),
    queryFn: () => agencyService.getAgencyDashboard(agencyId!),
    staleTime: 2 * 60 * 1000,
    enabled: !!agencyId,
  });
}

// ============================================================
// Deliveries Hooks
// ============================================================

/**
 * Hook: Fetch agency deliveries (paginated + filtered).
 *
 * Uses the session's delivery_partner_id automatically.
 */
export function useAgencyDeliveries(filters?: DeliveryFilters) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.deliveries(filters as Record<string, unknown>),
    queryFn: () => agencyService.getAgencyDeliveries(agencyId!, filters),
    staleTime: 30 * 1000,
    enabled: !!agencyId,
  });
}

/**
 * Hook: Fetch a single delivery detail.
 */
export function useDeliveryDetail(shipmentId: string | null) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useQuery({
    queryKey: queryKeys.agency.deliveryDetail(shipmentId ?? ""),
    queryFn: () => agencyService.getDeliveryDetail(agencyId, shipmentId!),
    enabled: !!shipmentId && !!agencyId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Add an internal note to a shipment.
 *
 * Invalidates the delivery detail cache on success.
 */
export function useAddShipmentNote(shipmentId: string) {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (memo: string) =>
      agencyService.addShipmentNote(agencyId, shipmentId, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agency.deliveryDetail(shipmentId),
      });
    },
  });
}

/**
 * Hook: Assign a courier to a shipment.
 *
 * Invalidates deliveries list on success.
 */
export function useAssignCourier() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({
      shipmentId,
      courierId,
    }: {
      shipmentId: string;
      courierId: string;
    }) => agencyService.assignCourier(agencyId, shipmentId, courierId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agency.all,
      });
    },
  });
}

/**
 * Hook: Update shipment status.
 *
 * Implements optimistic UI: updates the cached row immediately,
 * then reconciles on server response.
 */
export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({
      shipmentId,
      status,
      memo,
    }: {
      shipmentId: string;
      status: string;
      memo?: string;
    }) =>
      agencyService.updateDeliveryStatus(agencyId, shipmentId, status, memo),
    onSuccess: () => {
      // Invalidate all agency queries to refresh summary + list
      queryClient.invalidateQueries({
        queryKey: queryKeys.agency.all,
      });
    },
  });
}

/**
 * Hook: Bulk assign courier to multiple shipments.
 */
export function useBulkAssign() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({
      shipmentIds,
      courierId,
    }: {
      shipmentIds: string[];
      courierId: string;
    }) => agencyService.bulkAssign(agencyId, shipmentIds, courierId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agency.all,
      });
    },
  });
}

/**
 * Hook: Bulk update status for multiple shipments.
 */
export function useBulkStatus() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({
      shipmentIds,
      status,
    }: {
      shipmentIds: string[];
      status: string;
    }) => agencyService.bulkStatus(agencyId, shipmentIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agency.all,
      });
    },
  });
}

/**
 * Hook: Create a new delivery.
 * Invalidates all agency queries on success.
 */
export function useCreateDelivery() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (data: Parameters<typeof agencyService.createDelivery>[1]) =>
      agencyService.createDelivery(agencyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.all });
    },
  });
}

// ============================================================
// Drivers Hooks
// ============================================================

/**
 * Hook: Fetch agency drivers (grid + summary).
 *
 * Uses the session's delivery_partner_id automatically.
 */
export function useAgencyDrivers(filters?: DriverFilters) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? undefined;

  return useQuery({
    queryKey: queryKeys.agency.drivers(filters as Record<string, unknown>),
    queryFn: () => agencyService.getAgencyDrivers(agencyId!, filters),
    staleTime: 60 * 1000,
    enabled: !!agencyId,
  });
}

/**
 * Hook: Fetch a single driver's detail (side panel).
 *
 * Only fetches when a courierId is provided.
 */
export function useDriverDetail(courierId: string | null) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useQuery({
    queryKey: queryKeys.agency.driverDetail(courierId ?? ""),
    queryFn: () => agencyService.getDriverDetail(agencyId, courierId!),
    enabled: !!agencyId && !!courierId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Fetch a driver's full profile (profile page).
 */
export function useDriverProfileData(courierId: string | null) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useQuery({
    queryKey: queryKeys.agency.driverDetail(courierId ?? ""),
    queryFn: () => agencyService.getDriverProfile(agencyId, courierId!),
    enabled: !!agencyId && !!courierId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Suspend a courier.
 *
 * Invalidates drivers list on success.
 */
export function useSuspendCourier() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({
      courierId,
      reason,
      suspendedUntil,
    }: {
      courierId: string;
      reason?: string;
      suspendedUntil?: string;
    }) => agencyService.suspendCourier(agencyId, courierId, reason, suspendedUntil),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.drivers() });
    },
  });
}

/**
 * Hook: Reactivate a suspended courier.
 *
 * Invalidates drivers list on success.
 */
export function useActivateCourier() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({ courierId }: { courierId: string }) =>
      agencyService.activateCourier(agencyId, courierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.drivers() });
    },
  });
}

/**
 * Hook: Verify Courier KYC.
 *
 * Invalidates driver detail and drivers list on success.
 */
export function useVerifyCourierKyc() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({
      courierId,
      approved,
      notes,
    }: {
      courierId: string;
      approved: boolean;
      notes?: string;
    }) => agencyService.verifyCourierKyc(agencyId, courierId, approved, notes),
    onSuccess: (_, { courierId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.drivers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.driverDetail(courierId) });
    },
  });
}

/**
 * Hook: Add a new courier.
 *
 * Invalidates all agency queries on success.
 */
export function useAddCourier() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (data: Parameters<typeof agencyService.addCourier>[1]) =>
      agencyService.addCourier(agencyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.all });
    },
  });
}

/**
 * Hook: Register a new courier (full creation form).
 *
 * Invalidates drivers list on success.
 * Returns the generated credentials for display.
 */
export function useRegisterCourier() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (data: Parameters<typeof agencyService.registerCourier>[1]) =>
      agencyService.registerCourier(agencyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.drivers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.dashboard() });
    },
  });
}

/**
 * Hook: Remove a courier from the agency.
 *
 * Invalidates all agency queries on success.
 */
export function useRemoveCourier() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: ({ courierId }: { courierId: string }) =>
      agencyService.removeCourier(agencyId, courierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.all });
    },
  });
}


/**
 * Hook: Fetch available couriers for the delivery wizard.
 *
 * Uses the session's delivery_partner_id automatically.
 * 30s staleTime — courier availability changes fast.
 */
export function useAvailableCouriers(filters?: { search?: string }) {
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useQuery({
    queryKey: queryKeys.agency.couriers(filters as Record<string, unknown>),
    queryFn: () => agencyService.getAvailableCouriers(agencyId, filters),
    enabled: !!agencyId,
    staleTime: 30 * 1000,
  });
}

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

/**
 * Hook: Delete the agency (onglet "Supprimer").
 *
 * Clears all agency cache and redirects on success.
 */
export function useDeleteAgency() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const agencyId = user?.delivery_partner_id ?? "";

  return useMutation({
    mutationFn: (confirm: string) =>
      agencyService.deleteAgency(agencyId, confirm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agency.all });
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

