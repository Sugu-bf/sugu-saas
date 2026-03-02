export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Chargement des paramètres">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="flex gap-2">
          <div className="h-4 w-40 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="hidden lg:flex lg:w-52 flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {[180, 140, 160].map((h, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" style={{ height: h }}>
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[200, 150].map((h, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" style={{ height: h }}>
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
