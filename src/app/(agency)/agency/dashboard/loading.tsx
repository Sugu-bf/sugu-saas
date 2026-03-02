/**
 * Loading skeleton for the Agency Dashboard.
 * Mirrors: header + 4 KPI cards + map/deliveries + performance/complaints.
 */
export default function AgencyDashboardLoading() {
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
          <div className="h-7 w-52 rounded-xl bg-white/50 dark:bg-gray-800/50" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-36 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-5 space-y-3">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card h-80 rounded-3xl bg-gray-200/20 dark:bg-gray-700/20" />
        <div className="glass-card rounded-3xl p-6 space-y-3">
          <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-3xl p-6 space-y-3">
          <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-3 flex-1 rounded-full bg-gray-200/40 dark:bg-gray-700/40" />
              <div className="h-4 w-10 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            </div>
          ))}
        </div>
        <div className="glass-card rounded-3xl p-6 space-y-3">
          <div className="h-6 w-44 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
          ))}
        </div>
      </div>

      <span className="sr-only">Chargement du dashboard en cours…</span>
    </div>
  );
}
