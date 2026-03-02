"use client";

import { cn } from "@/lib/utils";

/** Shimmer animation block */
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-700/50",
        className,
      )}
      style={style}
    />
  );
}

/**
 * Full-page skeleton matching the InventoryContent layout.
 * Renders KPI cards, table skeleton, and sidebar panels.
 */
export function InventorySkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-4 lg:space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Shimmer className="h-7 w-40 lg:h-8 lg:w-52" />
          <div className="mt-2 flex items-center gap-2">
            <Shimmer className="h-8 w-32 rounded-full" />
            <Shimmer className="h-8 w-28 rounded-full" />
            <Shimmer className="h-8 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="hidden h-10 w-40 rounded-xl lg:block" />
          <Shimmer className="hidden h-10 w-44 rounded-xl lg:block" />
          <Shimmer className="h-9 w-36 rounded-xl lg:h-10" />
        </div>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="glass-card rounded-2xl p-3 lg:p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <Shimmer className="h-8 w-8 rounded-xl lg:h-10 lg:w-10" />
            </div>
            <Shimmer className="mt-2 h-3 w-20 lg:mt-3" />
            <Shimmer className="mt-2 h-6 w-28 lg:h-8 lg:w-36" />
            <Shimmer className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* ════════════ Main Grid: Table + Sidebar ════════════ */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 lg:gap-6">
        {/* ──── Stock Table ──── */}
        <section className="glass-card overflow-hidden rounded-2xl xl:col-span-8">
          {/* Table Header */}
          <div className="border-b border-gray-200/60 p-4 dark:border-gray-700/40 lg:p-5">
            <Shimmer className="h-5 w-36" />
            <div className="mt-3 flex items-center gap-3">
              <Shimmer className="h-10 flex-1 min-w-[200px] rounded-xl" />
              <Shimmer className="hidden h-10 w-28 rounded-xl lg:block" />
              <Shimmer className="hidden h-10 w-32 rounded-xl lg:block" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-8 w-24 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Shimmer className="h-4 w-4 rounded" />
                <div className="flex items-center gap-3 flex-1">
                  <Shimmer className="h-10 w-10 rounded-xl" />
                  <Shimmer className="h-4 w-32" />
                </div>
                <Shimmer className="hidden h-4 w-16 lg:block" />
                <Shimmer className="hidden h-4 w-24 lg:block" />
                <div className="hidden items-center gap-2 lg:flex">
                  <Shimmer className="h-1.5 w-20 rounded-full" />
                  <Shimmer className="h-4 w-8" />
                </div>
                <Shimmer className="hidden h-4 w-8 lg:block" />
                <Shimmer className="hidden h-6 w-16 rounded-full lg:block" />
                <Shimmer className="hidden h-4 w-24 lg:block" />
                <Shimmer className="hidden h-4 w-16 lg:block" />
                <Shimmer className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <Shimmer className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Shimmer className="h-4 w-20" />
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 w-8 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ──── Right Sidebar ──── */}
        <aside className="space-y-3 xl:col-span-4 lg:space-y-4">
          {/* Alerts Panel */}
          <div className="glass-card rounded-2xl p-3 lg:p-5">
            <div className="flex items-center justify-between">
              <Shimmer className="h-5 w-32" />
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
            <Shimmer className="mt-1 h-3 w-48" />
            <div className="mt-3 space-y-2 lg:mt-4 lg:space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-gray-50/50 p-3 dark:bg-gray-800/20"
                >
                  <Shimmer className="mt-0.5 h-2 w-2 rounded-full" />
                  <div className="flex-1">
                    <Shimmer className="h-4 w-36" />
                    <Shimmer className="mt-1 h-3 w-44" />
                  </div>
                  <Shimmer className="h-8 w-28 rounded-lg" />
                </div>
              ))}
            </div>
            <Shimmer className="mt-3 mx-auto h-4 w-36" />
          </div>

          {/* Recent Movements Panel */}
          <div className="glass-card rounded-2xl p-3 lg:p-5">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="mt-1 h-3 w-36" />
            <div className="mt-3 space-y-3 lg:mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Shimmer className="mt-1 h-2 w-2 rounded-full" />
                  <div className="flex-1">
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="mt-1 h-3 w-48" />
                  </div>
                  <Shimmer className="h-3 w-16" />
                </div>
              ))}
            </div>
            <Shimmer className="mt-2 mx-auto h-4 w-40" />
          </div>

          {/* Trend Card */}
          <div className="glass-card rounded-2xl p-3 lg:p-5">
            <div className="flex items-center justify-between">
              <Shimmer className="h-5 w-36" />
              <Shimmer className="h-5 w-20 rounded-full" />
            </div>
            <Shimmer className="mt-3 h-7 w-40 lg:h-8" />
            <div className="mt-3 flex items-end gap-1">
              {[18, 25, 20, 30, 35, 28, 32, 22, 38, 26, 34, 15].map((h, i) => (
                <Shimmer
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
