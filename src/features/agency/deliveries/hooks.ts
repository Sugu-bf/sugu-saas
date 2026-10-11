"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useAgencyId } from "../session";
import {
  acceptDelivery,
  addDeliveryNote,
  assignDeliveries,
  assignDelivery,
  changeDeliveriesStatus,
  changeDeliveryPrice,
  changeDeliveryStatus,
  createDelivery,
  fetchDeliveries,
  fetchDelivery,
  refuseDelivery,
  searchShops,
  type DeliveryListQuery,
  type NewDeliveryRequest,
} from "./api";
import { SHOP_SEARCH_MIN_LENGTH } from "./shops";

// ── Reads ───────────────────────────────────────────────────

export function useDeliveries(query: DeliveryListQuery, options: { enabled?: boolean } = {}) {
  const agencyId = useAgencyId();
  return useQuery({
    queryKey: queryKeys.agency.shipmentList(agencyId ?? "", { ...query }),
    queryFn: () => fetchDeliveries(agencyId!, query),
    enabled: Boolean(agencyId) && (options.enabled ?? true),
    staleTime: 30_000,
    // A new page, sort or filter keeps the current rows visible while it loads.
    placeholderData: keepPreviousData,
  });
}

export function useDelivery(id: string) {
  const agencyId = useAgencyId();
  return useQuery({
    queryKey: queryKeys.agency.shipment(agencyId ?? "", id),
    queryFn: () => fetchDelivery(agencyId!, id),
    enabled: Boolean(agencyId) && Boolean(id),
    staleTime: 15_000,
  });
}

/**
 * Shops of the marketplace whose name holds what is being typed, asked once
 * typing has paused. Nothing is asked under two characters.
 */
export function useShopSuggestions(typed: string) {
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(typed.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [typed]);

  const asked = search.length >= SHOP_SEARCH_MIN_LENGTH;
  const shops = useQuery({
    queryKey: [...queryKeys.agency.portal(), "shops", search],
    queryFn: ({ signal }) => searchShops(search, signal),
    enabled: asked,
    staleTime: 60_000,
  });
  // The answer to what is typed now, never to what was typed before.
  return asked && search === typed.trim() ? (shops.data ?? []) : [];
}

// ── Mutations ───────────────────────────────────────────────

/**
 * What the agency does to a delivery. Nothing is assumed about the result:
 * every agency screen (lists, pages, dashboard) is refetched once the server
 * has answered, on success as on refusal — a refusal often means the delivery
 * moved meanwhile.
 */
export type DeliveryAction =
  | { type: "accept"; id: string }
  | { type: "refuse"; id: string; reason: string }
  | { type: "assign"; id: string; courierUserId: string }
  | { type: "status"; id: string; status: string; memo?: string }
  | { type: "price"; id: string; francs: number }
  | { type: "note"; id: string; memo: string };

function run(agencyId: string, action: DeliveryAction): Promise<unknown> {
  switch (action.type) {
    case "accept":
      return acceptDelivery(agencyId, action.id);
    case "refuse":
      return refuseDelivery(agencyId, action.id, action.reason);
    case "assign":
      return assignDelivery(agencyId, action.id, action.courierUserId);
    case "status":
      return changeDeliveryStatus(agencyId, action.id, action.status, action.memo);
    case "price":
      return changeDeliveryPrice(agencyId, action.id, action.francs);
    case "note":
      return addDeliveryNote(agencyId, action.id, action.memo);
  }
}

function useRefreshAgency() {
  const queryClient = useQueryClient();
  // The old screens of the workspace (earnings, statistics) read the same data under other keys.
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.agency.all });
}

export function useDeliveryAction() {
  const agencyId = useAgencyId();
  const refresh = useRefreshAgency();
  return useMutation({
    mutationFn: (action: DeliveryAction) => run(agencyId!, action),
    onSettled: refresh,
  });
}

export type BulkDeliveryAction =
  | { type: "assign"; ids: string[]; courierUserId: string }
  | { type: "status"; ids: string[]; status: string };

export function useBulkDeliveryAction() {
  const agencyId = useAgencyId();
  const refresh = useRefreshAgency();
  return useMutation({
    mutationFn: (action: BulkDeliveryAction) =>
      action.type === "assign"
        ? assignDeliveries(agencyId!, action.ids, action.courierUserId)
        : changeDeliveriesStatus(agencyId!, action.ids, action.status),
    onSettled: refresh,
  });
}

export function useCreateDelivery() {
  const agencyId = useAgencyId();
  const refresh = useRefreshAgency();
  return useMutation({
    mutationFn: (request: NewDeliveryRequest) => createDelivery(agencyId!, request),
    onSuccess: refresh,
  });
}
