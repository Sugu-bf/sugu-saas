/**
 * Loading skeleton for the Driver Dashboard.
 * Mirrors: header + 4 KPI cards + current delivery + queue + chart + activity.
 */
export default function DriverDashboardLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-6"
      role="status"
      aria-label="Chargement du dashboard"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-sugu-200/30" />
          <div className="space-y-1.5">
            <div className="h-6 w-48 rounded-xl bg-white/50 dark:bg-gray-800/50" />
            <div className="h-3 w-36 rounded bg-white/30 dark:bg-gray-800/30" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-20 rounded-2xl bg-green-100/30" />
          <div className="h-10 w-10 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card space-y-3 rounded-3xl p-5">
            <div className="flex justify-between">
              <div className="h-10 w-10 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-10 w-10 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
            </div>
            <div className="h-3 w-24 rounded bg-gray-200/40 dark:bg-gray-700/40" />
            <div className="h-7 w-20 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Current delivery */}
        <div className="glass-card space-y-4 rounded-3xl p-6 lg:col-span-3">
          <div className="flex justify-between">
            <div className="h-6 w-40 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="h-6 w-16 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
          </div>
          <div className="h-32 rounded-xl bg-gray-200/20 dark:bg-gray-700/20" />
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
            <div className="h-9 w-28 rounded-xl bg-green-200/30" />
            <div className="h-9 w-24 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
          </div>
        </div>
        {/* Queue */}
        <div className="glass-card space-y-3 rounded-3xl p-6 lg:col-span-2">
          <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-gray-200/30 dark:bg-gray-700/30"
            />
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Earnings chart */}
        <div className="glass-card space-y-3 rounded-3xl p-6">
          <div className="flex justify-between">
            <div className="h-6 w-40 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="flex gap-1">
              <div className="h-7 w-10 rounded-lg bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-7 w-10 rounded-lg bg-gray-200/50 dark:bg-gray-700/50" />
            </div>
          </div>
          <div className="h-40 rounded-xl bg-gray-200/20 dark:bg-gray-700/20" />
          <div className="h-12 rounded-xl bg-gray-200/20 dark:bg-gray-700/20" />
        </div>
        {/* Activity timeline */}
        <div className="glass-card space-y-3 rounded-3xl p-6">
          <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 rounded bg-gray-200/40 dark:bg-gray-700/40" />
                <div className="h-3 w-32 rounded bg-gray-200/30 dark:bg-gray-700/30" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Chargement du dashboard en cours…</span>
    </div>
  );
}
