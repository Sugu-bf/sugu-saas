"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl py-12">
      <ErrorState
        title="Impossible de charger les paramètres"
        description="Une erreur est survenue lors du chargement de vos paramètres. Veuillez réessayer."
        onRetry={reset}
      />
    </div>
  );
}
