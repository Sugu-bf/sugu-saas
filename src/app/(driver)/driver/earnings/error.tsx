"use client";

import { ErrorState } from "@/components/feedback";

export default function DriverEarningsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState
        title="Erreur des gains"
        description={
          error.message ||
          "Une erreur est survenue lors du chargement de vos gains."
        }
        onRetry={reset}
      />
    </div>
  );
}
