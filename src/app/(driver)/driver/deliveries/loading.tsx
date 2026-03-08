// ============================================================
// Driver Deliveries — Loading skeleton
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
        <div className="flex items-center gap-3">
          <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-6 w-20 rounded-full bg-green-100 dark:bg-green-950/30" />
        </div>

        {/* KPI Summary Bar */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-around">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-6 w-10 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-14 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2">
          {[72, 88, 80, 80, 72].map((w, i) => (
            <div
              key={i}
              className="h-8 rounded-xl bg-gray-100 dark:bg-gray-800"
              style={{ width: w + 16 }}
            />
          ))}
        </div>

        {/* Search */}
        <div className="h-10 w-full rounded-xl bg-gray-100 dark:bg-gray-800" />

        {/* Delivery Cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-l-4 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 mt-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-1 h-2 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 mt-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-1 h-2 w-36 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel skeleton */}
      <div className="hidden w-[380px] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 lg:block">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          {[100, 130, 80, 120, 90].map((h, i) => (
            <div
              key={i}
              className="rounded-xl bg-gray-50 dark:bg-gray-800/50"
              style={{ height: h }}
            />
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
