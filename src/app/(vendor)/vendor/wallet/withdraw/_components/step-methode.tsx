"use client";

import Link from "next/link";
import { Plus, Landmark, Info, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { WithdrawFormData } from "./types";
import { WITHDRAWAL_FEE_PERCENT } from "./types";
import type { PayoutSetting } from "@/features/vendor/schema";

interface StepMethodeProps {
  data: WithdrawFormData;
  onChange: (field: keyof WithdrawFormData, value: string) => void;
  payoutSettings: PayoutSetting[];
}

/** Provider → icon config mapping */
const PROVIDER_CONFIG: Record<
  string,
  { bg: string; label: string; useLucide?: boolean }
> = {
  orange_money: { bg: "bg-orange-500", label: "OM" },
  moov_money: { bg: "bg-blue-500", label: "MM" },
  bank_transfer: { bg: "bg-gray-700", label: "", useLucide: true },
};

export function StepMethode({ data, onChange, payoutSettings }: StepMethodeProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* ── Left column: Payment method selection ── */}
      <div className="lg:col-span-3">
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
          <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
            Méthode de versement
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
            Sélectionnez le compte sur lequel recevoir vos fonds
          </p>

          {/* Radio cards */}
          <div className="mt-4 space-y-3">
            {payoutSettings.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Aucune méthode de versement configurée
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Ajoutez un compte mobile ou bancaire pour recevoir vos fonds.
                  </p>
                </div>
                <Link
                  href="/vendor/settings"
                  className="mt-1 inline-flex items-center gap-1 rounded-lg bg-sugu-50 px-4 py-2 text-sm font-semibold text-sugu-600 transition-colors hover:bg-sugu-100"
                >
                  Configurer une méthode →
                </Link>
              </div>
            )}
            {payoutSettings.map((setting) => {
              const isSelected = data.selectedPayoutSettingId === setting.id;
              const providerKey = setting.type === "bank_transfer"
                ? "bank_transfer"
                : (setting.provider ?? "orange_money");
              const config = PROVIDER_CONFIG[providerKey] ?? PROVIDER_CONFIG.orange_money;

              return (
                <button
                  key={setting.id}
                  type="button"
                  onClick={() => onChange("selectedPayoutSettingId", setting.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all",
                    isSelected
                      ? "border-2 border-sugu-500 bg-sugu-50/30"
                      : "border border-gray-200 bg-white/60 hover:border-gray-300 hover:shadow-sm",
                  )}
                >
                  {/* Radio circle */}
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      isSelected
                        ? "border-sugu-500"
                        : "border-gray-300",
                    )}
                  >
                    {isSelected && (
                      <div className="h-2.5 w-2.5 rounded-full bg-sugu-500" />
                    )}
                  </div>

                  {/* Provider icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm ${config.bg}`}
                  >
                    {config.useLucide ? (
                      <Landmark className="h-5 w-5" />
                    ) : (
                      config.label
                    )}
                  </div>

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {setting.providerLabel}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase text-sugu-500">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {setting.isDefault && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                          Par défaut
                        </span>
                      )}
                      {setting.bankName && (
                        <span className="text-xs text-gray-500">
                          {setting.bankName},
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account + date */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-800">
                      {setting.accountMasked}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {setting.type === "bank_transfer" ? "Ajouté le" : "Modifié le"}{" "}
                      {setting.addedDate}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add new method */}
          <button
            type="button"
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-sugu-500 transition-colors hover:text-sugu-600"
          >
            <Plus className="h-4 w-4" />
            Ajouter une nouvelle méthode
          </button>
        </div>
      </div>

      {/* ── Right column: Recap card ── */}
      <div className="lg:col-span-2">
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-5">
          <h3 className="text-base font-semibold text-gray-900">
            Récapitulatif
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
              <span className="text-lg font-black text-green-600">
                {formatCurrency(netAmount)} FCFA
              </span>
            </div>
          </div>

          {/* Processing time */}
          <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-50/60 px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="text-[11px] text-blue-600 lg:text-xs">
              Délai de traitement : 24 à 48h ouvrées
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
