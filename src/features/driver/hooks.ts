"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as driverService from "./service";
import type { DriverDeliveryFilters, DriverHistoryFilters } from "./service";
import type { DriverProfile, DriverVehicle, DriverNotifications } from "./schema";

// ============================================================
// Driver Domain — React Query Hooks
// ============================================================

/**
 * Hook: Driver dashboard data.
 *
 * Uses mock data for now (no backend endpoint).
 * 30s staleTime — dashboard data refreshes frequently.
 */
export function useDriverDashboard() {
  return useQuery({
    queryKey: queryKeys.driver.dashboard(),
    queryFn: () => driverService.getDriverDashboard(),
    staleTime: 30_000,
  });
}

// ============================================================
// Driver Deliveries — Hooks
// ============================================================

/**
 * Hook: Driver deliveries list with filters.
 * 15s staleTime — delivery data refreshes frequently.
 */
export function useDriverDeliveries(filters?: DriverDeliveryFilters) {
  return useQuery({
    queryKey: queryKeys.driver.deliveries(filters as Record<string, unknown>),
    queryFn: () => driverService.getDriverDeliveries(filters),
    staleTime: 15_000,
  });
}

/** Mutation: Accept a delivery */
export function useAcceptDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => driverService.acceptDelivery(deliveryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.deliveries() });
    },
  });
}

/** Mutation: Refuse a delivery */
export function useRefuseDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => driverService.refuseDelivery(deliveryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.deliveries() });
    },
  });
}

/** Mutation: Mark a delivery as delivered */
export function useMarkDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => driverService.markDelivered(deliveryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.deliveries() });
    },
  });
}

/** Mutation: Signal a delay to the agency */
export function useSignalDelay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => driverService.signalDelay(deliveryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.deliveries() });
    },
  });
}

/** Mutation: Mark a delivery as failed */
export function useMarkFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => driverService.markFailed(deliveryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.deliveries() });
    },
  });
}

// ============================================================
// Driver Delivery Detail — Hooks
// ============================================================

/** Hook: Single delivery detail */
export function useDriverDeliveryDetail(deliveryId: string) {
  return useQuery({
    queryKey: queryKeys.driver.deliveryDetail(deliveryId),
    queryFn: () => driverService.getDriverDeliveryDetail(deliveryId),
    staleTime: 15_000,
    enabled: !!deliveryId,
  });
}

/** Mutation: Confirm collection of a specific product */
export function useConfirmCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, productId }: { deliveryId: string; productId: string }) =>
      driverService.confirmCollection(deliveryId, productId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.deliveryDetail(variables.deliveryId) });
    },
  });
}

// ============================================================
// Driver History — Hooks
// ============================================================

/**
 * Hook: Driver delivery history (paginated).
 * 60s staleTime — history data changes less frequently.
 * placeholderData keeps previous data during pagination for smooth UX.
 */
export function useDriverHistory(filters?: DriverHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.driver.history(filters as Record<string, unknown>),
    queryFn: () => driverService.getDriverHistory(filters),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Driver Settings — Hooks
// ============================================================

import type { DriverSettings } from "./schema";
import { ApiError } from "@/lib/http/api-error";

/** Helper: extract error message from unknown error */
function _settingsErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.isRateLimited) return "Trop de requêtes. Veuillez patienter.";
    if (err.isUnauthorized) return "Session expirée. Veuillez vous reconnecter.";
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Hook: Fetch driver settings */
export function useDriverSettings() {
  return useQuery({
    queryKey: queryKeys.driver.settings(),
    queryFn: () => driverService.getDriverSettings(),
    staleTime: 60_000,
  });
}

/** Mutation: Update driver profile */
export function useUpdateDriverProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DriverProfile>) => driverService.updateDriverProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
      toast.success("Profil mis à jour avec succès");
    },
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors de la mise à jour du profil"));
    },
  });
}

/** Mutation: Update driver vehicle */
export function useUpdateDriverVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DriverVehicle>) => driverService.updateDriverVehicle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
      toast.success("Véhicule mis à jour avec succès");
    },
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors de la mise à jour du véhicule"));
    },
  });
}

