import type { WithdrawConfig, WithdrawFormData } from "@/components/shared/withdraw/types";

export const DRIVER_WITHDRAW_CONFIG = {
  // Routes
  backHref: "/driver/earnings",
  backLabel: "Retour aux gains",

  // Page
  pageSubtitle: "Transférez vos gains vers votre compte mobile",
  maxWidth: "max-w-7xl",

  // Amounts
  minWithdrawalAmount: 5_000,
  quickAmounts: [5_000, 10_000, 25_000],

  // PIN — disabled.
  //
  // The wizard collected a 4-digit PIN and the API validated its FORMAT, but
  // nothing ever verified it: `users.pin_hash` is a dead column (OTP-only auth
  // since 2026-05-17). Asking for a credential nobody checks is worse than not
  // asking — it advertises a protection that does not exist. Re-enable this
  // only once a real PIN verification exists server-side.
  requiresPin: false,

  // Matches PayoutPolicies::courier() server-side.
  feeRate: 0.01,

  // Submit payload — `amount` is in XOF; the service converts to centimes.
  submitPayload: (data: WithdrawFormData) => ({
    amount: parseFloat(data.amount),
    payoutSettingId: data.selectedPayoutSettingId,
  }),

  // Step indicator
  stepIndicatorVariant: "driver",

  // Step montant
  stepMontantVariant: "rich",

  // Step methode
  stepMethodeVariant: "driver",
  providerConfig: {
    orange_money: { bg: "bg-orange-500", label: "OM" },
    moov_money: { bg: "bg-yellow-500", label: "MM" },
  },
  gridLayout: "lg:grid-cols-12",
  leftColSpan: "lg:col-span-7",
  rightColSpan: "lg:col-span-5",
  recapTitle: "Résumé du retrait",
  infoBannerText: "Transfert instantané vers votre compte mobile",
  defaultBadgeText: "Compte principal",
  addMethodStyle: "card",
  radioPosition: "right",

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
  titleStyle: "driver",
} satisfies WithdrawConfig;
