"use client";

import Link from "next/link";
import { Plus, Landmark, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WithdrawFormData, WithdrawConfig, SharedPayoutSetting } from "./types";
import { WITHDRAWAL_FEE_PERCENT } from "./types";
import { WithdrawSummaryCard } from "./withdraw-summary-card";

interface StepMethodeProps {
  data: WithdrawFormData;
  onChange: (field: keyof WithdrawFormData, value: string) => void;
  payoutSettings: SharedPayoutSetting[];
  config: WithdrawConfig<unknown>;
}

export function StepMethode({
  data,
  onChange,
  payoutSettings,
  config,
}: StepMethodeProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;

  const isDriver = config.stepMethodeVariant === "driver";

  // Find selected method for summary
  const selectedMethod = payoutSettings.find(
    (ps) => ps.id === data.selectedPayoutSettingId,
  );

  const getProviderKey = (setting: SharedPayoutSetting): string => {
    if (isDriver) {
      return setting.provider ?? "orange_money";
    }
    return setting.type === "bank_transfer"
      ? "bank_transfer"
      : (setting.provider ?? "orange_money");
  };

  const selectedConfig = selectedMethod
    ? config.providerConfig[getProviderKey(selectedMethod)] ??
      config.providerConfig.orange_money
    : null;

  return (
    <div className={`grid grid-cols-1 gap-4 ${config.gridLayout}`}>
      {/* ── Left column: Payment method selection ── */}
      <div className={config.leftColSpan}>
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
          <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
            {isDriver ? "Méthode de paiement" : "Méthode de versement"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 lg:text-sm">
            Sélectionnez le compte sur lequel recevoir vos fonds
          </p>

          {/* Method cards */}
          <div className="mt-4 space-y-3">
            {/* Vendor empty state */}
            {!isDriver && payoutSettings.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    Aucune méthode de versement configurée
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Ajoutez un compte mobile ou bancaire pour recevoir vos
                    fonds.
                  </p>
                </div>
                {config.emptyStateSettingsHref && (
                  <Link
                    href={config.emptyStateSettingsHref}
                    className="mt-1 inline-flex items-center gap-1 rounded-lg bg-sugu-50 px-4 py-2 text-sm font-semibold text-sugu-600 transition-colors hover:bg-sugu-100"
                  >
                    Configurer une méthode →
                  </Link>
                )}
              </div>
            )}

            {payoutSettings.map((setting) => {
              const isSelected =
                data.selectedPayoutSettingId === setting.id;
              const providerKey = getProviderKey(setting);
              const pConfig =
                config.providerConfig[providerKey] ??
                config.providerConfig.orange_money;

              return (
                <button
                  key={setting.id}
                  type="button"
                  onClick={() =>
                    onChange("selectedPayoutSettingId", setting.id)
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all",
                    isSelected
                      ? "border-2 border-sugu-500 bg-sugu-50/30"
                      : isDriver
                        ? "border border-gray-200 bg-white/40 hover:border-gray-300"
                        : "border border-gray-200 bg-white/60 hover:border-gray-300 hover:shadow-sm",
                  )}
                >
                  {/* Radio left (vendor) */}
                  {config.radioPosition === "left" && (
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
                  )}

                  {/* Provider icon circle */}
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center text-white shadow-sm",
                      isDriver
                        ? "h-12 w-12 rounded-full text-sm font-bold"
                        : "h-10 w-10 rounded-lg text-xs font-bold",
                      pConfig.bg,
                    )}
                  >
                    {pConfig.useLucide ? (
                      <Landmark className="h-5 w-5" />
                    ) : (
                      pConfig.label
                    )}
                  </div>

                  {/* Provider info */}
                  <div className="min-w-0 flex-1">
                    {isDriver ? (
                      // Driver layout: simple
                      <>
                        <span className="text-sm font-semibold text-gray-800">
                          {setting.providerLabel}
                        </span>
                        <p className="text-xs text-gray-400">
                          {setting.accountMasked}
                        </p>
                        {setting.isDefault && (
                          <span className="mt-0.5 inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                            {config.defaultBadgeText}
                          </span>
                        )}
                      </>
                    ) : (
                      // Vendor layout: richer
                      <>
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
                              {config.defaultBadgeText}
                            </span>
                          )}
                          {setting.bankName && (
                            <span className="text-xs text-gray-500">
                              {setting.bankName},
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Vendor: account + date on the right */}
                  {!isDriver && (
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-gray-800">
                        {setting.accountMasked}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {setting.type === "bank_transfer"
                          ? "Ajouté le"
                          : "Modifié le"}{" "}
                        {setting.addedDate}
                      </p>
                    </div>
                  )}

                  {/* Radio right (driver) */}
                  {config.radioPosition === "right" && (
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
                  )}
                </button>
              );
            })}
          </div>

          {/* Add new method */}
          {config.addMethodStyle === "card" ? (
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
          ) : (
            <button
              type="button"
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-sugu-500 transition-colors hover:text-sugu-600"
            >
              <Plus className="h-4 w-4" />
              Ajouter une nouvelle méthode
            </button>
          )}
        </div>
      </div>

      {/* ── Right column: Recap card ── */}
      <div className={config.rightColSpan}>
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-5">
          <h3
            className={cn(
              "font-semibold text-gray-900",
              isDriver ? "text-sm" : "text-base",
            )}
          >
            {config.recapTitle}
          </h3>

          <div className="mt-4">
            <WithdrawSummaryCard
              amount={amount}
              fee={fee}
              netAmount={netAmount}
              netColorClass={isDriver ? "text-sugu-600" : "text-green-600"}
            />
          </div>

          {/* Driver-only: method + account in recap */}
          {isDriver && selectedMethod && selectedConfig && (
            <div className="mt-3 space-y-3">
              <div className="border-t border-dashed border-gray-200" />
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
            </div>
          )}

          {/* Processing time info */}
          <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-50/60 px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="text-[11px] text-blue-600 lg:text-xs">
              {config.infoBannerText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
