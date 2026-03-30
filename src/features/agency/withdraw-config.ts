import type { WithdrawConfig, WithdrawFormData } from "@/components/shared/withdraw/types";

export const AGENCY_WITHDRAW_CONFIG = {
  // Routes
  backHref: "/agency/earnings",
  backLabel: "Retour aux gains",

  // Page
  pageSubtitle: "Transférez les gains de votre agence vers votre compte",
  maxWidth: "max-w-7xl",

  // Amounts
  minWithdrawalAmount: 10_000,
  quickAmounts: [10_000, 25_000, 50_000],

  // PIN
  requiresPin: false,

  // Submit payload
  submitPayload: (data: WithdrawFormData) => ({
    amount: parseFloat(data.amount),
    payoutSettingId: data.selectedPayoutSettingId,
    note: data.note || undefined,
  }),

  // Step indicator
  stepIndicatorVariant: "vendor",

  // Step montant
  stepMontantVariant: "rich",

  // Step methode
  stepMethodeVariant: "vendor",
  providerConfig: {
    orange_money: { bg: "bg-orange-500", label: "OM" },
    moov_money: { bg: "bg-yellow-500", label: "MM" },
    wave: { bg: "bg-blue-500", label: "W" },
    bank: { bg: "bg-gray-500", label: "BK" },
  },
  gridLayout: "lg:grid-cols-12",
  leftColSpan: "lg:col-span-7",
  rightColSpan: "lg:col-span-5",
  recapTitle: "Résumé du retrait",
  infoBannerText: "Transfert vers votre compte de paiement configuré",
  defaultBadgeText: "Compte principal",
  addMethodStyle: "card",
  radioPosition: "right",
  emptyStateSettingsHref: "/agency/settings",

  // Step confirmation
  stepConfirmationVariant: "rich",

  // Navigation
  cancelLabel: "Annuler",
  showSubmitInNav: false,

  // CSS
  inputClass:
    "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20",
  labelClass: "mb-1.5 block text-sm font-medium text-gray-600",

  // Title
  titleStyle: "vendor",
} satisfies WithdrawConfig;
