"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as vendorService from "./service";
import { useSession } from "@/features/auth/hooks";
import type { VendorOrdersResponse } from "./schema";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ────────────────────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor dashboard stats.
 * Automatically injects the vendor name from the current session.
 */
export function useVendorDashboard() {
  const { data: user } = useSession();
  const vendorName = user?.name?.split(" ")[0] ?? undefined;

  return useQuery({
    queryKey: queryKeys.vendor.dashboard(),
    queryFn: () => vendorService.getVendorDashboard(vendorName),
    staleTime: 2 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────
// Orders List
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor orders (paginated, filterable).
 * Uses keepPreviousData for smooth pagination without flash.
 */
export function useVendorOrders(filters?: {
  status?: string;
  page?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendor.orders(filters),
    queryFn: () =>
      vendorService.getVendorOrders(
        filters?.status,
        filters?.page,
        filters?.search,
      ),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ────────────────────────────────────────────────────────────
// Order Detail
// ────────────────────────────────────────────────────────────

/**
 * Hook: Single order detail.
 * Conditionally enabled only when id is provided.
 */
export function useVendorOrderDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.vendor.orderDetail(id),
    queryFn: () => vendorService.getVendorOrderDetail(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

// ────────────────────────────────────────────────────────────
// Order Mutations
// ────────────────────────────────────────────────────────────

/**
 * Hook: Confirm a pending order.
 * Optimistic update: changes status to "processing" immediately.
 */
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorService.confirmOrder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.orders() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });

      const previousOrders = queryClient.getQueriesData<VendorOrdersResponse>({
        queryKey: queryKeys.vendor.orders(),
      });

      // Optimistic: update order status in all cached list queries
      queryClient.setQueriesData<VendorOrdersResponse>(
        { queryKey: queryKeys.vendor.orders() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === id
                ? { ...o, status: "processing" as const, statusLabel: "En préparation" }
                : o,
            ),
          };
        },
      );

      return { previousOrders };
    },
    onError: (_err, _id, context) => {
      // Rollback all order list queries
      context?.previousOrders?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orders() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

/**
 * Hook: Cancel an order.
 * Optimistic update: changes status to "cancelled" immediately.
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorService.cancelOrder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.orders() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });

      const previousOrders = queryClient.getQueriesData<VendorOrdersResponse>({
        queryKey: queryKeys.vendor.orders(),
      });

      queryClient.setQueriesData<VendorOrdersResponse>(
        { queryKey: queryKeys.vendor.orders() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === id
                ? { ...o, status: "cancelled" as const, statusLabel: "Annulée" }
                : o,
            ),
          };
        },
      );

      return { previousOrders };
    },
    onError: (_err, _id, context) => {
      context?.previousOrders?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orders() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

/**
 * Hook: Request delivery for an order.
 * Optimistic update: changes status to "processing" immediately.
 */
export function useRequestDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorService.requestOrderDelivery(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.orders() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });

      const previousOrders = queryClient.getQueriesData<VendorOrdersResponse>({
        queryKey: queryKeys.vendor.orders(),
      });

      queryClient.setQueriesData<VendorOrdersResponse>(
        { queryKey: queryKeys.vendor.orders() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === id
                ? { ...o, status: "processing" as const, statusLabel: "En préparation" }
                : o,
            ),
          };
        },
      );

      return { previousOrders };
    },
    onError: (_err, _id, context) => {
      context?.previousOrders?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orders() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Mark Shipped
// ────────────────────────────────────────────────────────────

/**
 * Hook: Mark order as shipped.
 * Optimistic update: changes status to "shipped" immediately.
 */
export function useMarkShipped() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorService.markOrderShipped(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.orders() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });

      const previousOrders = queryClient.getQueriesData<VendorOrdersResponse>({
        queryKey: queryKeys.vendor.orders(),
      });

      queryClient.setQueriesData<VendorOrdersResponse>(
        { queryKey: queryKeys.vendor.orders() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === id
                ? { ...o, status: "shipped" as const, statusLabel: "Expédiée" }
                : o,
            ),
          };
        },
      );

      return { previousOrders };
    },
    onError: (_err, _id, context) => {
      context?.previousOrders?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orders() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Mark Delivered
// ────────────────────────────────────────────────────────────

/**
 * Hook: Mark order as delivered.
 * Optimistic update: changes status to "delivered" immediately.
 */
export function useMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorService.markOrderDelivered(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.orders() });
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });

      const previousOrders = queryClient.getQueriesData<VendorOrdersResponse>({
        queryKey: queryKeys.vendor.orders(),
      });

      queryClient.setQueriesData<VendorOrdersResponse>(
        { queryKey: queryKeys.vendor.orders() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === id
                ? { ...o, status: "delivered" as const, statusLabel: "Livrée" }
                : o,
            ),
          };
        },
      );

      return { previousOrders };
    },
    onError: (_err, _id, context) => {
      context?.previousOrders?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orders() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.orderDetail(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Products List
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor products (paginated, filterable).
 * Uses keepPreviousData for smooth pagination without flash.
 */
export function useVendorProducts(filters?: {
  status?: string;
  page?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendor.products(filters),
    queryFn: () =>
      vendorService.getVendorProducts(
        filters?.status,
        filters?.page,
        filters?.search,
      ),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ────────────────────────────────────────────────────────────
// Product Detail
// ────────────────────────────────────────────────────────────

/**
 * Hook: Single product detail.
 * Conditionally enabled only when id is provided.
 */
export function useVendorProductDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.vendor.productDetail(id),
    queryFn: () => vendorService.getVendorProductDetail(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

// ────────────────────────────────────────────────────────────
// Product Mutations
// ────────────────────────────────────────────────────────────

/**
 * Hook: Delete a product.
 * Optimistic update: removes the product from the list immediately.
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorService.deleteVendorProduct(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.products() });

      const previousProducts = queryClient.getQueriesData<import("./schema").VendorProductsResponse>({
        queryKey: queryKeys.vendor.products(),
      });

      // Optimistic: remove product from all cached list queries
      queryClient.setQueriesData<import("./schema").VendorProductsResponse>(
        { queryKey: queryKeys.vendor.products() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.filter((p) => p.id !== id),
            pagination: {
              ...old.pagination,
              totalItems: Math.max(0, old.pagination.totalItems - 1),
            },
          };
        },
      );

      return { previousProducts };
    },
    onError: (_err, _id, context) => {
      // Rollback all product list queries
      context?.previousProducts?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.products() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.productStats(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Create Order Page — Search & Mutations
// ────────────────────────────────────────────────────────────

/** Debounce helper hook */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debouncedValue;
}

/**
 * Hook: Product search (debounced).
 * Returns products matching the query from the vendor's catalog.
 */
export function useProductSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: queryKeys.vendor.productSearch(debouncedQuery),
    queryFn: () => vendorService.searchVendorProducts(debouncedQuery),
    staleTime: 30 * 1000,
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook: Pre-load ALL vendor products for client-side filtering.
 * Useful for product pickers where instant search is needed.
 * Data is cached for 5 minutes.
 */
export function useAllVendorProducts() {
  return useQuery({
    queryKey: [...queryKeys.vendor.products(), "all-simple"],
    queryFn: () => vendorService.getAllVendorProducts(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Customer search (debounced).
 * Returns customers matching the query from the vendor's CRM.
 */
export function useCustomerSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: queryKeys.vendor.customerSearch(debouncedQuery),
    queryFn: () => vendorService.searchVendorCustomers(debouncedQuery),
    staleTime: 30 * 1000,
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook: Create a new customer from the order creation form.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.createVendorCustomer,
    onSettled: () => {
      // Invalidate customer search cache so new customer appears
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.vendor.all, "customerSearch"],
      });
    },
  });
}

/**
 * Hook: Create a new order (sale) from the vendor dashboard.
 * On success, invalidates orders + dashboard caches and redirects.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: vendorService.createVendorOrder,
    onSuccess: (data) => {
      // Invalidate related caches
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.orders() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.orderStats(),
      });

      // Navigate to the new order detail page
      if (data.id) {
        router.push(`/vendor/orders/${data.id}`);
      } else {
        router.push("/vendor/orders");
      }
    },
  });
}

// ────────────────────────────────────────────────────────────
// Delivery Partners (for order creation)
// ────────────────────────────────────────────────────────────

/**
 * Hook: Fetch available delivery partners (agencies).
 * Used in order creation to let the vendor select a delivery agency.
 * Partners are cached for 5 minutes since they rarely change.
 */
export function useDeliveryPartners() {
  return useQuery({
    queryKey: queryKeys.vendor.deliveryPartners(),
    queryFn: () => vendorService.getDeliveryPartners(),
    staleTime: 5 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────
// Create Product Page
// ────────────────────────────────────────────────────────────

/**
 * Hook: Fetch product categories from backend.
 * Categories rarely change, so staleTime is set to 10 minutes.
 */
export function useProductCategories() {
  return useQuery({
    queryKey: queryKeys.vendor.productCategories(),
    queryFn: () => vendorService.getProductCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Fetch product brands from backend.
 * Brands rarely change, so staleTime is set to 10 minutes.
 */
export function useProductBrands() {
  return useQuery({
    queryKey: queryKeys.vendor.productBrands(),
    queryFn: () => vendorService.getProductBrands(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Fetch available variant option types from backend.
 * Returns types like Couleur, Taille, Matière, Pointure.
 * This data is static, so staleTime is set to 10 minutes.
 */
export function useVariantOptions() {
  return useQuery({
    queryKey: queryKeys.vendor.variantOptions(),
    queryFn: () => vendorService.getVariantOptions(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Upload an image for background removal preview via Cloudinary.
 * Uses useMutation since each upload is an individual action.
 * Max 1 retry with 2s backoff on failure.
 */
export function usePreviewImage() {
  return useMutation({
    mutationFn: (file: File) => vendorService.previewProductImage(file),
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: Create a new product from the vendor dashboard.
 * On success, invalidates products + dashboard caches and redirects to the new product.
 * Supports optional image file uploads via multipart/form-data.
 * Supports optional previewIds for Cloudinary detoured images.
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (params: {
      formData: {
        name: string;
        description: string;
        price: string;
        originalPrice: string;
        stock: string;
        weightValue: string;
        weightUnit: string;
        publishMode: "publish" | "draft";
        hasBulkPricing: boolean;
        bulkTiers: Array<{ minQty: string; price: string }>;
      };
      categoryId?: string;
      images?: File[];
      previewIds?: string[];
    }) => vendorService.createVendorProduct(params.formData, params.categoryId, params.images, params.previewIds),
    onSuccess: (data) => {
      // Invalidate product list, stats, and dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.products() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.productStats(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });

      // Navigate to the newly created product detail page
      if (data.id) {
        router.push(`/vendor/products/${data.id}`);
      } else {
        router.push("/vendor/products");
      }
    },
  });
}

/**
 * Hook: Update an existing product.
 * On success, invalidates the detail + list caches and redirects to the detail page.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (params: {
      id: string;
      formData: {
        name: string;
        description: string;
        price: string;
        originalPrice: string;
        stock: string;
        weightValue: string;
        weightUnit: string;
        publishMode: "publish" | "draft";
        hasBulkPricing: boolean;
        bulkTiers: Array<{ minQty: string; price: string }>;
      };
      categoryId?: string;
      newImages?: File[];
      removeMediaIds?: (string | number)[];
    }) =>
      vendorService.updateVendorProduct(
        params.id,
        params.formData,
        params.categoryId,
        params.newImages,
        params.removeMediaIds,
      ),
    onSuccess: (_data, variables) => {
      const productId = variables.id;
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.productDetail(productId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.productStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.dashboard() });
      router.push(`/vendor/products/${productId}`);
    },
  });
}

// ────────────────────────────────────────────────────────────
// Clients Page
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor clients (paginated, filterable, searchable).
 * Uses keepPreviousData for smooth pagination without flash.
 */
export function useVendorClients(filters?: {
  status?: string;
  page?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendor.clients(filters),
    queryFn: () =>
      vendorService.getVendorClients(
        filters?.status,
        filters?.page,
        filters?.search,
      ),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook: Single client detail (for the detail panel).
 * Conditionally enabled only when id is provided.
 */
export function useVendorClientDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.vendor.clientDetail(id ?? ""),
    queryFn: () => vendorService.getVendorClientDetail(id!),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

/**
 * Hook: Create a new client from the clients page.
 * Optimistic update: adds client to list immediately.
 */
export function useCreateClientFromPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.createClientFromClientsPage,
    onMutate: async () => {
      // Cancel any ongoing clients queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.vendor.clients() });
    },
    onSettled: () => {
      // Invalidate client list + stats so fresh data is fetched
      queryClient.invalidateQueries({ queryKey: queryKeys.vendor.clients() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.clientStats(),
      });
      // Also invalidate customer search (used in order creation form)
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.vendor.all, "customerSearch"],
      });
    },
  });
}

/**
 * Hook: Export clients data as CSV/JSON.
 * Uses useMutation since it's a one-time action.
 */
export function useExportClients() {
  return useMutation({
    mutationFn: () => vendorService.exportVendorClients(),
  });
}

// ────────────────────────────────────────────────────────────
// Inventory Page
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor inventory (paginated, filterable, searchable).
 * Uses keepPreviousData for smooth pagination without flash.
 */
export function useVendorInventory(filters?: {
  status?: string;
  page?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendor.inventory(filters),
    queryFn: () =>
      vendorService.getVendorInventory(
        filters?.status,
        filters?.page,
        filters?.search,
        filters?.category,
      ),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook: Add stock to an inventory product.
 * Optimistic update: immediately increments stock count in cache.
 */
export function useAddInventoryStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      productId: string;
      quantity: number;
      reason?: string;
      notes?: string;
    }) =>
      vendorService.addInventoryStock(
        params.productId,
        params.quantity,
        params.reason,
        params.notes,
      ),
    onMutate: async (params) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.inventory(),
      });

      // Snapshot current cache for rollback
      const previousData = queryClient.getQueriesData<
        import("./schema").VendorInventoryResponse
      >({
        queryKey: queryKeys.vendor.inventory(),
      });

      // Optimistic: increment stock for the product
      queryClient.setQueriesData<
        import("./schema").VendorInventoryResponse
      >(
        { queryKey: queryKeys.vendor.inventory() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.map((p) =>
              p.id === params.productId
                ? {
                    ...p,
                    stockCurrent: p.stockCurrent + params.quantity,
                    stockPercent: Math.min(
                      100,
                      Math.round(
                        ((p.stockCurrent + params.quantity) / p.stockMax) * 100,
                      ),
                    ),
                    status: (p.stockCurrent + params.quantity > 10
                      ? "ok"
                      : p.stockCurrent + params.quantity > 0
                        ? "low"
                        : "out") as "ok" | "low" | "out",
                    statusLabel:
                      p.stockCurrent + params.quantity > 10
                        ? "OK"
                        : p.stockCurrent + params.quantity > 0
                          ? "Faible"
                          : "Rupture",
                  }
                : p,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _params, context) => {
      // Rollback
      context?.previousData?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      // Invalidate all inventory-related caches
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.inventory(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.inventoryStats(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.inventoryTabs(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.inventoryAlerts(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.dashboard(),
      });
    },
  });
}

/**
 * Hook: Export inventory data as CSV.
 * Uses useMutation since it's a one-time action.
 */
export function useExportInventory() {
  return useMutation({
    mutationFn: () => vendorService.exportInventoryCSV(),
  });
}

// ────────────────────────────────────────────────────────────
// Marketing Page
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor marketing data (KPIs, promo codes, promoted products).
 * Data changes infrequently, so staleTime is set to 2 minutes.
 */
export function useVendorMarketing() {
  return useQuery({
    queryKey: queryKeys.vendor.marketing(),
    queryFn: () => vendorService.getVendorMarketing(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook: Toggle a coupon's active/inactive status.
 * Optimistic update: flips the coupon status immediately in the cache.
 */
export function useToggleCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (couponId: string) => vendorService.toggleCouponStatus(couponId),
    onMutate: async (couponId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.marketing(),
      });

      const previousMarketing = queryClient.getQueryData<
        import("./schema").VendorMarketing
      >(queryKeys.vendor.marketing());

      // Optimistic: toggle the coupon status
      if (previousMarketing) {
        queryClient.setQueryData<import("./schema").VendorMarketing>(
          queryKeys.vendor.marketing(),
          {
            ...previousMarketing,
            promoCodes: previousMarketing.promoCodes.map((c) => {
              if (c.id !== couponId) return c;
              const newStatus = c.status === "active" ? "disabled" : "active";
              const newLabel = newStatus === "active" ? "Actif" : "Désactivé";
              return { ...c, status: newStatus as "active" | "disabled", statusLabel: newLabel };
            }),
          },
        );
      }

      return { previousMarketing };
    },
    onError: (_err, _couponId, context) => {
      if (context?.previousMarketing) {
        queryClient.setQueryData(
          queryKeys.vendor.marketing(),
          context.previousMarketing,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.marketing(),
      });
    },
  });
}

/**
 * Hook: Create a new coupon code.
 * Invalidates marketing cache on success so fresh data is fetched.
 */
export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.createCoupon,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.marketing(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Create Product Promotion
// ────────────────────────────────────────────────────────────

/**
 * Hook: Create a new product promotion.
 * Invalidates marketing cache on success so promoted products refresh.
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.createPromotion,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.marketing(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Delete Product Promotion
// ────────────────────────────────────────────────────────────

/**
 * Hook: Delete (deactivate) a product promotion.
 * Invalidates marketing cache on success so promoted products refresh.
 */
export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.deletePromotion,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.marketing(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Update Product Promotion (toggle active, edit discount, etc.)
// ────────────────────────────────────────────────────────────

/**
 * Hook: Update a product promotion (toggle active, modify discount/expiry).
 * Invalidates marketing cache on success.
 */
export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promotionId, data }: { promotionId: string; data: import("./service").UpdatePromotionRequest }) =>
      vendorService.updatePromotion(promotionId, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.marketing(),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Statistics Page
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor statistics (overview, revenue, top products, demographics).
 * Data changes infrequently, so staleTime is set to 2 minutes.
 */
export function useVendorStats() {
  return useQuery({
    queryKey: queryKeys.vendor.statistics(),
    queryFn: () => vendorService.getVendorStats(),
    staleTime: 2 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor settings (profile, shop, social, hours, etc.).
 * Settings change infrequently → 5 min staleTime.
 * Falls back to mock data if the API call fails (handled in service).
 */
export function useVendorSettings() {
  return useQuery({
    queryKey: queryKeys.vendor.settings(),
    queryFn: () => vendorService.getVendorSettings(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Update store identity (name, type, slug, description).
 * Invalidates settings cache on success.
 */
export function useUpdateIdentity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").UpdateIdentityRequest) =>
      vendorService.updateSettingsIdentity(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Upload store logo.
 * Invalidates settings cache on success so the new logo URL is reflected.
 */
export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => vendorService.uploadLogo(file),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Upload store cover/banner.
 * Invalidates settings cache on success so the new banner URL is reflected.
 */
export function useUploadCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => vendorService.uploadCover(file),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Fetch store categories for the dropdown.
 * Categories are cached for 10 minutes since they rarely change.
 */
export function useStoreCategories() {
  return useQuery({
    queryKey: [...queryKeys.vendor.settings(), "categories"],
    queryFn: () => vendorService.getStoreCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Update store contact info (email, phone, address, socials).
 * Invalidates settings cache on success.
 */
export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").UpdateContactRequest) =>
      vendorService.updateSettingsContact(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Update user profile (firstName, lastName, phone, language, timezone).
 * Invalidates settings cache on success.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./services/settings.service").UpdateProfileRequest) =>
      vendorService.updateSettingsProfile(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Update business hours + social/hours visibility toggles.
 * Invalidates settings cache on success.
 */
export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./services/settings.service").UpdateBusinessHoursRequest) =>
      vendorService.updateSettingsBusinessHours(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Update legal information.
 * Invalidates settings cache on success.
 */
export function useUpdateLegal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").UpdateLegalRequest) =>
      vendorService.updateSettingsLegal(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Update operations (delivery, payment, preferences).
 * Invalidates settings cache on success.
 */
export function useUpdateOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").UpdateOperationsRequest) =>
      vendorService.updateSettingsOperations(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Update notification preferences.
 * Invalidates settings cache on success.
 */
export function useUpdateNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").UpdateNotificationsRequest) =>
      vendorService.updateSettingsNotifications(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Update password.
 * Invalidates settings cache on success.
 */
export function useUpdatePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").UpdatePasswordRequest) =>
      vendorService.updateSettingsPassword(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Enable 2FA via Fortify endpoint.
 * Invalidates settings cache on success.
 */
export function useEnable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => vendorService.enable2FA(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Disable 2FA via Fortify endpoint.
 * Invalidates settings cache on success.
 */
export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => vendorService.disable2FA(password),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Get 2FA QR code for setup.
 */
export function use2FAQrCode(enabled: boolean) {
  return useQuery({
    queryKey: ["2fa", "qr-code"],
    queryFn: () => vendorService.get2FAQrCode(),
    enabled,
    staleTime: 0, // Always refetch
  });
}

/**
 * Hook: Confirm 2FA setup with authenticator code.
 * Invalidates settings cache on success.
 */
export function useConfirm2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { code: string }) => vendorService.confirm2FA(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
      queryClient.invalidateQueries({
        queryKey: ["2fa", "qr-code"],
      });
    },
  });
}

/**
 * Hook: Get 2FA recovery codes.
 */
export function use2FARecoveryCodes(enabled: boolean) {
  return useQuery({
    queryKey: ["2fa", "recovery-codes"],
    queryFn: () => vendorService.get2FARecoveryCodes(),
    enabled,
    staleTime: 0,
  });
}

/**
 * Hook: Regenerate 2FA recovery codes.
 */
export function useRegenerate2FARecoveryCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => vendorService.regenerate2FARecoveryCodes(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["2fa", "recovery-codes"],
      });
    },
  });
}

/**
 * Hook: Toggle two-factor authentication.
 * @deprecated Use useEnable2FA / useDisable2FA instead.
 * Kept for backward compatibility.
 */
export function useToggle2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => vendorService.toggleSettings2FA(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Fetch active sessions.
 */
export function useActiveSessions() {
  return useQuery({
    queryKey: ["settings", "active-sessions"],
    queryFn: () => vendorService.getActiveSessions(),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Revoke a specific session.
 * Invalidates settings and sessions cache on success.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      vendorService.revokeSettingsSession(sessionId),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
      queryClient.invalidateQueries({
        queryKey: ["settings", "active-sessions"],
      });
    },
  });
}

/**
 * Hook: Revoke all other sessions.
 * Invalidates settings and sessions cache on success.
 */
export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => vendorService.revokeOtherSettingsSessions(),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
      queryClient.invalidateQueries({
        queryKey: ["settings", "active-sessions"],
      });
    },
  });
}

/**
 * Hook: Update security alert preferences.
 * Invalidates settings cache on success.
 */
export function useUpdateSecurityAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { suspiciousLoginAlert: boolean }) =>
      vendorService.updateSecurityAlerts(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
    },
  });
}

/**
 * Hook: Fetch login history.
 */
export function useLoginHistory() {
  return useQuery({
    queryKey: ["settings", "login-history"],
    queryFn: () => vendorService.getLoginHistory(),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Fetch invoices.
 */
export function useInvoices() {
  return useQuery({
    queryKey: ["settings", "invoices"],
    queryFn: () => vendorService.getInvoices(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Deactivate vendor account (reversible).
 * Invalidates settings + auth caches.
 */
export function useDeactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: import("./schema").DeactivateAccountRequest) =>
      vendorService.deactivateSettingsAccount(data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.settings(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.session(),
      });
    },
  });
}

/**
 * Hook: Permanently delete vendor account (irreversible).
 * Invalidates everything and redirects to homepage.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: import("./schema").DeleteAccountRequest) =>
      vendorService.deleteSettingsAccount(data),
    onSuccess: () => {
      queryClient.clear();
      router.push("/");
    },
  });
}

// ────────────────────────────────────────────────────────────
// Tickets / Support
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor support tickets (paginated, filterable).
 * Uses keepPreviousData for smooth tab switching without flash.
 */
export function useVendorTickets(filters?: {
  status?: string;
  page?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendor.tickets(filters),
    queryFn: () =>
      vendorService.getVendorTickets(
        filters?.status,
        filters?.page,
        filters?.search,
      ),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook: Single ticket detail.
 * Conditionally enabled only when id is provided.
 */
export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.vendor.ticketDetail(ticketId ?? ""),
    queryFn: () => vendorService.getTicketDetail(ticketId!),
    staleTime: 30 * 1000,
    enabled: !!ticketId,
  });
}

/**
 * Hook: Messages for a ticket (loaded separately from the ticket list).
 * Short staleTime for active conversations.
 */
export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.vendor.ticketMessages(ticketId ?? ""),
    queryFn: () => vendorService.getTicketMessages(ticketId!),
    staleTime: 15 * 1000,
    enabled: !!ticketId,
  });
}

/**
 * Hook: Create a new support ticket.
 * Invalidates the ticket list on success.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: vendorService.createTicket,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.tickets(),
      });
    },
  });
}

/**
 * Hook: Send a message/reply to a ticket.
 * Optimistic update: appends the message to the cache immediately.
 */
export function useSendTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      ticketId: string;
      body: string;
      attachments?: File[];
    }) =>
      vendorService.sendTicketMessage(
        params.ticketId,
        params.body,
        params.attachments,
      ),
    onMutate: async (params) => {
      // Cancel ongoing message queries for this ticket
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.ticketMessages(params.ticketId),
      });

      // Snapshot current messages for rollback
      const previousMessages = queryClient.getQueryData<
        import("./schema").TicketMessage[]
      >(queryKeys.vendor.ticketMessages(params.ticketId));

      // Optimistic: append the new message
      if (previousMessages) {
        const optimisticMessage: import("./schema").TicketMessage = {
          id: `optimistic-${Date.now()}`,
          senderName: "Vous",
          senderRole: "vendor",
          senderInitials: "Vo",
          senderAvatarColor: "bg-amber-100 text-amber-700",
          time: new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          text: params.body,
          attachment: params.attachments?.[0]?.name ?? null,
        };

        queryClient.setQueryData<import("./schema").TicketMessage[]>(
          queryKeys.vendor.ticketMessages(params.ticketId),
          [...previousMessages, optimisticMessage],
        );
      }

      return { previousMessages };
    },
    onError: (_err, params, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.vendor.ticketMessages(params.ticketId),
          context.previousMessages,
        );
      }
    },
    onSettled: (_data, _err, params) => {
      // Refetch messages + ticket list (message count may have changed)
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.ticketMessages(params.ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.tickets(),
      });
    },
  });
}

/**
 * Hook: Close a ticket.
 * Optimistic update: changes status to "resolved" immediately.
 */
export function useCloseTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => vendorService.closeTicket(ticketId),
    onMutate: async (ticketId) => {
      // Cancel ongoing ticket queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor.tickets(),
      });

      // Snapshot for rollback
      const previousQueries = queryClient.getQueriesData<
        import("./schema").VendorTicketsResponse
      >({
        queryKey: queryKeys.vendor.tickets(),
      });

      // Optimistic: change the ticket status to resolved
      queryClient.setQueriesData<import("./schema").VendorTicketsResponse>(
        { queryKey: queryKeys.vendor.tickets() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            tickets: old.tickets.map((t) =>
              t.id === ticketId
                ? { ...t, status: "resolved" as const, statusLabel: "Résolu" }
                : t,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _ticketId, context) => {
      // Rollback
      context?.previousQueries?.forEach(([key, data]) => {
        if (data) queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _err, ticketId) => {
      // Invalidate everything ticket-related
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.tickets(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.ticketDetail(ticketId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendor.ticketMessages(ticketId),
      });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Wallet
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor wallet data (KPIs, chart, transactions, payout info).
 * staleTime 30s for near-realtime balance display.
 */
export function useVendorWallet() {
  return useQuery({
    queryKey: queryKeys.vendor.wallet(),
    queryFn: () => vendorService.getVendorWallet(),
    staleTime: 30_000,
  });
}

/**
 * Hook: Request a payout withdrawal.
 * Invalidates wallet cache on success so balance refreshes.
 */
export function useRequestPayout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (amount: number) => vendorService.requestPayout(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vendor.wallet() });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Wallet — Payout Settings & Withdrawal
// ────────────────────────────────────────────────────────────

/** Hook: Fetch payout settings (payment methods). */
export function usePayoutSettings() {
  return useQuery({
    queryKey: queryKeys.vendor.payoutSettings(),
    queryFn: () => vendorService.getPayoutSettings(),
  });
}

/** Hook: Submit withdrawal request. Invalidates wallet cache on success. */
export function useSubmitWithdrawal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { amount: number; payoutSettingId: string }) =>
      vendorService.submitWithdrawal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vendor.wallet() });
    },
  });
}
