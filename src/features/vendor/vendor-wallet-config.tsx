import {
  Wallet,
  Clock,
  ArrowDownToLine,
  TrendingUp,
  Banknote,
} from "lucide-react";
import type { WalletPageConfig, WalletPageData, WalletTransaction } from "@/features/shared/wallet.types";
import type { VendorWalletData } from "@/features/vendor/schema";

// ── Icon mapping ──
const VENDOR_ICONS: Record<string, React.ReactNode> = {
  wallet: <Wallet className="h-4 w-4 lg:h-5 lg:w-5" />,
  clock: <Clock className="h-4 w-4 lg:h-5 lg:w-5" />,
  "arrow-down-to-line": <ArrowDownToLine className="h-4 w-4 lg:h-5 lg:w-5" />,
  "trending-up": <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />,
};

/** Full vendor wallet page configuration */
export const VENDOR_WALLET_CONFIG: WalletPageConfig = {
  // Header
  pageTitle: "Portefeuille",
  pageSubtitle: "Gérez vos revenus et retraits",
  headerIcon: <Banknote className="h-5 w-5" />,
  headerIconWrapperClass: undefined, // vendor has inline icon style
  withdrawHref: "/vendor/wallet/withdraw",

  // Chart
  chartTitle: "Évolution des revenus",
  chartGradientId: "wallet-chart-gradient",
  chartLineGradientId: "wallet-line-gradient",
  chartAriaLabel: "Graphique d'évolution des revenus",
  chartTitleId: "wallet-chart-title",

  // Chart bottom stats
  chartLabel: "Revenus ce mois",
  chartCompareLabel: "vs mois précédent",
  previousValueGenerator: (totalRevenue) => Math.round(totalRevenue * 0.889),
  growthLabel: "+12.5%",

  // Period pill — vendor has shadow-sm on active pill
  periodPillActiveExtra: "shadow-sm",

  // KPI icon shadow (vendor: shadow-sm)
  kpiIconShadow: true,

  // Transaction configs
  entryTypeConfig: {
    revenue: {
      label: "Revenu",
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
      label: "⏳ En attente",
      style: "bg-amber-50 text-amber-700 border-amber-200",
      prefix: "+",
      color: "text-amber-600",
    },
  },

  filterOptions: [
    { label: "Tout", value: "all" },
    { label: "Revenus", value: "revenue" },
    { label: "Retraits", value: "withdrawal" },
    { label: "Frais", value: "fee" },
  ],

  statusDisplay: {
    confirmed: { label: "Confirmé", icon: "", color: "text-green-600" },
    completed: { label: "Effectué", icon: "", color: "text-green-600" },
    pending: { label: "En attente", icon: "⏳", color: "text-amber-600" },
  },

  getEntryCategory: (entry: WalletTransaction): string => {
    if (entry.status === "pending") return "pending";
    if (entry.type === "credit") return "revenue";
    if (entry.referenceType === "payout") return "withdrawal";
    if (entry.referenceType === "commission") return "fee";
    return entry.type === "debit" ? "withdrawal" : "revenue";
  },

  defaultCategory: "revenue",

  // Icon map
  iconMap: VENDOR_ICONS,

  // Error state
  errorTitle: "Erreur du portefeuille",
  errorDescription: "Impossible de charger le portefeuille. Veuillez réessayer.",

  // Loading
  loadingAriaLabel: "Chargement du portefeuille",
  srLoadingMessage: "Chargement du portefeuille en cours…",

  // Empty chart
  emptyChartMessage: "Aucune donnée de revenus",
};

/** Map VendorWalletData → WalletPageData */
export function mapVendorWalletToWalletData(data: VendorWalletData): WalletPageData {
  return {
    kpis: data.kpis,
    revenueChart: data.revenueChart,
    nextPayout: {
      amount: data.nextPayout.amount,
      scheduledDate: data.nextPayout.scheduledDate,
      method: data.nextPayout.method
        ? {
            id: data.nextPayout.method.id,
            provider: data.nextPayout.method.provider,
            providerLabel: data.nextPayout.method.providerLabel,
            accountMasked: data.nextPayout.method.accountMasked,
            isDefault: data.nextPayout.method.isDefault,
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
      referenceId: t.referenceId,
      status: t.status,
      date: t.date,
      dateRaw: t.dateRaw,
    })),
  };
}
