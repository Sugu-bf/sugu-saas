/**
 * Loading skeleton for the Withdrawal wizard.
 * Mirrors: back link, title, step indicator, form area.
 */
export default function WithdrawLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-5"
      role="status"
      aria-label="Chargement du formulaire de retrait"
    >
      {/* Back link */}
      <div className="h-5 w-44 rounded bg-gray-200/50" />

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gray-200/50" />
        <div>
          <div className="h-7 w-48 rounded-xl bg-white/50" />
          <div className="mt-2 h-4 w-64 rounded-lg bg-white/40" />
        </div>
      </div>

      {/* Step indicator */}
      <div className="mx-auto flex max-w-md items-center justify-between px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 rounded-full bg-gray-200/50" />
              <div className="h-3 w-14 rounded bg-gray-200/40" />
            </div>
            {i < 2 && (
              <div className="mx-3 h-0.5 flex-1 rounded bg-gray-200/50" />
            )}
          </div>
        ))}
      </div>

      {/* Form area (2 columns) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="glass-card space-y-4 rounded-3xl p-6">
            <div className="h-6 w-56 rounded bg-gray-200/50" />
            <div className="h-4 w-40 rounded bg-gray-200/40" />
            <div className="h-16 w-full rounded-xl bg-gray-200/30" />
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-20 rounded-xl bg-gray-200/50"
                />
              ))}
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200/40" />
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="glass-card space-y-3 rounded-3xl p-5">
            <div className="h-5 w-36 rounded bg-gray-200/50" />
            <div className="h-10 w-40 rounded bg-gray-200/50" />
            <div className="h-px w-full bg-gray-200/40" />
            <div className="h-4 w-full rounded bg-gray-200/40" />
            <div className="h-4 w-full rounded bg-gray-200/40" />
            <div className="h-px w-full bg-gray-200/40" />
            <div className="h-5 w-32 rounded bg-gray-200/50" />
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-10 w-28 rounded-xl bg-gray-200/50" />
        <div className="h-10 w-32 rounded-xl bg-gray-200/50" />
      </div>

      <span className="sr-only">
        Chargement du formulaire de retrait...
      </span>
    </div>
  );
}
