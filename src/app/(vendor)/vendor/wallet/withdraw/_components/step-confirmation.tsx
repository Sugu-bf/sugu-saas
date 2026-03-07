"use client";

import { Shield, Landmark, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WithdrawFormData } from "./types";
import { WITHDRAWAL_FEE_PERCENT } from "./types";
import type { PayoutSetting } from "@/features/vendor/schema";

interface StepConfirmationProps {
  data: WithdrawFormData;
  selectedMethod: PayoutSetting | undefined;
  availableBalance: number;
  isSubmitting: boolean;
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

export function StepConfirmation({
  data,
  selectedMethod,
  isSubmitting,
}: StepConfirmationProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;

  const providerKey = selectedMethod
    ? selectedMethod.type === "bank_transfer"
      ? "bank_transfer"
      : (selectedMethod.provider ?? "orange_money")
    : "orange_money";
  const providerConfig = PROVIDER_CONFIG[providerKey] ?? PROVIDER_CONFIG.orange_money;

  return (
    <div className="space-y-4">
      {/* ── Summary Card ── */}
      <div className="glass-card rounded-2xl p-5 lg:rounded-3xl lg:p-6">
        <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
          Résumé de votre retrait
        </h3>

        {/* Amount */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">Montant du retrait</p>
          <p className="mt-1 text-3xl font-black text-gray-900 lg:text-4xl">
            {formatCurrency(amount)}{" "}
            <span className="text-base font-semibold text-gray-500">FCFA</span>
          </p>
        </div>

        {/* Breakdown */}
        <div className="mx-auto mt-5 max-w-sm space-y-3">
          {/* Fee */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Frais de transfert ({WITHDRAWAL_FEE_PERCENT * 100}%)</span>
            <span className="text-sm font-bold text-red-500">
              -{formatCurrency(fee)} FCFA
            </span>
          </div>

          <div className="border-t border-dashed border-gray-200" />

          {/* Net */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Montant net reçu
            </span>
            <span className="text-xl font-black text-green-600">
              {formatCurrency(netAmount)} FCFA
            </span>
          </div>
        </div>

        {/* Method display */}
        {selectedMethod && (
          <div className="mx-auto mt-5 max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Versé sur
            </p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-white/60 p-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm ${providerConfig.bg}`}
              >
                {providerConfig.useLucide ? (
                  <Landmark className="h-5 w-5" />
                ) : (
                  providerConfig.label
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedMethod.providerLabel}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedMethod.accountMasked}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing time */}
        <div className="mx-auto mt-4 max-w-sm text-center">
          <p className="text-xs text-gray-500">
            Délai estimé :{" "}
            <strong className="text-gray-700">24 à 48h ouvrées</strong>
          </p>
        </div>
      </div>

      {/* ── Security Notice ── */}
      <div className="glass-card flex items-start gap-3 rounded-2xl p-4 lg:rounded-3xl lg:p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Transaction sécurisée
          </p>
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
            En confirmant, le montant de{" "}
            <strong className="text-gray-700">{formatCurrency(netAmount)} FCFA</strong>{" "}
            sera traité sous 24 à 48h ouvrées et transféré sur votre compte{" "}
            <strong className="text-gray-700">
              {selectedMethod?.providerLabel ?? "sélectionné"}{" "}
              {selectedMethod?.accountMasked ?? ""}
            </strong>
            .
          </p>
        </div>
      </div>

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-sugu-200 bg-sugu-50/50 px-4 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-sugu-500" />
          <span className="text-sm font-semibold text-sugu-600">
            Traitement en cours…
          </span>
        </div>
      )}
    </div>
  );
}
