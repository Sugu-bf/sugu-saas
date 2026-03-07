/**
 * Loading skeleton for the Vendor Wallet page.
 * Mirrors: header, 4 KPI cards, chart + next payout, transaction table.
 */
export default function VendorWalletLoading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse space-y-6"
      role="status"
      aria-label="Chargement du portefeuille"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-56 rounded-xl bg-white/50" />
          <div className="mt-2 h-4 w-40 rounded-lg bg-white/40" />
        </div>
        <div className="h-10 w-44 rounded-2xl bg-white/50" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`kpi-${i}`}
            className="glass-card rounded-3xl p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-gray-200/50" />
              <div className="h-5 w-14 rounded-full bg-gray-200/50" />
            </div>
            <div className="mt-3 h-3 w-28 rounded bg-gray-200/50" />
            <div className="mt-2 h-8 w-36 rounded bg-gray-200/50" />
          </div>
        ))}
      </div>

      {/* Middle Row: Chart + Next Payout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Chart (3 cols) */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-44 rounded bg-gray-200/50" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`pill-${i}`} className="h-7 w-10 rounded-full bg-gray-200/50" />
              ))}
            </div>
          </div>
          <div className="mt-4 h-40 rounded-xl bg-gray-200/30" />
          <div className="mt-3 flex justify-between">
            <div className="h-4 w-44 rounded bg-gray-200/40" />
            <div className="h-4 w-52 rounded bg-gray-200/40" />
          </div>
        </div>

        {/* Next Payout (2 cols) */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-2">
          <div className="h-6 w-40 rounded bg-gray-200/50" />
          <div className="mt-4 h-10 w-48 rounded bg-gray-200/50" />
          <div className="mt-2 h-4 w-40 rounded bg-gray-200/40" />
          <div className="mt-6 h-5 w-36 rounded bg-gray-200/50" />
          <div className="mt-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200/50" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-28 rounded bg-gray-200/50" />
              <div className="h-3 w-24 rounded bg-gray-200/40" />
            </div>
            <div className="h-4 w-16 rounded bg-gray-200/40" />
          </div>
          <div className="mt-6 h-4 w-48 rounded bg-gray-200/40" />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 rounded bg-gray-200/50" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`filter-${i}`} className="h-8 w-20 rounded-full bg-gray-200/50" />
            ))}
          </div>
        </div>

        {/* Table header */}
        <div className="mt-4 flex gap-4 px-2 py-2">
          <div className="h-4 w-20 rounded bg-gray-200/40" />
          <div className="h-4 w-40 flex-1 rounded bg-gray-200/40" />
          <div className="h-4 w-16 rounded bg-gray-200/40" />
          <div className="h-4 w-24 rounded bg-gray-200/40" />
          <div className="h-4 w-20 rounded bg-gray-200/40" />
        </div>

        {/* Table rows */}
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="flex items-center gap-4 border-b border-gray-100/60 px-2 py-4"
            >
              <div className="h-4 w-20 rounded bg-gray-200/50" />
              <div className="h-4 w-48 flex-1 rounded bg-gray-200/40" />
              <div className="h-6 w-16 rounded-full bg-gray-200/50" />
              <div className="h-4 w-24 rounded bg-gray-200/50" />
              <div className="h-4 w-20 rounded bg-gray-200/40" />
            </div>
          ))}
        </div>

        {/* Footer link */}
        <div className="mt-4 flex justify-center">
          <div className="h-4 w-44 rounded bg-gray-200/40" />
        </div>
      </div>

      <span className="sr-only">Chargement du portefeuille en cours…</span>
    </div>
  );
}
