"use client";

import { Plus, Info } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { WithdrawFormData } from "./types";
import { WITHDRAWAL_FEE_PERCENT } from "./types";
import type { DriverPayoutSetting } from "@/features/driver/schema";

interface StepMethodeProps {
  data: WithdrawFormData;
  onChange: (field: keyof WithdrawFormData, value: string) => void;
  payoutSettings: DriverPayoutSetting[];
}

/** Provider → icon config mapping */
const PROVIDER_CONFIG: Record<
  string,
  { bg: string; label: string }
> = {
  orange_money: { bg: "bg-orange-500", label: "OM" },
  moov_money: { bg: "bg-yellow-500", label: "MM" },
};

export function StepMethode({ data, onChange, payoutSettings }: StepMethodeProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;

  // Find selected method for summary
  const selectedMethod = payoutSettings.find(
    (ps) => ps.id === data.selectedPayoutSettingId,
  );
  const selectedConfig = selectedMethod
    ? PROVIDER_CONFIG[selectedMethod.provider] ?? PROVIDER_CONFIG.orange_money
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* ── Left column: Payment method selection ── */}
      <div className="lg:col-span-7">
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
          <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
            Méthode de paiement
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
            Sélectionnez le compte sur lequel recevoir vos fonds
          </p>

          {/* Method cards */}
          <div className="mt-4 space-y-3">
            {payoutSettings.map((setting) => {
              const isSelected = data.selectedPayoutSettingId === setting.id;
              const config = PROVIDER_CONFIG[setting.provider] ?? PROVIDER_CONFIG.orange_money;

              return (
                <button
                  key={setting.id}
                  type="button"
                  onClick={() => onChange("selectedPayoutSettingId", setting.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all",
                    isSelected
                      ? "border-2 border-sugu-500 bg-sugu-50/30"
                      : "border border-gray-200 bg-white/40 hover:border-gray-300",
                  )}
                >
                  {/* Provider icon circle */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.bg} text-sm font-bold text-white`}
                  >
                    {config.label}
                  </div>

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-800">
                      {setting.providerLabel}
                    </span>
                    <p className="text-xs text-gray-400">
                      {setting.accountMasked}
                    </p>
                    {setting.isDefault && (
                      <span className="mt-0.5 inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                        Compte principal
                      </span>
                    )}
                  </div>

                  {/* Radio circle */}
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      isSelected
                        ? "border-sugu-500 bg-sugu-500"
                        : "border-gray-300",
                    )}
                  >
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add new method */}
          <button
            type="button"
            className="mt-3 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 text-left transition-all hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <Plus className="h-5 w-5 text-gray-400" />
            </div>
            <span className="text-sm text-gray-500">
              Ajouter une méthode de paiement
            </span>
          </button>
        </div>
      </div>

      {/* ── Right column: Recap card ── */}
      <div className="lg:col-span-5">
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Résumé du retrait
          </h3>

          <div className="mt-4 space-y-3">
            {/* Withdrawal amount */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Montant du retrait</span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(amount)} FCFA
              </span>
            </div>

            {/* Fee */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Frais de transfert ({WITHDRAWAL_FEE_PERCENT * 100}%)
              </span>
              <span className="text-sm font-bold text-red-500">
                -{formatCurrency(fee)} FCFA
              </span>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-200" />

            {/* Net amount */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Montant net reçu
              </span>
              <span className="text-lg font-black text-sugu-600">
                {formatCurrency(netAmount)} FCFA
              </span>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-200" />

            {/* Method */}
            {selectedMethod && selectedConfig && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Méthode</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${selectedConfig.bg} text-[8px] font-bold text-white`}
                    >
                      {selectedConfig.label}
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {selectedMethod.providerLabel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Compte</span>
                  <span className="text-sm text-gray-700">
                    {selectedMethod.accountMasked}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Délai estimé</span>
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600">
                    Instantané
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Processing time */}
          <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-50/60 px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="text-[11px] text-blue-600 lg:text-xs">
              Transfert instantané vers votre compte mobile
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
