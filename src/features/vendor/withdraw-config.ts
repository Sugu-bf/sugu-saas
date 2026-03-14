import type { WithdrawConfig, WithdrawFormData } from "@/components/shared/withdraw/types";

export const VENDOR_WITHDRAW_CONFIG = {
  // Routes
  backHref: "/vendor/wallet",
  backLabel: "Retour au portefeuille",

  // Page
  pageSubtitle: "Transférez vos fonds vers votre compte mobile ou bancaire",
  maxWidth: "max-w-3xl",

  // Amounts
  minWithdrawalAmount: 10_000,
  quickPercents: [
    { label: "25%", value: 0.25 },
    { label: "50%", value: 0.5 },
    { label: "75%", value: 0.75 },
    { label: "Max", value: 1 },
  ],

  // PIN
  requiresPin: false,

  // Submit payload
  submitPayload: (data: WithdrawFormData) => ({
    amount: parseFloat(data.amount),
    payoutSettingId: data.selectedPayoutSettingId,
  }),

  // Step indicator
  stepIndicatorVariant: "vendor",

  // Step montant
  stepMontantVariant: "simple",

  // Step methode
  stepMethodeVariant: "vendor",
  providerConfig: {
    orange_money: { bg: "bg-orange-500", label: "OM" },
    moov_money: { bg: "bg-blue-500", label: "MM" },
    bank_transfer: { bg: "bg-gray-700", label: "", useLucide: true },
  },
  gridLayout: "lg:grid-cols-5",
  leftColSpan: "lg:col-span-3",
  rightColSpan: "lg:col-span-2",
  recapTitle: "Récapitulatif",
  infoBannerText: "Délai de traitement : 24 à 48h ouvrées",
  defaultBadgeText: "Par défaut",
  addMethodStyle: "link",
  radioPosition: "left",
  emptyStateSettingsHref: "/vendor/settings",

  // Step confirmation
  stepConfirmationVariant: "simple",

  // Navigation
  cancelLabel: "Précédent",
  showSubmitInNav: true,

  // CSS
  inputClass:
    "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white",
  labelClass:
    "mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400",

  // Title
  titleStyle: "vendor",
} satisfies WithdrawConfig;
