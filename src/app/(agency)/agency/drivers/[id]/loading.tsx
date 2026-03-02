// ============================================================
// Driver Profile — Loading skeleton
// ============================================================

export default function DriverProfileLoading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Chargement du profil livreur">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="h-6 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-9 w-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-5">
          <div className="h-28 w-28 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="flex gap-2 mt-3">
              <div className="h-8 w-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-8 w-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-3 flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="mt-2 h-6 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4-column middle */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 3-column bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900" style={{ height: 200 }}>
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex justify-between items-center">
          <div className="h-4 w-48 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="flex gap-2">
            {[80, 96, 108, 120, 72].map((w, i) => (
              <div key={i} className="h-9 rounded-xl bg-gray-100 dark:bg-gray-800" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
