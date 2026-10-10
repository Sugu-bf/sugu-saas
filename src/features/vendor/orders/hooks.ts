"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  confirmItemHandoff,
  fetchOrder,
  fetchOrderCounts,
  fetchOrders,
  fetchPickupCodes,
  runOrderAction,
  type OrderListQuery,
} from "./api";
import type { OrderActionKey } from "./contract";
import { createSale, fetchSaleAgencies, searchSaleCustomers, searchSaleProducts, type SaleRequest } from "./sale";

/** The value, once it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ── Reads ───────────────────────────────────────────────────

export function useOrders(query: OrderListQuery) {
  return useQuery({
    queryKey: queryKeys.vendor.orders({ ...query }),
    queryFn: () => fetchOrders(query),
    staleTime: 30_000,
    // A new page, sort or filter keeps the current rows visible while it loads.
    placeholderData: keepPreviousData,
  });
}

export function useOrderCounts() {
  return useQuery({
    queryKey: queryKeys.vendor.orderStats(),
    queryFn: fetchOrderCounts,
    staleTime: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.vendor.orderDetail(id),
    queryFn: () => fetchOrder(id),
    staleTime: 15_000,
    enabled: Boolean(id),
  });
}

export function usePickupCodes(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.vendor.orderPickupCodes(orderId),
    queryFn: () => fetchPickupCodes(orderId),
    staleTime: 15_000,
    enabled: Boolean(orderId) && enabled,
  });
}

// ── Mutations ───────────────────────────────────────────────

/**
 * A status transition. Nothing is assumed about the result: the list, the
 * counters and the detail are refetched once the server has answered, on
 * success as on refusal (a refusal often means the order moved meanwhile).
 */
export function useOrderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: OrderActionKey }) => runOrderAction(id, action),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...queryKeys.vendor.all, "orders"] }),
  });
}

export function useConfirmHandoff(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => confirmItemHandoff(orderId, itemId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orderPickupCodes(orderId) }),
  });
}

// ── Manual sale ─────────────────────────────────────────────

const MIN_SEARCH_LENGTH = 2;

export function useSaleProductSearch(text: string) {
  const query = useDebouncedValue(text.trim(), 300);
  return useQuery({
    queryKey: queryKeys.vendor.productSearch(query),
    queryFn: () => searchSaleProducts(query),
    enabled: query.length >= MIN_SEARCH_LENGTH,
    staleTime: 30_000,
  });
}

export function useSaleCustomerSearch(text: string) {
  const query = useDebouncedValue(text.trim(), 300);
  return useQuery({
    queryKey: queryKeys.vendor.customerSearch(query),
    queryFn: () => searchSaleCustomers(query),
    enabled: query.length >= MIN_SEARCH_LENGTH,
    staleTime: 30_000,
  });
}

export function useSaleAgencies(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.vendor.deliveryPartners(),
    queryFn: fetchSaleAgencies,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ request, idempotencyKey }: { request: SaleRequest; idempotencyKey: string }) =>
      createSale(request, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.vendor.all, "orders"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.dashboard() });
      // Stock moved: product searches and lists are stale.
      queryClient.invalidateQueries({ queryKey: [...queryKeys.vendor.all, "productSearch"] });
    },
  });
}
