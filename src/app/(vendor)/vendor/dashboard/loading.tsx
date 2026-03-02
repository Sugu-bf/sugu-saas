/**
 * Loading skeleton for the Premium Vendor Dashboard.
 * Mirrors: header, 4 KPI cards, chart + orders, top products + stock alerts.
 */
export default function VendorDashboardLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-6"
      role="status"
      aria-label="Chargement du tableau de bord"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 rounded-xl bg-white/50 dark:bg-gray-800/50" />
          <div className="mt-2 h-4 w-32 rounded-lg bg-white/40 dark:bg-gray-800/40" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-48 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-10 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
          <div className="h-10 w-10 rounded-2xl bg-white/50 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`kpi-${i}`}
            className="glass-card rounded-3xl p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
              <div className="h-5 w-14 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
            </div>
            <div className="mt-3 h-3 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
            <div className="mt-2 h-8 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chart */}
        <div className="glass-card rounded-3xl p-6">
          <div className="h-6 w-36 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="mt-4 h-40 rounded-xl bg-gray-200/30 dark:bg-gray-700/30" />
        </div>

        {/* Orders */}
        <div className="glass-card rounded-3xl p-6">
          <div className="h-6 w-44 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="mt-4 space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`ord-${i}`}
                className="flex items-center gap-3 px-2 py-3"
              >
                <div className="h-4 w-12 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="h-4 w-20 flex-1 rounded bg-gray-200/40 dark:bg-gray-700/40" />
                <div className="h-4 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="h-6 w-20 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <div className="glass-card rounded-3xl p-6">
          <div className="h-6 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="mt-4 space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`prod-${i}`}
                className="flex items-center gap-3 px-2 py-3"
              >
                <div className="h-10 w-10 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                  <div className="h-3 w-16 rounded bg-gray-200/40 dark:bg-gray-700/40" />
                </div>
                <div className="h-4 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
            ))}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="glass-card rounded-3xl p-6">
          <div className="h-6 w-32 rounded bg-gray-200/50 dark:bg-gray-700/50" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`alert-${i}`}
                className="flex items-center gap-3 rounded-xl bg-white/40 px-4 py-3 dark:bg-white/5"
              >
                <div className="h-10 w-10 rounded-xl bg-gray-200/50 dark:bg-gray-700/50" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-24 rounded bg-gray-200/50 dark:bg-gray-700/50" />
                  <div className="h-3 w-32 rounded bg-gray-200/40 dark:bg-gray-700/40" />
                </div>
                <div className="h-7 w-28 rounded-full bg-gray-200/50 dark:bg-gray-700/50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Chargement du tableau de bord en cours…</span>
    </div>
  );
}
