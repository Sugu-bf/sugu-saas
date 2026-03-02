"use client";
import { ErrorState } from "@/components/feedback";

export default function StatsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
      <ErrorState title="Erreur" description={error.message || "Impossible de charger les statistiques."} onRetry={reset} />
    </div>
  );
}
