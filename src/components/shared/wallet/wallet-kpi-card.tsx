import type { ReactNode } from "react";
import { Package } from "lucide-react";
import type { WalletPageKpi } from "@/features/shared/wallet.types";

interface WalletKpiCardProps {
  kpi: WalletPageKpi;
  delay: number;
  iconMap: Record<string, ReactNode>;
  iconShadow?: boolean;
}

/** KPI Card with gradient background */
export function WalletKpiCard({ kpi, delay, iconMap, iconShadow }: WalletKpiCardProps) {
  return (
    <div
      className={`kpi-card glass-card rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:rounded-3xl lg:p-5 lg:hover:-translate-y-1 animate-card-enter`}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Top row: icon + badge */}
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg lg:h-10 lg:w-10 lg:rounded-xl ${kpi.iconBg}${iconShadow ? " shadow-sm" : ""}`}
        >
          {iconMap[kpi.icon] ?? (
            <Package className="h-4 w-4 lg:h-5 lg:w-5" />
          )}
        </div>
        {kpi.badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold lg:px-2.5 lg:text-xs ${kpi.badgeColor ?? "text-gray-600 bg-gray-100"}`}
          >
            {kpi.badge}
          </span>
        )}
      </div>

      {/* Label */}
      <p className="mt-2 text-[10px] font-medium text-gray-500 lg:mt-3 lg:text-xs">
        {kpi.label}
      </p>

      {/* Value */}
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-extrabold text-gray-900 lg:text-2xl">
          {kpi.value}
        </span>
        {kpi.subValue && (
          <span className="text-xs font-semibold text-gray-500 lg:text-sm">
            {kpi.subValue}
          </span>
        )}
      </div>
    </div>
  );
}
