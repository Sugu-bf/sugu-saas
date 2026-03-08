"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as driverService from "./service";
import type { DriverDeliveryFilters, DriverHistoryFilters } from "./service";

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
