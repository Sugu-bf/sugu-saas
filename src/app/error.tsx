"use client";

import { ErrorState } from "@/components/feedback";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Erreur inattendue"
        description="Quelque chose s'est mal passé. Veuillez réessayer."
        onRetry={reset}
      />
    </div>
  );
}
