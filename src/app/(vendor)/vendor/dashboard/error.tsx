"use client";

import { ErrorState } from "@/components/feedback";

export default function VendorDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState
        title="Erreur du tableau de bord"
        description={error.message || "Impossible de charger le tableau de bord. Veuillez réessayer."}
        onRetry={reset}
      />
    </div>
  );
}
