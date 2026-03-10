// ============================================================
// Driver Deliveries — Status Config & Types
// Shared status styling tokens + small StatusBadge component.
// ============================================================

import type { DriverDeliveryStatus } from "@/features/driver/schema";

// ── Tailwind class map per status ──────────────────────────

export interface StatusStyle {
  label: string;
  bg: string;
  text: string;
  dot: string;
  borderL: string;
  gradient: string;
  iconBg: string;
}

export const STATUS_CONFIG: Record<DriverDeliveryStatus, StatusStyle> = {
  to_accept: {
    label: "À accepter",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500 animate-pulse",
    borderL: "border-l-[3px] border-amber-400",
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
  },
  pickup: {
    label: "Ramassage",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    borderL: "border-l-[3px] border-blue-400",
    gradient: "from-blue-500 to-cyan-500",
    iconBg: "bg-gradient-to-br from-blue-400 to-cyan-500",
  },
  en_route: {
    label: "En route",
    bg: "bg-sugu-50 dark:bg-sugu-950/30",
    text: "text-sugu-700 dark:text-sugu-400",
    dot: "bg-sugu-500",
    borderL: "border-l-[3px] border-sugu-500",
    gradient: "from-sugu-500 to-sugu-600",
    iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-600",
  },
  delivered: {
    label: "Livré",
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    borderL: "border-l-[3px] border-green-400",
    gradient: "from-green-500 to-emerald-600",
    iconBg: "bg-gradient-to-br from-green-400 to-emerald-500",
  },
  failed: {
    label: "Échoué",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    borderL: "border-l-[3px] border-red-300",
    gradient: "from-red-500 to-rose-600",
    iconBg: "bg-gradient-to-br from-red-400 to-rose-500",
  },
};

// ── Tab type ───────────────────────────────────────────────

export type DriverStatusTab =
  | "all"
  | "to_accept"
  | "en_route"
  | "delivered"
  | "failed";

export function tabToDriverStatus(
  tab: DriverStatusTab,
): DriverDeliveryStatus | undefined {
  const map: Record<DriverStatusTab, DriverDeliveryStatus | undefined> = {
    all: undefined,
    to_accept: "to_accept",
    en_route: "en_route",
    delivered: "delivered",
    failed: "failed",
  };
  return map[tab];
}
