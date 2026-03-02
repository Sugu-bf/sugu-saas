/**
 * Loading skeleton for the Create Delivery page.
 */
export default function CreateDeliveryLoading() {
  return (
    <div
      className="mx-auto max-w-4xl animate-pulse space-y-5"
      role="status"
      aria-label="Chargement du formulaire"
    >
      {/* Breadcrumb */}
      <div className="h-5 w-56 rounded bg-white/50 dark:bg-gray-800/50" />

      {/* Stepper skeleton: 4 circles + connector lines */}
      <div className="flex items-start justify-between px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-9 w-9 rounded-full bg-gray-200/60 dark:bg-gray-700/50" />
              <div className="h-3 w-16 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            </div>
            {i < 3 && (
              <div className="mx-3 mt-[18px] h-0.5 flex-1 rounded-full bg-gray-200/40 dark:bg-gray-700/40" />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-200/40 dark:bg-gray-700/40" />

      {/* Main card skeleton */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-3 w-64 rounded bg-gray-200/30 dark:bg-gray-700/30" />
          </div>
        </div>

        {/* Toggle */}
        <div className="h-10 w-72 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />

        {/* Input fields */}
        <div className="h-12 w-full rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-12 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
          <div className="h-12 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
        </div>

        {/* Pills */}
        <div className="flex gap-3">
          <div className="h-10 w-24 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
          <div className="h-10 w-28 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
        </div>

        {/* Textarea */}
        <div className="h-20 w-full rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-10 w-24 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
        <div className="h-4 w-28 rounded bg-gray-200/30 dark:bg-gray-700/30" />
        <div className="h-10 w-28 rounded-xl bg-sugu-200/30" />
      </div>

      <span className="sr-only">Chargement du formulaire…</span>
    </div>
  );
}
