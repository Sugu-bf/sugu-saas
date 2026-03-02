export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Chargement des paramètres">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="flex gap-3">
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-36 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left nav skeleton */}
        <div className="xl:col-span-2">
          <div className="space-y-1 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        </div>

        {/* Center form skeleton */}
        <div className="xl:col-span-6">
          <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-6 w-52 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar skeleton */}
        <div className="space-y-4 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mt-4 flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 flex-1 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="mt-3 flex items-center gap-3">
                <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement des paramètres en cours…</span>
    </div>
  );
}
