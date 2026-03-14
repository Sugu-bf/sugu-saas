// ────────────────────────────────────────────────────────────
// Shared types & constants for the unified Withdrawal wizard
// Used by both Driver (earnings→withdraw) and Vendor (wallet→withdraw)
// ────────────────────────────────────────────────────────────

// ── Form data ───────────────────────────────────────────────

export interface WithdrawFormData {
  amount: string;
  selectedPayoutSettingId: string;
  pin?: string; // driver only
  note: string;
}

export const DEFAULT_WITHDRAW_DATA: WithdrawFormData = {
  amount: "",
  selectedPayoutSettingId: "",
  pin: undefined,
  note: "",
};

// ── Shared payout setting (superset used by shared components) ──

export interface SharedPayoutSetting {
  id: string;
  type?: "mobile_money" | "bank_transfer";
  provider?: string | null;
  providerLabel: string;
  accountMasked: string;
  isDefault: boolean;
  bankName?: string | null;
  addedDate?: string;
}

// ── Steps ───────────────────────────────────────────────────

export const WITHDRAW_STEPS = [
  { id: 1, label: "Montant" },
  { id: 2, label: "Méthode" },
  { id: 3, label: "Confirmation" },
] as const;

// ── Fee ─────────────────────────────────────────────────────

export const WITHDRAWAL_FEE_PERCENT = 0.01; // 1%

// ── Provider config ─────────────────────────────────────────

export interface ProviderConfigEntry {
  bg: string;
  label: string;
  useLucide?: boolean;
}

// ── Quick amount types ──────────────────────────────────────

export interface QuickPercent {
  label: string;
  value: number;
}

// ── Withdraw Config object (parametrises the wizard) ────────

export interface WithdrawConfig<P = Record<string, unknown>> {
  // Routes
  backHref: string;
  backLabel: string;

  // Page
  pageSubtitle: string;
  maxWidth: "max-w-7xl" | "max-w-3xl" | "max-w-4xl";

  // Amounts
  minWithdrawalAmount: number;
  quickAmounts?: number[]; // fixed amounts (driver)
  quickPercents?: QuickPercent[]; // percentage pills (vendor)

  // PIN
  requiresPin: boolean;

  // Submit payload builder
  submitPayload: (data: WithdrawFormData) => P;

  // Step indicator style
  stepIndicatorVariant: "driver" | "vendor";

  // Step montant layout
  stepMontantVariant: "rich" | "simple";

  // Step methode
  stepMethodeVariant: "driver" | "vendor";
  providerConfig: Record<string, ProviderConfigEntry>;
  gridLayout: "lg:grid-cols-12" | "lg:grid-cols-5";
  leftColSpan: "lg:col-span-7" | "lg:col-span-3";
  rightColSpan: "lg:col-span-5" | "lg:col-span-2";
  recapTitle: string; // "Résumé du retrait" | "Récapitulatif"
  infoBannerText: string;
  defaultBadgeText: string; // "Compte principal" | "Par défaut"
  addMethodStyle: "card" | "link"; // full card vs text link
  radioPosition: "right" | "left";
  emptyStateSettingsHref?: string; // vendor only: "/vendor/settings"

  // Step confirmation
  stepConfirmationVariant: "rich" | "simple";

  // Navigation
  cancelLabel: string; // "Annuler" | "Précédent"
  showSubmitInNav: boolean; // false (driver) | true (vendor)

  // CSS
  inputClass: string;
  labelClass: string;

  // Title rendering
  titleStyle: "driver" | "vendor";
}
