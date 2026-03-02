import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  className?: string;
}

/**
 * Full page skeleton loader.
 */
export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-6 p-6", className)} role="status" aria-label="Chargement">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Stat card skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}

/**
 * Card skeleton used inside stat grids
 */
export function CardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      role="status"
    >
      <div className="mb-3 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

/**
 * Sidebar skeleton
 */
export function SidebarSkeleton() {
  return (
    <div className="h-full animate-pulse space-y-3 p-4" role="status">
      <div className="mb-6 h-8 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
      <span className="sr-only">Chargement du menu…</span>
    </div>
  );
}
