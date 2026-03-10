// ============================================================
// KPI Summary — individual glass-card KPIs for deliveries page
// Matches the pattern used on agency deliveries + dashboards.
// ============================================================

import { cn } from "@/lib/utils";
import {
  Package,
  CheckCircle2,
  XCircle,
  Navigation,
} from "lucide-react";
import type { DriverDeliverySummary } from "@/features/driver/schema";

// ── KPI Config ─────────────────────────────────────────────

const KPI_ITEMS: {
  key: keyof DriverDeliverySummary;
  label: string;
  sub: string;
  icon: React.ReactNode;
  iconColor: string;
  valueColor: string;
}[] = [
  {
    key: "total",
    label: "Total",
    sub: "Aujourd'hui",
    icon: <Package className="h-4 w-4" />,
    iconColor: "text-sugu-500",
    valueColor: "text-gray-900 dark:text-white",
  },
  {
    key: "delivered",
    label: "Livrées",
    sub: "Complétées",
    icon: <CheckCircle2 className="h-4 w-4" />,
    iconColor: "text-green-500",
    valueColor: "text-green-600 dark:text-green-400",
  },
  {
    key: "inProgress",
    label: "En cours",
    sub: "En route/Ramassage",
    icon: <Navigation className="h-4 w-4" />,
    iconColor: "text-sugu-500",
    valueColor: "text-sugu-600 dark:text-sugu-400",
  },
  {
    key: "failed",
    label: "Échecs",
    sub: "Non livrées",
    icon: <XCircle className="h-4 w-4" />,
    iconColor: "text-red-500",
    valueColor: "text-red-500 dark:text-red-400",
  },
];

// ── Component ──────────────────────────────────────────────

export function KpiSummaryBar({ summary }: { summary: DriverDeliverySummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
      {KPI_ITEMS.map((item, i) => (
        <div
          key={item.key}
          className="glass-card animate-card-enter rounded-2xl p-4"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Icon + Label */}
          <div className="flex items-center gap-2">
            <span className={cn("flex items-center", item.iconColor)}>
              {item.icon}
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {item.label}
            </span>
          </div>

          {/* Big value */}
          <div
            className={cn(
              "mt-1.5 text-3xl font-black tabular-nums",
              item.valueColor,
            )}
          >
            {summary[item.key]}
          </div>

          {/* Sub-label */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {item.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
