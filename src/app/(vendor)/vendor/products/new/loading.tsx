/**
 * Loading skeleton for the Create Product page.
 */
export default function CreateProductLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-5"
      role="status"
      aria-label="Chargement du formulaire"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 rounded bg-white/50 dark:bg-gray-800/50" />
        <div className="flex gap-2">
          <div className="h-10 w-40 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-24 rounded-xl bg-sugu-200/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Left */}
        <div className="space-y-5 lg:col-span-3">
          {/* Informations */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="h-6 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-12 w-full rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="h-28 w-full rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
              <div className="h-12 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
            </div>
          </div>
          {/* Photos */}
          <div className="glass-card rounded-3xl p-6">
            <div className="h-6 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="mt-4 grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
              ))}
            </div>
          </div>
          {/* Prix */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="h-6 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
              ))}
            </div>
          </div>
        </div>
        {/* Right */}
        <div className="space-y-5 lg:col-span-2">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="h-6 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-16 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
              ))}
            </div>
          </div>
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="h-6 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            ))}
          </div>
          <div className="glass-card rounded-3xl p-6">
            <div className="h-6 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="mt-4 h-64 rounded-2xl bg-gray-200/40 dark:bg-gray-700/40" />
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement du formulaire…</span>
    </div>
  );
}
