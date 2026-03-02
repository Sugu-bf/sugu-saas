// ============================================================
// Deliveries page — Loading skeleton
// ============================================================

export default function DeliveriesLoading() {
  return (
    <div className="flex h-full animate-pulse gap-4" role="status" aria-label="Chargement des livraisons">
      {/* Main column */}
      <div className="flex flex-1 flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="flex gap-2">
            <div className="h-9 w-44 rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-28 rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-1 h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-14 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex gap-2">
          {[72, 88, 96, 80, 80, 88].map((w, i) => (
            <div key={i} className={`h-8 w-${w} rounded-xl bg-gray-100 dark:bg-gray-800`} style={{ width: w + 16 }} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-28 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Header row */}
          <div className="flex gap-4 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            {[32, 64, 96, 80, 96, 64, 80, 56].map((w, i) => (
              <div key={i} className="h-3 rounded bg-gray-100 dark:bg-gray-800" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-gray-50 px-4 py-3.5 dark:border-gray-800/60">
              <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="ml-auto flex gap-1">
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel skeleton */}
      <div className="hidden w-[340px] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 lg:block">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          {[80, 120, 140, 100, 120].map((h, i) => (
            <div key={i} className="rounded-xl bg-gray-50 dark:bg-gray-800/50" style={{ height: h }} />
          ))}
        </div>
        <div className="space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
