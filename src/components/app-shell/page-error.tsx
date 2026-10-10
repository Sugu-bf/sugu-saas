"use client";

import { ErrorState } from "@/design-system";

export interface ShellPageErrorProps {
  /** `reset` from the Next error boundary: re-renders the page. */
  reset: () => void;
}

/**
 * What the shell shows when a page throws while rendering. The frame and
 * the navigation stay usable; the error itself is not displayed.
 */
export function ShellPageError({ reset }: ShellPageErrorProps) {
  return (
    <div className="sugu-ui rounded-panel border border-border bg-surface">
      <ErrorState
        title="Cette page a rencontré un problème"
        description="Le reste de votre espace fonctionne. Réessayez, ou revenez-y dans un instant."
        onRetry={reset}
      />
    </div>
  );
}
