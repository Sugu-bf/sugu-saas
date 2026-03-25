"use client";

import { use } from "react";
import { useVendorProductDetail } from "@/features/vendor/hooks";
import { ProductDetailContent } from "./product-detail-content";
import { ErrorState } from "@/components/feedback";

/**
 * Product detail page — client component with React Query.
 * Uses the useVendorProductDetail hook to fetch real API data.
 */
export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <ProductDetailInner id={id} />;
}

function ProductDetailInner({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } =
    useVendorProductDetail(id);

  if (isLoading) {
    return (
      <div
        className="mx-auto max-w-[1400px] animate-pulse space-y-5"
        role="status"
        aria-label="Chargement du produit"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-8 w-64 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-36 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-10 w-24 rounded-xl bg-sugu-200/30" />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Photos skeleton */}
          <div className="lg:col-span-3">
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="aspect-square rounded-xl bg-gray-200/40 dark:bg-gray-700/30" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 w-14 rounded-lg bg-gray-200/40 dark:bg-gray-700/30"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main info skeleton */}
          <div className="lg:col-span-5">
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="h-4 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-7 w-48 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-5 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-8 w-40 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 w-full rounded bg-gray-200/40 dark:bg-gray-700/40"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="lg:col-span-4 space-y-4">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-3.5 space-y-2"
                >
                  <div className="h-4 w-12 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                  <div className="h-7 w-16 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                  <div className="h-3 w-20 rounded bg-gray-200/40 dark:bg-gray-700/40" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="glass-card rounded-2xl p-5 h-40 bg-gray-100/30 dark:bg-gray-800/20" />
              <div className="glass-card rounded-2xl p-5 h-40 bg-gray-100/30 dark:bg-gray-800/20" />
            </div>
          </div>
        </div>

        {/* Bottom row skeleton */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 mt-5">
          <div className="lg:col-span-3 glass-card rounded-2xl p-4 h-64 bg-gray-100/30 dark:bg-gray-800/20" />
          <div className="lg:col-span-5 glass-card rounded-2xl p-6 h-64 bg-gray-100/30 dark:bg-gray-800/20" />
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 h-64 bg-gray-100/30 dark:bg-gray-800/20" />
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 h-64 bg-gray-100/30 dark:bg-gray-800/20" />
        </div>

        <span className="sr-only">
          Chargement du produit en cours…
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex max-w-[1400px] items-center justify-center py-24">
        <ErrorState
          title="Erreur de chargement"
          description={
            error?.message ||
            "Impossible de charger le produit. Veuillez réessayer."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return <ProductDetailContent data={data} />;
}
