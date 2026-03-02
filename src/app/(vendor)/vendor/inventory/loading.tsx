export default function InventoryLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Chargement de l'inventaire">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-28 rounded-full bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-36 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-36 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      {/* KPI card skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Main content + sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Table skeleton */}
        <div className="xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 p-5 dark:border-gray-800">
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 flex gap-3">
                <div className="h-9 w-48 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-9 w-28 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-9 w-28 rounded-xl bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-4 xl:col-span-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-3 h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="mt-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-2 w-36 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Chargement de l&apos;inventaire en cours…</span>
    </div>
  );
}
