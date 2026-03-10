// ────────────────────────────────────────────────────────────
// Shared types & constants for the Driver Withdrawal wizard
// ────────────────────────────────────────────────────────────

export interface WithdrawFormData {
  amount: string;
  selectedPayoutSettingId: string;
  pin: string;
  note: string;
}

export const DEFAULT_WITHDRAW_DATA: WithdrawFormData = {
  amount: "",
  selectedPayoutSettingId: "",
  pin: "",
  note: "",
};

export const WITHDRAW_STEPS = [
  { id: 1, label: "Montant" },
  { id: 2, label: "Méthode" },
  { id: 3, label: "Confirmation" },
] as const;

// Fee calculation
export const WITHDRAWAL_FEE_PERCENT = 0.01; // 1%
export const MIN_WITHDRAWAL_AMOUNT = 5_000; // 5000 FCFA

// Quick amount presets for the driver (fixed amounts, not percentages)
export const QUICK_AMOUNTS = [5_000, 10_000, 25_000] as const;

// Shared CSS classes
export const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20";

export const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-gray-600";
