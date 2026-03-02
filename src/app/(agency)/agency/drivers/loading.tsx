// ============================================================
// Drivers page — Loading skeleton
// ============================================================

export default function DriversLoading() {
  return (
    <div className="flex h-full animate-pulse gap-4" role="status" aria-label="Chargement des livreurs">
      {/* Main column */}
      <div className="flex flex-1 flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-9 w-44 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-1 h-2 w-28 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-2">
          {[80, 96, 96, 96].map((w, i) => (
            <div key={i} className="h-8 rounded-xl bg-gray-100 dark:bg-gray-800" style={{ width: w }} />
          ))}
          <div className="ml-auto h-9 w-48 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Driver cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-1 h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="mt-2 h-5 w-14 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="mt-3 flex gap-4">
                <div className="h-5 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-5 w-8 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="mt-3 flex gap-1.5">
                <div className="h-4 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
          <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Detail panel skeleton */}
      <div className="hidden w-[360px] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900 lg:block">
        <div className="flex flex-col items-center border-b border-gray-100 p-5 dark:border-gray-800">
          <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="mt-3 h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-1 h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="space-y-4 p-4">
          {[80, 100, 90, 80].map((h, i) => (
            <div key={i} className="rounded-xl bg-gray-50 dark:bg-gray-800/50" style={{ height: h }} />
          ))}
        </div>
        <div className="space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
