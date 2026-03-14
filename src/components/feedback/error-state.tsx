"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  /** The caught error object — used for logging. */
  error?: Error & { digest?: string };
  /** Prefix for console.error logging, e.g. "[Driver Livraisons]". */
  logPrefix?: string;
}

/**
 * Error state component for failed data fetching or processing.
 * Optionally logs the error to console when `logPrefix` is provided.
 */
export function ErrorState({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données. Veuillez réessayer.",
  onRetry,
  className,
  error,
  logPrefix,
}: ErrorStateProps) {
  useEffect(() => {
    if (logPrefix && error) {
      console.error(`${logPrefix} page error:`, error);
    }
  }, [logPrefix, error]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 px-6 py-16 text-center dark:border-red-900/40 dark:bg-red-950/20",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-red-600 dark:text-red-400">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}
