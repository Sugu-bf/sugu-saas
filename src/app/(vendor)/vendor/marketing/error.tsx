"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface MarketingErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketingError({ error, reset }: MarketingErrorProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[Marketing] page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Impossible de charger Marketing
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Une erreur est survenue lors du chargement de vos données marketing.
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sugu-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500"
      >
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </button>
    </div>
  );
}
