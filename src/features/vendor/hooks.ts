"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as vendorService from "./service";
import { useRouter } from "next/navigation";
import type { ProductMutationFormData } from "./services/product-mutation-contract";

// ────────────────────────────────────────────────────────────
// Products List
// ────────────────────────────────────────────────────────────

/**
 * Hook: Vendor products (paginated, filterable).
 * Uses keepPreviousData for smooth pagination without flash.
 */
export function useVendorProducts(filters?: { status?: string; page?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.vendor.products(filters),
    queryFn: () => vendorService.getVendorProducts(filters?.status, filters?.page, filters?.search),
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

      const previousProducts = queryClient.getQueriesData<
        import("./schema").VendorProductsResponse
      >({
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
// Product picker
// ────────────────────────────────────────────────────────────

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

export function useImageProcessingCapabilities() {
  return useQuery({
    queryKey: queryKeys.vendor.imageProcessingCapabilities(),
    queryFn: () => vendorService.getImageProcessingCapabilities(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useBackgroundRemovalPreview() {
  return useMutation({
    mutationFn: (params: {
      file?: File;
      productId?: string;
      mediaId?: string | number;
      storeId?: string;
    }) => vendorService.previewProductBackgroundRemoval(params),
    retry: 0,
  });
}

export function useAcceptBackgroundRemovalPreview() {
  return useMutation({
    mutationFn: (params: { previewId: string; productId: string; makeMain?: boolean }) =>
      vendorService.acceptProductBackgroundRemoval(params),
    retry: 0,
  });
}

export function useCancelBackgroundRemovalPreview() {
  return useMutation({
    mutationFn: (previewId: string) => vendorService.cancelProductBackgroundRemoval(previewId),
    retry: 0,
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
      formData: ProductMutationFormData;
      categoryIds?: string[];
      images?: File[];
      previewIds?: string[];
      backgroundRemovalPreviewIds?: string[];
      backgroundRemovalMainPreviewId?: string;
    }) =>
      vendorService.createVendorProduct(
        params.formData,
        params.categoryIds,
        params.images,
        params.previewIds,
        params.backgroundRemovalPreviewIds,
        params.backgroundRemovalMainPreviewId,
      ),
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
      formData: ProductMutationFormData;
      categoryIds?: string[];
      newImages?: File[];
      removeMediaIds?: (string | number)[];
      previewIds?: string[];
      mainMediaId?: string | number | null;
      backgroundRemovalPreviewIds?: string[];
      backgroundRemovalMainPreviewId?: string;
    }) =>
      vendorService.updateVendorProduct(
        params.id,
        params.formData,
        params.categoryIds,
        params.newImages,
        params.removeMediaIds,
        params.previewIds,
        params.mainMediaId,
        params.backgroundRemovalPreviewIds,
        params.backgroundRemovalMainPreviewId,
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
      const previousData = queryClient.getQueriesData<import("./schema").VendorInventoryResponse>({
        queryKey: queryKeys.vendor.inventory(),
      });

      // Optimistic: increment stock for the product
      queryClient.setQueriesData<import("./schema").VendorInventoryResponse>(
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
                    stockPercent: Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(((p.stockCurrent + params.quantity) / p.stockMax) * 100),
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
// Settings
// ────────────────────────────────────────────────────────────

