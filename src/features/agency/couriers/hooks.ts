"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useAgencyId } from "../session";
import { once } from "../single-flight";
import {
  activateCourier,
  addCourierDocument,
  fetchCourier,
  fetchCouriers,
  registerCourier,
  setCourierCommissionRate,
  suspendCourier,
  updateCourier,
  verifyCourierKyc,
  type CourierListQuery,
  type CourierUpdateRequest,
  type NewCourierDocument,
  type NewCourierRequest,
} from "./api";

// ── Reads ───────────────────────────────────────────────────

export function useCouriers(query: CourierListQuery, options: { enabled?: boolean } = {}) {
  const agencyId = useAgencyId();
  return useQuery({
    queryKey: queryKeys.agency.courierList(agencyId ?? "", { ...query }),
    queryFn: () => fetchCouriers(agencyId!, query),
    enabled: Boolean(agencyId) && (options.enabled ?? true),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCourier(id: string) {
  const agencyId = useAgencyId();
  return useQuery({
    queryKey: queryKeys.agency.courier(agencyId ?? "", id),
    queryFn: () => fetchCourier(agencyId!, id),
    enabled: Boolean(agencyId) && Boolean(id),
    staleTime: 15_000,
  });
}

// ── Mutations ───────────────────────────────────────────────

/** What the agency does to a courier's account. Every agency screen is refetched once the server has answered. */
export type CourierAction =
  | { type: "pause"; id: string }
  | { type: "resume"; id: string }
  | { type: "suspend"; id: string; reason: string }
  | { type: "activate"; id: string }
  | { type: "verify"; id: string; approved: boolean; notes?: string }
  | { type: "commission"; id: string; rate: number | null }
  | { type: "update"; id: string; request: CourierUpdateRequest }
  | { type: "document"; id: string; document: NewCourierDocument };

function run(agencyId: string, action: CourierAction): Promise<void> {
  switch (action.type) {
    case "pause":
      return updateCourier(agencyId, action.id, { is_active: false });
    case "resume":
      return updateCourier(agencyId, action.id, { is_active: true });
    case "suspend":
      return suspendCourier(agencyId, action.id, action.reason);
    case "activate":
      return activateCourier(agencyId, action.id);
    case "verify":
      return verifyCourierKyc(agencyId, action.id, action.approved, action.notes);
    case "commission":
      return setCourierCommissionRate(agencyId, action.id, action.rate);
    case "update":
      return updateCourier(agencyId, action.id, action.request);
    case "document":
      return addCourierDocument(agencyId, action.id, action.document);
  }
}

export function useCourierAction() {
  const agencyId = useAgencyId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: CourierAction) => once(["courier", agencyId, action], () => run(agencyId!, action)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.agency.all }),
  });
}

export function useRegisterCourier() {
  const agencyId = useAgencyId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: NewCourierRequest) => once(["new courier", agencyId, request], () => registerCourier(agencyId!, request)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.agency.all }),
  });
}