/** Mutation: Upload KYC document */
export function useUploadKycDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, file }: { docType: string; file: File }) =>
      driverService.uploadKycDocument(docType, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
      toast.success("Document soumis avec succès");
    },
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors de l'upload du document"));
    },
  });
}

/** Mutation: Update driver notifications */
export function useUpdateDriverNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DriverNotifications>) =>
      driverService.updateDriverNotifications(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
      toast.success("Préférences de notification sauvegardées");
    },
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors de la mise à jour des notifications"));
    },
  });
}

/** Mutation: Update driver password */
export function useUpdateDriverPassword() {
  return useMutation({
    mutationFn: (data: {
      currentPassword: string;
      newPassword: string;
      newPasswordConfirmation: string;
    }) => driverService.updateDriverPassword(data),
    onSuccess: () => {
      toast.success("Mot de passe mis à jour avec succès");
    },
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors du changement de mot de passe"));
    },
  });
}

/** Mutation: Toggle 2FA */
export function useToggleDriver2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => driverService.toggleDriver2FA(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
      toast.success("Authentification à deux facteurs mise à jour");
    },
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors de la mise à jour 2FA"));
    },
  });
}

/** Mutation: Revoke single session (with optimistic update) */
export function useRevokeDriverSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => driverService.revokeDriverSession(sessionId),
    onMutate: async (sessionId) => {
      await qc.cancelQueries({ queryKey: queryKeys.driver.settings() });
      const previous = qc.getQueryData<DriverSettings>(queryKeys.driver.settings());
      qc.setQueryData<DriverSettings>(queryKeys.driver.settings(), (old) => {
        if (!old) return old;
        return {
          ...old,
          security: {
            ...old.security,
            sessions: old.security.sessions.filter((s) => s.id !== sessionId),
          },
        };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.driver.settings(), context.previous);
      }
      toast.error(_settingsErrorMessage(err, "Erreur lors de la révocation de la session"));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
    },
  });
}

/** Mutation: Revoke all other sessions (with optimistic update) */
export function useRevokeOtherDriverSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => driverService.revokeOtherDriverSessions(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.driver.settings() });
      const previous = qc.getQueryData<DriverSettings>(queryKeys.driver.settings());
      qc.setQueryData<DriverSettings>(queryKeys.driver.settings(), (old) => {
        if (!old) return old;
        return {
          ...old,
          security: {
            ...old.security,
            sessions: old.security.sessions.filter((s) => s.current),
          },
        };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.driver.settings(), context.previous);
      }
      toast.error(_settingsErrorMessage(err, "Erreur lors de la révocation des sessions"));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.settings() });
    },
  });
}

/** Mutation: Delete driver account */
export function useDeleteDriverAccount() {
  return useMutation({
    mutationFn: (data: { password: string; confirmText: string }) =>
      driverService.deleteDriverAccount(data),
    onError: (err) => {
      toast.error(_settingsErrorMessage(err, "Erreur lors de la suppression du compte"));
    },
  });
}

// ============================================================
// Driver Earnings — Hooks
// ============================================================

import { toast } from "sonner";

/** Hook: Fetch driver earnings data */
export function useDriverEarnings() {
  return useQuery({
    queryKey: queryKeys.driver.earnings(),
    queryFn: () => driverService.getDriverEarnings(),
    staleTime: 30_000,
  });
}

/** Hook: Fetch driver payout settings */
export function useDriverPayoutSettings() {
  return useQuery({
    queryKey: queryKeys.driver.payoutSettings(),
    queryFn: () => driverService.getDriverPayoutSettings(),
    staleTime: 60_000,
  });
}

/** Mutation: Submit withdrawal */
export function useSubmitDriverWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; payoutSettingId: string; pin?: string }) =>
      driverService.submitDriverWithdrawal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.driver.earnings() });
      toast.success("Demande de retrait envoyée avec succès !");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erreur lors du retrait");
    },
  });
}
