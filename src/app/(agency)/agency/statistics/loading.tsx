export default function StatisticsLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Chargement des statistiques">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      {/* KPIs + Driver of month */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="mt-2 h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-4 h-48 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="mt-3 h-3 w-64 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        {/* Driver of month skeleton */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto h-16 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <div className="mx-auto h-9 w-28 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" style={{ height: 220 }}>
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                  <div className="flex-1 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-8 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
