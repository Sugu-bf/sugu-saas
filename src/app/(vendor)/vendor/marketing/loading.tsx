// ============================================================
// Marketing page — Loading skeleton
// Shown during Next.js Suspense while page.tsx resolves.
// ============================================================

export default function MarketingLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse space-y-6" role="status" aria-label="Chargement de la page Marketing">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-44 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3 h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-2 w-32 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>

      {/* Promo codes section */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-32 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
        {/* Table rows */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-2.5 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-14 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="ml-auto flex gap-2">
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-5 w-9 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products section */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-36 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
              <div className="mb-3 h-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-5 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Premium banner */}
      <div className="h-28 rounded-3xl bg-gray-200 dark:bg-gray-800" />

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
