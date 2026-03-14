import {
  Wallet,
  Clock,
  ArrowDownToLine,
  TrendingUp,
  Banknote,
} from "lucide-react";
import type { WalletPageConfig, WalletPageData, WalletTransaction } from "@/features/shared/wallet.types";
import type { DriverEarningsData } from "@/features/driver/schema";

// ── Icon mapping ──
const DRIVER_ICONS: Record<string, React.ReactNode> = {
  wallet: <Wallet className="h-4 w-4 lg:h-5 lg:w-5" />,
  clock: <Clock className="h-4 w-4 lg:h-5 lg:w-5" />,
  "arrow-down-to-line": <ArrowDownToLine className="h-4 w-4 lg:h-5 lg:w-5" />,
  "trending-up": <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />,
};

/** Full driver earnings page configuration */
export const DRIVER_EARNINGS_CONFIG: WalletPageConfig = {
  // Header
  pageTitle: "Mes Gains",
  pageSubtitle: "Suivez vos revenus et demandez des retraits",
  headerIcon: <Banknote className="h-5 w-5" />,
  headerIconWrapperClass: "flex h-11 w-11 items-center justify-center rounded-2xl bg-sugu-500 text-white",
  withdrawHref: "/driver/earnings/withdraw",

  // Chart
  chartTitle: "Évolution des gains",
  chartGradientId: "driver-earnings-chart-gradient",
  chartLineGradientId: "driver-earnings-line-gradient",
  chartAriaLabel: "Graphique d'évolution des gains",
  chartTitleId: "earnings-chart-title",

  // Chart bottom stats
  chartLabel: "Gains cette semaine",
  chartCompareLabel: "vs semaine précédente",
  previousValueGenerator: () => 40600, // hardcoded comparison value
  growthLabel: "+12.7%",

  // Period pill (no extra class for driver)
  periodPillActiveExtra: undefined,

  // KPI icon shadow (driver: no shadow)
  kpiIconShadow: false,

  // Transaction configs
  entryTypeConfig: {
    delivery: {
      label: "Gain",
      style: "bg-green-50 text-green-700 border-green-200",
      prefix: "+",
      color: "text-green-600",
    },
    withdrawal: {
      label: "Retrait",
      style: "bg-blue-50 text-blue-700 border-blue-200",
      prefix: "-",
      color: "text-blue-600",
    },
    fee: {
      label: "Frais",
      style: "bg-gray-50 text-gray-600 border-gray-200",
      prefix: "-",
      color: "text-red-500",
    },
    pending: {
      label: "En attente",
      style: "bg-amber-50 text-amber-700 border-amber-200",
      prefix: "+",
      color: "text-amber-600",
    },
  },

  filterOptions: [
    { label: "Tout", value: "all" },
    { label: "Gains", value: "delivery" },
    { label: "Retraits", value: "withdrawal" },
    { label: "Frais", value: "fee" },
  ],

  statusDisplay: {
    confirmed: { label: "Confirmé", color: "text-green-600" },
    completed: { label: "Effectué", color: "text-green-600" },
    pending: { label: "En attente", color: "text-amber-600" },
  },

  getEntryCategory: (entry: WalletTransaction): string => {
    if (entry.status === "pending") return "pending";
    if (entry.referenceType === "delivery") return "delivery";
    if (entry.referenceType === "payout") return "withdrawal";
    if (entry.referenceType === "commission") return "fee";
    return entry.type === "debit" ? "withdrawal" : "delivery";
  },

  defaultCategory: "delivery",

  // Icon map
  iconMap: DRIVER_ICONS,

  // Error state
  errorTitle: "Erreur des gains",
  errorDescription: "Impossible de charger vos gains. Veuillez réessayer.",

  // Loading
  loadingAriaLabel: "Chargement des gains",
  srLoadingMessage: "Chargement des gains en cours...",

  // Empty chart
  emptyChartMessage: "Aucune donnée de gains",
};

/** Map DriverEarningsData → WalletPageData */
export function mapDriverEarningsToWalletData(data: DriverEarningsData): WalletPageData {
  return {
    kpis: data.kpis,
    revenueChart: data.revenueChart,
    nextPayout: {
      amount: data.nextPayout.amount,
      scheduledDate: data.nextPayout.scheduledDate,
      method: data.nextPayout.method
        ? {
            provider: data.nextPayout.method.provider,
            providerLabel: data.nextPayout.method.providerLabel,
            accountMasked: data.nextPayout.method.accountMasked,
          }
        : null,
      minThreshold: data.nextPayout.minThreshold,
    },
    transactions: data.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      referenceType: t.referenceType,
      status: t.status,
      date: t.date,
    })),
  };
}
