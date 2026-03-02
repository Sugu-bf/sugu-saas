export default function OrderDetailLoading() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse space-y-5" role="status">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-white/50 dark:bg-gray-800/50" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-56 rounded-xl bg-white/50 dark:bg-gray-800/50" />
            <div className="h-6 w-24 rounded-full bg-white/50 dark:bg-gray-800/50" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-36 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-5">
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-2 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
          </div>
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="h-6 w-44 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
          </div>
        </div>
        {/* Middle */}
        <div className="space-y-5">
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-5 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            </div>
            <div className="h-4 w-40 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="h-4 w-36 rounded bg-gray-200/40 dark:bg-gray-700/40" />
          </div>
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="h-6 w-44 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
            <div className="h-8 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          </div>
        </div>
        {/* Right */}
        <div className="space-y-5">
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-28 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
            <div className="h-16 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
          </div>
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="h-6 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-12 rounded-2xl bg-sugu-200/30" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement…</span>
    </div>
  );
}
