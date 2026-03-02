"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function InventoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl py-12">
      <ErrorState
        title="Impossible de charger l'inventaire"
        description="Une erreur est survenue lors du chargement des données de stock. Veuillez réessayer."
        onRetry={reset}
      />
    </div>
  );
}
