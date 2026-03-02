export default function TicketsLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Chargement du support">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-9 w-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex gap-4">
        {/* List skeleton */}
        <div className="w-80 flex-shrink-0 rounded-2xl border border-gray-100 bg-white p-4 space-y-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="h-9 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (<div key={i} className="h-6 w-16 rounded-lg bg-gray-100 dark:bg-gray-800" />))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 mb-1" />
              <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
        {/* Chat skeleton */}
        <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" style={{ height: 500 }}>
          <div className="h-5 w-64 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-1.5" />
                  <div className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
