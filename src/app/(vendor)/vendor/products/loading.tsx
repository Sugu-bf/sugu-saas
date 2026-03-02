/**
 * Loading skeleton for the Products page.
 * Shows: header + tabs + search + 8 grid cards.
 */
export default function VendorProductsLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-5"
      role="status"
      aria-label="Chargement des produits"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        <div className="flex gap-2">
          <div className="h-10 w-40 rounded-xl bg-sugu-200/30" />
          <div className="h-10 w-28 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-24 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-white/50 dark:bg-gray-800/50" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-48 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-20 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4">
            <div className="mb-3 h-36 rounded-xl bg-gray-200/40 dark:bg-gray-700/30" />
            <div className="h-4 w-3/4 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="mt-2 h-5 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="mt-2 flex gap-4">
              <div className="h-3 w-20 rounded bg-gray-200/40 dark:bg-gray-700/40" />
              <div className="h-3 w-20 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            </div>
            <div className="mt-2 flex justify-between">
              <div className="h-4 w-16 rounded bg-gray-200/40 dark:bg-gray-700/40" />
              <div className="h-5 w-14 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-8 rounded-lg bg-gray-200/50 dark:bg-gray-700/50" />
          ))}
        </div>
      </div>

      <span className="sr-only">Chargement des produits en cours…</span>
    </div>
  );
}
