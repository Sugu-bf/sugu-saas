// ============================================================
// Driver Settings — Loading skeleton (matches settings page layout)
// ============================================================

export default function DriverSettingsLoading() {
  return (
    <div
      className="mx-auto max-w-[1440px] space-y-6 pb-20"
      role="status"
      aria-label="Chargement des paramètres"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <div className="glass-card space-y-2 rounded-2xl p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        </div>
        <div className="space-y-6 xl:col-span-9">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl p-6">
              <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-6 space-y-4">
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement en cours...</span>
    </div>
  );
}
