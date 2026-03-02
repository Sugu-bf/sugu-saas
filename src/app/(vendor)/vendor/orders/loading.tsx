/**
 * Loading skeleton for the Orders page.
 * Mirrors: header + tabs + search + table with pagination.
 */
export default function VendorOrdersLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-5"
      role="status"
      aria-label="Chargement des commandes"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        <div className="flex gap-2">
          <div className="h-10 w-32 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-28 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`tab-${i}`}
            className="h-9 w-28 rounded-full bg-white/50 dark:bg-gray-800/50"
          />
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="h-11 flex-1 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
        <div className="h-11 w-24 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden rounded-3xl">
        {/* Header */}
        <div className="border-b border-gray-100/80 px-6 py-3 dark:border-gray-800/50">
          <div className="grid grid-cols-12 gap-3">
            {[1, 2, 2, 2, 1, 1, 1, 1, 1].map((span, i) => (
              <div key={i} className={`col-span-${span}`}>
                <div className="h-3 w-16 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
            ))}
          </div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-gray-100/60 dark:divide-gray-800/40">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="grid grid-cols-12 items-center gap-3 px-6 py-4"
            >
              <div className="col-span-1">
                <div className="h-4 w-4 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-2">
                <div className="h-4 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="h-4 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-2">
                <div className="h-4 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-1">
                <div className="h-4 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-1">
                <div className="h-6 w-20 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-1">
                <div className="h-4 w-16 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-1">
                <div className="h-4 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
              <div className="col-span-1 flex justify-center">
                <div className="h-5 w-5 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
            </div>
          ))}
        </div>
        {/* Pagination skeleton */}
        <div className="flex items-center justify-between border-t border-gray-100/80 px-6 py-4 dark:border-gray-800/50">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-8 rounded-lg bg-gray-200/50 dark:bg-gray-700/50" />
            ))}
          </div>
          <div className="h-4 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        </div>
      </div>

      <span className="sr-only">Chargement des commandes en cours…</span>
    </div>
  );
}
