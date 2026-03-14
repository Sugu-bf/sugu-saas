"use client";

import { ErrorState } from "./error-state";

interface PageErrorConfig {
  title: string;
  description: string;
  logPrefix?: string;
  /** Default: "mx-auto flex max-w-7xl items-center justify-center py-24" */
  wrapperClassName?: string;
}

/**
 * Factory function to generate a Next.js error boundary component.
 *
 * @example
 * ```ts
 * // src/app/(driver)/driver/deliveries/error.tsx
 * "use client";
 * import { createPageError } from "@/components/feedback/create-page-error";
 * export default createPageError({
 *   title: "Impossible de charger les livraisons",
 *   description: "Une erreur est survenue lors du chargement de vos livraisons.",
 *   logPrefix: "[Driver Livraisons]",
 * });
 * ```
 */
export function createPageError(config: PageErrorConfig) {
  return function PageError({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    return (
      <div
        className={
          config.wrapperClassName ??
          "mx-auto flex max-w-7xl items-center justify-center py-24"
        }
      >
        <ErrorState
          title={config.title}
          description={error.message || config.description}
          onRetry={reset}
          error={error}
          logPrefix={config.logPrefix}
        />
      </div>
    );
  };
}
