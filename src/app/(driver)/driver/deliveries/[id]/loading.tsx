// ============================================================
// Driver Delivery Detail — Loading skeleton
// ============================================================

export default function DriverDeliveryDetailLoading() {
  return (
    <div
      className="flex h-full flex-col animate-pulse space-y-4 lg:space-y-5"
      role="status"
      aria-label="Chargement du détail de livraison"
    >
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-5 w-40 rounded-lg bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded-full bg-gray-200" />
          <div className="h-7 w-20 rounded-full bg-gray-200" />
          <div className="h-7 w-16 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Row 1: Security code + Earnings — 2 cols */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="h-8 w-28 rounded-xl bg-gray-200" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-3 w-40 rounded bg-gray-200" />
            <div className="h-10 w-40 rounded bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="flex gap-3">
              <div className="h-6 w-16 rounded-lg bg-gray-100" />
              <div className="h-6 w-16 rounded-lg bg-gray-100" />
              <div className="h-6 w-16 rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Itinerary + Timeline + Client/Actions — 3 cols */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Itinerary skeleton */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-100" />
          </div>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-40 rounded bg-gray-100" />
                  {i < 2 && (
                    <div className="h-16 w-full rounded-xl bg-gray-50" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline skeleton */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-100" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-28 rounded bg-gray-200" />
                  <div className="h-2 w-36 rounded bg-gray-100" />
                </div>
                <div className="h-3 w-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Client + Actions skeleton */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 h-4 w-16 rounded bg-gray-200" />
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200" />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 flex-1 rounded-xl bg-gray-200" />
              <div className="h-10 flex-1 rounded-xl bg-gray-200" />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              <div className="h-11 w-full rounded-xl bg-gray-200" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 rounded-xl bg-gray-100" />
                <div className="h-10 flex-1 rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
