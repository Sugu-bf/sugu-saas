"use client";

import { useVendorInventory } from "@/features/vendor/hooks";
import { InventoryContent } from "./inventory-content";
import { InventorySkeleton } from "./_components/inventory-skeleton";
import { ErrorState } from "@/components/feedback/error-state";

/**
 * Client-side page shell for /vendor/inventory.
 * Manages loading, error, and success states via React Query.
 */
export function InventoryPageClient() {
  const { data, isLoading, isError, error, refetch } = useVendorInventory();

  if (isLoading) return <InventorySkeleton />;

  if (isError) {
    return (
      <div className="mx-auto max-w-[1440px]">
        <ErrorState
          title="Impossible de charger l'inventaire"
          description={
            error?.message ??
            "Une erreur est survenue lors du chargement des données d'inventaire."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return <InventoryContent data={data} />;
}
