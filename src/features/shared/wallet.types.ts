import type { ReactNode } from "react";

// ============================================================
// Unified Wallet / Earnings Types (shared between driver & vendor)
// ============================================================

/** Unified KPI card — superset of DriverEarningsKpi & WalletKpi */
export interface WalletPageKpi {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  badge?: string;
  badgeColor?: string;
  icon: string;
  gradient: string;
  iconBg: string;
}

/** Unified chart data point — {day, value} */
export interface WalletChartPoint {
  day: string;
  value: number;
}

/** Unified transaction — superset of DriverTransaction & WalletEntry */
export interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  referenceType: string | null;
  referenceId?: string | null;
  status: string;
  date: string;
  dateRaw?: string;
}

/** Unified payout method — superset of driver method & PayoutMethod */
export interface WalletPayoutMethod {
  provider: string;
  providerLabel: string;
  accountMasked: string;
  id?: string;
  isDefault?: boolean;
}

/** Unified next payout info */
export interface WalletPayoutInfo {
  amount: number;
  scheduledDate: string;
  method: WalletPayoutMethod | null;
  minThreshold: number;
}

/** Unified full response data passed to WalletPageLayout */
export interface WalletPageData {
  kpis: WalletPageKpi[];
  revenueChart: WalletChartPoint[];
  nextPayout: WalletPayoutInfo;
  transactions: WalletTransaction[];
}

// ── Entry type config (for transaction type pill) ──
export interface EntryTypeConfigItem {
  label: string;
  style: string;
  prefix: string;
  color: string;
}

// ── Status display config (for transaction status) ──
export interface StatusDisplayItem {
  label: string;
  icon?: string;
  color: string;
}

// ── Filter option ──
export interface FilterOption {
  label: string;
  value: string;
}

// ── Page configuration — all deltas parameterised ──
export interface WalletPageConfig {
  // Header
  pageTitle: string;
  pageSubtitle: string;
  headerIcon?: ReactNode;
  headerIconWrapperClass?: string;
  withdrawHref: string;

  // Chart section
  chartTitle: string;
  chartGradientId: string;
  chartLineGradientId: string;
  chartAriaLabel: string;
  chartTitleId: string;

  // Chart bottom stats
  chartLabel: string;
  chartCompareLabel: string;
  previousValueGenerator: (totalRevenue: number) => number;
  growthLabel: string;

  // Period pills — active pill extra class (e.g. shadow-sm for vendor)
  periodPillActiveExtra?: string;

  // KPI icon shadow
  kpiIconShadow?: boolean;

  // Transaction configs
  entryTypeConfig: Record<string, EntryTypeConfigItem>;
  filterOptions: readonly FilterOption[];
  statusDisplay: Record<string, StatusDisplayItem>;
  getEntryCategory: (entry: WalletTransaction) => string;
  defaultCategory: string;

  // Icon map
  iconMap: Record<string, ReactNode>;

  // Error state
  errorTitle: string;
  errorDescription: string;

  // Loading
  loadingAriaLabel: string;
  srLoadingMessage: string;

  // Empty chart
  emptyChartMessage: string;
}
