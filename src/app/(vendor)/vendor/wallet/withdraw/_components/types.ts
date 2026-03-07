// ────────────────────────────────────────────────────────────
// Shared types & constants for the Withdrawal wizard
// ────────────────────────────────────────────────────────────

export interface WithdrawFormData {
  amount: string;
  selectedPayoutSettingId: string;
  note: string;
}

export const DEFAULT_WITHDRAW_DATA: WithdrawFormData = {
  amount: "",
  selectedPayoutSettingId: "",
  note: "",
};

export const WITHDRAW_STEPS = [
  { id: 1, label: "Montant" },
  { id: 2, label: "Méthode" },
  { id: 3, label: "Confirmation" },
] as const;

// Fee calculation
export const WITHDRAWAL_FEE_PERCENT = 0.01; // 1%
export const MIN_WITHDRAWAL_AMOUNT = 10_000; // FCFA

// Shared CSS classes (same pattern as products/new)
export const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white";

export const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400";
