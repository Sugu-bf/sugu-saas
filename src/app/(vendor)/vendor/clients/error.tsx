"use client";

import { ErrorState } from "@/components/feedback";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
      <ErrorState
        title="Erreur de chargement"
        description={error.message || "Impossible de charger les clients."}
        onRetry={reset}
      />
    </div>
  );
}
