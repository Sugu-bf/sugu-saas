// ============================================================
// Driver Deliveries — Loading skeleton (matches redesigned page)
// ============================================================

export default function DriverDeliveriesLoading() {
  return (
    <div
      className="flex h-full animate-pulse gap-4"
      role="status"
      aria-label="Chargement des livraisons"
    >
      {/* Main column */}
      <div className="flex flex-1 flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="h-7 w-44 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-6 w-20 rounded-full bg-green-100/80 dark:bg-green-950/30" />
        </div>

        {/* KPI Summary Row */}
        <div className="glass-card rounded-2xl p-3">
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-6 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-2 w-12 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5">
          {[76, 92, 84, 84, 76].map((w, i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800"
              style={{ width: w + 16 }}
            />
          ))}
        </div>

        {/* Search */}
        <div className="h-11 w-full rounded-2xl bg-gray-100 dark:bg-gray-800" />

        {/* Delivery Cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card rounded-2xl border-l-[3px] border-gray-200 dark:border-gray-700 p-4"
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            {/* Itinerary */}
            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2.5">
                <div className="h-2.5 w-2.5 mt-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-1 h-2.5 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-2.5 w-2.5 mt-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-1 h-2.5 w-36 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
            {/* Info chips */}
            <div className="flex gap-1.5">
              <div className="h-5 w-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-14 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <div className="h-5 w-20 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel skeleton */}
      <div className="hidden w-[400px] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100/60 bg-white dark:border-gray-800/60 dark:bg-gray-900 lg:block">
        <div className="border-b border-gray-100/60 dark:border-gray-800/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="space-y-4 p-5">
          {[110, 140, 90, 100].map((h, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-lg bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div
                className="rounded-2xl bg-gray-50 dark:bg-gray-800/50"
                style={{ height: h }}
              />
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-gray-100/60 dark:border-gray-800/60 p-4">
          <div className="h-12 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-2xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-10 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
