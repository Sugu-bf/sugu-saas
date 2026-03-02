export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse space-y-5" role="status">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-white/50 dark:bg-gray-800/50" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 rounded-xl bg-white/50 dark:bg-gray-800/50" />
            <div className="h-6 w-16 rounded-full bg-green-100/50 dark:bg-green-900/30" />
            <div className="h-6 w-20 rounded-full bg-sugu-100/50" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-28 rounded-xl bg-sugu-200/50" />
          <div className="h-10 w-10 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* Top section: Photos + Info + KPIs/Variants/Reviews */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Photos */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="h-5 w-16 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="aspect-square rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 w-14 rounded-lg bg-gray-200/30 dark:bg-gray-700/30" />
              ))}
            </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="lg:col-span-5">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="h-4 w-40 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-8 w-72 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-4 w-32 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="h-4 w-20 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="h-8 w-44 rounded bg-sugu-100/50" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-48 rounded bg-gray-200/30 dark:bg-gray-700/30" />
              ))}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-gray-200/30 dark:bg-gray-700/30" />
              ))}
            </div>
          </div>
        </div>

        {/* Right column: KPIs + Variants + Reviews */}
        <div className="lg:col-span-4 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 space-y-2">
                <div className="h-4 w-14 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="h-8 w-12 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="h-3 w-20 rounded bg-gray-200/30 dark:bg-gray-700/30" />
              </div>
            ))}
          </div>
          {/* Variants summary */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="h-5 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
          </div>
          {/* Reviews summary */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="h-5 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-8 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
            <div className="h-5 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-32 rounded-xl bg-gray-200/20 dark:bg-gray-700/20" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-8 rounded bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
          </div>
        ))}
      </div>

      {/* History */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="h-5 w-56 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-gray-200/30 dark:bg-gray-700/30" />
        ))}
      </div>

      {/* Bottom bar */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-40 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="h-5 w-16 rounded-full bg-green-100/50" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
          <div className="h-10 w-24 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
          <div className="h-10 w-36 rounded-xl bg-sugu-200/40" />
        </div>
      </div>

      <span className="sr-only">Chargement…</span>
    </div>
  );
}
