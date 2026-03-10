"use client";

// ============================================================
// StatusTabBar — horizontal scrollable status filter tabs
// ============================================================

import { cn } from "@/lib/utils";
import {
  Bike,
  Hourglass,
  Navigation,
  PackageCheck,
  PackageX,
} from "lucide-react";
import type { DriverDeliveryStatusCounts } from "@/features/driver/schema";
import type { DriverStatusTab } from "./status-config";

// ── Tab definitions ────────────────────────────────────────

interface TabItem {
  key: DriverStatusTab;
  label: string;
  icon: React.ReactNode;
  iconClass: string;
}

const TABS: TabItem[] = [
  {
    key: "all",
    label: "Tous",
    icon: <Bike className="h-3.5 w-3.5" />,
    iconClass: "text-sugu-500",
  },
  {
    key: "to_accept",
    label: "À accepter",
    icon: <Hourglass className="h-3.5 w-3.5" />,
    iconClass: "text-amber-500",
  },
  {
    key: "en_route",
    label: "En cours",
    icon: <Navigation className="h-3.5 w-3.5" />,
    iconClass: "text-sugu-500",
  },
  {
    key: "delivered",
    label: "Livrées",
    icon: <PackageCheck className="h-3.5 w-3.5" />,
    iconClass: "text-green-500",
  },
  {
    key: "failed",
    label: "Échecs",
    icon: <PackageX className="h-3.5 w-3.5" />,
    iconClass: "text-red-500",
  },
];

// ── Component ──────────────────────────────────────────────

export function StatusTabBar({
  activeTab,
  statusCounts,
  onTabChange,
}: {
  activeTab: DriverStatusTab;
  statusCounts: DriverDeliveryStatusCounts;
  onTabChange: (tab: DriverStatusTab) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-1 px-1 scrollbar-none">
      {TABS.map((tab) => {
        const count =
          tab.key === "all"
            ? statusCounts.all
            : statusCounts[tab.key as keyof typeof statusCounts];
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200",
              isActive
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-white/70 text-gray-500 hover:bg-white hover:text-gray-700 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-300",
            )}
          >
            <span
              className={cn(
                "flex items-center",
                isActive ? "text-current" : tab.iconClass,
              )}
            >
              {tab.icon}
            </span>
            <span className="hidden sm:inline">{tab.label}</span>

            {/* Pulsing notification dot */}
            {tab.key === "to_accept" && statusCounts.to_accept > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse ring-2 ring-white dark:ring-gray-900" />
            )}

            {/* Count badge */}
            <span
              className={cn(
                "min-w-[18px] rounded-md px-1 py-px text-[10px] font-extrabold text-center",
                isActive
                  ? "bg-white/20 text-current dark:bg-gray-900/20"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
              )}
            >
              {count ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
