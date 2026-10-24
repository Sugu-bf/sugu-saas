"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  adjustStock,
  changeProductStatus,
  deleteProduct,
  fetchInventory,
  fetchProduct,
  fetchProductCategories,
  fetchProductCounts,
  fetchProducts,
  saveProduct,
  submitProduct,
  type InventoryQuery,
  type ProductListQuery,
  type StockAdjustment,
} from "./api";
import type { PublicationAction } from "./contract";

// ── Reads ───────────────────────────────────────────────────

export function useProducts(query: ProductListQuery) {
  return useQuery({
    queryKey: queryKeys.vendor.products({ ...query }),
    queryFn: () => fetchProducts(query),
    staleTime: 30_000,
    // A new page, sort or filter keeps the current rows visible while it loads.
    placeholderData: keepPreviousData,
  });
}

export function useProductCounts() {
  return useQuery({
    queryKey: queryKeys.vendor.productStats(),
    queryFn: fetchProductCounts,
    staleTime: 30_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.vendor.productDetail(id),
    queryFn: () => fetchProduct(id),
    staleTime: 15_000,
    enabled: Boolean(id),
  });
}

export function useInventory(query: InventoryQuery) {
  return useQuery({
    queryKey: queryKeys.vendor.inventory({ ...query }),
    queryFn: () => fetchInventory(query),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

// ── Mutations ───────────────────────────────────────────────

/** Everything that shows a product or its stock: lists, counters, detail, inventory. */
function useInvalidateCatalogue() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [...queryKeys.vendor.all, "products"] }),
      queryClient.invalidateQueries({ queryKey: [...queryKeys.vendor.all, "inventory"] }),
      // Product search of the manual sale shows the stock too.
      queryClient.invalidateQueries({ queryKey: [...queryKeys.vendor.all, "productSearch"] }),
    ]);
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({ mutationFn: (id: string) => deleteProduct(id), onSettled: invalidate });
}

/**
 * A stock adjustment. Nothing is assumed about the result: the stock shown
 * afterwards is the one the server answers, on success as on refusal.
 */
export function useAdjustStock() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({ mutationFn: (adjustment: StockAdjustment) => adjustStock(adjustment), onSettled: invalidate });
}

// ── Product form ────────────────────────────────────────────

export function useProductCategoryOptions() {
  return useQuery({
    queryKey: queryKeys.vendor.productCategories(),
    queryFn: fetchProductCategories,
    staleTime: 10 * 60_000,
  });
}

export function useSaveProduct() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({
    mutationFn: ({ body, id }: { body: FormData; id?: string }) => saveProduct(body, id),
    onSettled: invalidate,
  });
}

export function useChangeProductStatus() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PublicationAction }) => changeProductStatus(id, status),
    onSettled: invalidate,
  });
}

export function useSubmitProduct() {
  const invalidate = useInvalidateCatalogue();
  return useMutation({ mutationFn: (id: string) => submitProduct(id), onSettled: invalidate });
}
