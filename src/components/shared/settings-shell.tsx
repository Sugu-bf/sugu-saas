"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Shared Settings Shell — Layout + Navigation + Skeleton
// ────────────────────────────────────────────────────────────

export interface SettingsNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  danger?: boolean;
  pro?: boolean;
}

export interface SettingsShellProps {
  /** Navigation items */
  navItems: SettingsNavItem[];
  /** Currently active tab */
  activeTab: string;
  /** Callback when user clicks a tab */
  onTabChange: (tab: string) => void;
  /** ISO date string of last save */
  lastSavedAt?: string;
  /** Custom header action (e.g. Refresh vs Save button) */
  headerAction?: React.ReactNode;
  /** Tab content */
  children: React.ReactNode;
  /** Badge inactive color class (defaults to amber) */
  badgeInactiveClass?: string;
}

/** Reusable settings page shell: header + sidebar nav + content area */
export function SettingsShell({
  navItems,
  activeTab,
  onTabChange,
  lastSavedAt,
  headerAction,
  children,
  badgeInactiveClass = "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
}: SettingsShellProps) {
  /* eslint-disable react-hooks/purity */
  const lastSaveLabel = useMemo(() => {
    if (!lastSavedAt) return null;
    const lastSaveDate = new Date(lastSavedAt);
    const minutesAgo = Math.round((Date.now() - lastSaveDate.getTime()) / 60000);
    return minutesAgo < 1 ? "à l'instant" : `il y a ${minutesAgo} min`;
  }, [lastSavedAt]);
  /* eslint-enable react-hooks/purity */

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-20">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <div className="flex items-center gap-4">
          {lastSaveLabel && (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              <span className="text-gray-500 dark:text-gray-400">Dernière sauvegarde: {lastSaveLabel}</span>
            </div>
          )}
          {headerAction}
        </div>
      </header>

      {/* ════════════ Layout: Nav + Content ════════════ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ──── Left: Settings Navigation ──── */}
        <nav className="xl:col-span-3" aria-label="Navigation des paramètres">
          <div className="glass-card sticky top-4 space-y-0.5 rounded-2xl p-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                  activeTab === item.key
                    ? "bg-sugu-500 text-white"
                    : item.danger
                      ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                      : "text-gray-600 hover:bg-gray-100/80 dark:text-gray-400 dark:hover:bg-gray-800/50",
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    activeTab === item.key ? "bg-white/20 text-white" : badgeInactiveClass,
                  )}>
                    {item.badge}
                  </span>
                )}
                {item.pro && (
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    activeTab === item.key ? "bg-white/20 text-white" : "bg-sugu-100 text-sugu-600 dark:bg-sugu-950/30 dark:text-sugu-400",
                  )}>
                    Pro
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* ──── Right: Tab Content (75% width) ──── */}
        <div className="xl:col-span-9">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Settings page loading skeleton */
export function SettingsLoadingSkeleton({ navItemCount = 6 }: { navItemCount?: number }) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <div className="glass-card space-y-2 rounded-2xl p-2">
            {Array.from({ length: navItemCount }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        </div>
        <div className="space-y-6 xl:col-span-9">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl p-6">
              <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-6 space-y-4">
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
