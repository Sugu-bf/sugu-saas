export default function EditProductLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="h-3 w-3 rounded bg-gray-200/40 dark:bg-gray-700/40" />
        <div className="h-4 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="h-3 w-3 rounded bg-gray-200/40 dark:bg-gray-700/40" />
        <div className="h-4 w-16 rounded bg-gray-200/50 dark:bg-gray-700/50" />
      </div>

      {/* Page header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="space-y-1.5">
          <div className="h-5 w-40 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="h-3 w-64 rounded bg-gray-200/40 dark:bg-gray-700/40" />
        </div>
      </div>

      {/* Step indicator skeleton */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
            {i < 3 && (
              <div className="h-px flex-1 bg-gray-200/50 dark:bg-gray-700/50" />
            )}
          </div>
        ))}
      </div>

      {/* Form card skeleton */}
      <div className="glass-card rounded-3xl p-8 space-y-5">
        <div className="h-6 w-48 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="h-12 w-full rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
          </div>
        ))}
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-gray-200/40 dark:bg-gray-700/40" />
          <div className="h-28 w-full rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="flex justify-between pb-4">
        <div className="h-10 w-24 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="h-10 w-48 rounded-xl bg-sugu-200/30 dark:bg-sugu-900/20" />
      </div>

      <span className="sr-only">Chargement du formulaire de modification…</span>
    </div>
  );
}
