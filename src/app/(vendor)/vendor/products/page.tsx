"use client";

import { useState } from "react";
import { useVendorProducts } from "@/features/vendor/hooks";
import { ProductsContent } from "./products-content";
import VendorProductsLoading from "./loading";
import { ErrorState } from "@/components/feedback";

export default function VendorProductsPage() {
  const [filters, setFilters] = useState<{
    status?: string;
    page?: number;
    search?: string;
  }>({});

  const { data, isLoading, isError, error, refetch } =
    useVendorProducts(filters);

  if (isLoading) return <VendorProductsLoading />;

  if (isError) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
        <ErrorState
          title="Erreur de chargement"
          description={
            error?.message ||
            "Impossible de charger les produits. Veuillez réessayer."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <ProductsContent
      data={data}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}
