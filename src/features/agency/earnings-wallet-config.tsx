import {
  Wallet,
  Clock,
  ArrowDownToLine,
  TrendingUp,
  Banknote,
} from "lucide-react";
import type { WalletPageConfig, WalletPageData, WalletTransaction } from "@/features/shared/wallet.types";
import type { AgencyEarningsData } from "@/features/agency/schema";

// ── Icon mapping ──
const AGENCY_ICONS: Record<string, React.ReactNode> = {
  wallet: <Wallet className="h-4 w-4 lg:h-5 lg:w-5" />,
  clock: <Clock className="h-4 w-4 lg:h-5 lg:w-5" />,
  "arrow-down-to-line": <ArrowDownToLine className="h-4 w-4 lg:h-5 lg:w-5" />,
  "trending-up": <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />,
};

/** Full agency earnings page configuration */
export const AGENCY_EARNINGS_CONFIG: WalletPageConfig = {
  // Header
  pageTitle: "Gains",
  pageSubtitle: "Suivez vos revenus et commissions sur les livraisons",
  headerIcon: <Banknote className="h-5 w-5" />,
  headerIconWrapperClass: "flex h-11 w-11 items-center justify-center rounded-2xl bg-sugu-500 text-white",
  withdrawHref: "/agency/earnings/withdraw",

  // Chart
  chartTitle: "Évolution des gains",
  chartGradientId: "agency-earnings-chart-gradient",
  chartLineGradientId: "agency-earnings-line-gradient",
  chartAriaLabel: "Graphique d'évolution des gains de l'agence",
  chartTitleId: "earnings-chart-title",

  // Chart bottom stats
  chartLabel: "Gains de la semaine",
  chartCompareLabel: "vs semaine précédente",
  previousValueGenerator: () => 380400, // hardcoded comparison value
  growthLabel: "+18.2%",

  // Period pill
  periodPillActiveExtra: undefined,

  // KPI icon shadow
  kpiIconShadow: false,

  // Transaction configs
  entryTypeConfig: {
    delivery: {
      label: "Commission",
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
    commission: {
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
    { label: "Commissions", value: "delivery" },
    { label: "Retraits", value: "withdrawal" },
    { label: "Frais", value: "commission" },
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
    if (entry.referenceType === "commission") return "commission";
    return entry.type === "debit" ? "withdrawal" : "delivery";
  },

  defaultCategory: "delivery",

  // Icon map
  iconMap: AGENCY_ICONS,

  // Error state
  errorTitle: "Erreur des gains",
  errorDescription: "Impossible de charger les gains de l'agence. Veuillez réessayer.",

  // Loading
  loadingAriaLabel: "Chargement des gains de l'agence",
  srLoadingMessage: "Chargement des gains...",

  // Empty chart
  emptyChartMessage: "Aucune donnée de gains disponible",
};

/** Map AgencyEarningsData → WalletPageData */
export function mapAgencyEarningsToWalletData(data: AgencyEarningsData): WalletPageData {
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
