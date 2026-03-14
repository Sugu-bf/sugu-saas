"use client";

import { useRef, useCallback, useMemo } from "react";
import {
  ArrowUpRight,
  Lock,
  Shield,
  Loader2,
  Landmark,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  WithdrawFormData,
  WithdrawConfig,
  SharedPayoutSetting,
} from "./types";
import { WITHDRAWAL_FEE_PERCENT } from "./types";
import { WithdrawSummaryCard } from "./withdraw-summary-card";

interface StepConfirmationProps {
  data: WithdrawFormData;
  onChange?: (field: keyof WithdrawFormData, value: string) => void;
  selectedMethod: SharedPayoutSetting | undefined;
  availableBalance: number;
  isSubmitting: boolean;
  onSubmit?: () => void;
  config: WithdrawConfig<unknown>;
}

export function StepConfirmation(props: StepConfirmationProps) {
  if (props.config.stepConfirmationVariant === "rich") {
    return <StepConfirmationRich {...props} />;
  }
  return <StepConfirmationSimple {...props} />;
}

// ────────────────────────────────────────────────────────────
// RICH variant (Driver: 2 columns, PIN, inline CTA)
// ────────────────────────────────────────────────────────────

function StepConfirmationRich({
  data,
  onChange,
  selectedMethod,
  availableBalance,
  isSubmitting,
  onSubmit,
  config,
}: StepConfirmationProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;
  const remaining = availableBalance - amount;

  const providerKey = selectedMethod?.provider ?? "orange_money";
  const providerConfig =
    config.providerConfig[providerKey] ??
    config.providerConfig.orange_money;

  // PIN input refs
  const pinRef0 = useRef<HTMLInputElement>(null);
  const pinRef1 = useRef<HTMLInputElement>(null);
  const pinRef2 = useRef<HTMLInputElement>(null);
  const pinRef3 = useRef<HTMLInputElement>(null);
  const pinRefs = useMemo(
    () => [pinRef0, pinRef1, pinRef2, pinRef3],
    [pinRef0, pinRef1, pinRef2, pinRef3],
  );

  const handlePinInput = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const char = value.slice(-1);
      const currentPin = (data.pin ?? "").split("");
      currentPin[index] = char;
      const newPin = currentPin.join("").slice(0, 4);
      onChange?.("pin", newPin);

      if (char && index < 3) {
        pinRefs[index + 1].current?.focus();
      }
    },
    [data.pin, onChange, pinRefs],
  );

  const handlePinKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Backspace" &&
        !(data.pin ?? "")[index] &&
        index > 0
      ) {
        pinRefs[index - 1].current?.focus();
      }
    },
    [data.pin, pinRefs],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* ── Left Column: Confirmation ── */}
      <div className="lg:col-span-7">
        <div className="glass-card rounded-2xl p-6 lg:rounded-3xl lg:p-8">
          {/* Hero icon */}
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sugu-50">
              <ArrowUpRight className="h-8 w-8 text-sugu-500" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">
              Confirmer votre retrait
            </h3>
            <p className="mt-1 text-[13px] text-gray-500">
              Vérifiez les détails avant de valider
            </p>
          </div>

          {/* Summary inner card */}
          <div className="mt-6">
            <WithdrawSummaryCard
              amount={amount}
              fee={fee}
              netAmount={netAmount}
              remaining={Math.max(remaining, 0)}
              variant="full"
            />
          </div>

          {/* Method inner card */}
          {selectedMethod && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/30 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${providerConfig.bg} text-xs font-bold text-white`}
              >
                {providerConfig.label}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedMethod.providerLabel}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedMethod.accountMasked}
                </p>
              </div>
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-600">
                Instantané
              </span>
            </div>
          )}

          {/* PIN Section — only if config requires it */}
          {config.requiresPin && (
            <div className="mt-6">
              <p className="text-center text-[13px] font-semibold text-gray-700">
                Entrez votre code PIN pour confirmer
              </p>
              <div className="mt-3 flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={pinRefs[i]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={(data.pin ?? "")[i] ?? ""}
                    onChange={(e) =>
                      handlePinInput(i, e.target.value)
                    }
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    className="h-12 w-12 rounded-xl border border-gray-200 bg-white/50 text-center text-xl font-bold text-gray-900 transition-all focus:border-sugu-500 focus:outline-none focus:ring-2 focus:ring-sugu-500/20"
                  />
                ))}
              </div>
              <p className="mt-2 text-center">
                <button
                  type="button"
                  className="text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
                >
                  Code oublié ?
                </button>
              </p>
            </div>
          )}

          {/* CTA Button */}
          <button
            type="button"
            disabled={
              isSubmitting ||
              (config.requiresPin && (data.pin ?? "").length < 4)
            }
            onClick={onSubmit}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-sugu-500 py-3.5 text-base font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-sugu-600 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isSubmitting
              ? "Traitement en cours..."
              : `Confirmer le retrait de ${formatCurrency(netAmount)} FCFA`}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            <button
              type="button"
              className="transition-colors hover:text-gray-600"
            >
              Annuler
            </button>
          </p>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-400">
            En confirmant, le montant sera transféré instantanément sur
            votre compte{" "}
            {selectedMethod?.providerLabel ?? "mobile"}.
          </p>
        </div>
      </div>

      {/* ── Right Column: Summary + Security ── */}
      <div className="space-y-4 lg:col-span-5">
        {/* Summary recap */}
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Résumé final
          </h3>
          <div className="mt-4">
            <WithdrawSummaryCard
              amount={amount}
              fee={fee}
              netAmount={netAmount}
            />

            {selectedMethod && (
              <>
                <div className="mt-3 border-t border-dashed border-gray-200" />
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Méthode
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {selectedMethod.providerLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Compte
                    </span>
                    <span className="text-sm text-gray-700">
                      {selectedMethod.accountMasked}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security card */}
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <div>
              <p className="text-[13px] font-semibold text-gray-800">
                Transaction sécurisée
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
                Vos données sont chiffrées de bout en bout
              </p>
              <p className="mt-1 text-[10px] text-gray-300">
                Powered by SUGU Pay
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SIMPLE variant (Vendor: 1 column, no PIN, submit in parent nav)
// ────────────────────────────────────────────────────────────

function StepConfirmationSimple({
  data,
  selectedMethod,
  isSubmitting,
  config,
}: StepConfirmationProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;

  const providerKey = selectedMethod
    ? selectedMethod.type === "bank_transfer"
      ? "bank_transfer"
      : (selectedMethod.provider ?? "orange_money")
    : "orange_money";
  const providerConfig =
    config.providerConfig[providerKey] ??
    config.providerConfig.orange_money;

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
            <span className="text-base font-semibold text-gray-500">
              FCFA
            </span>
          </p>
        </div>

        {/* Breakdown */}
        <div className="mx-auto mt-5 max-w-sm">
          <WithdrawSummaryCard
            amount={amount}
            fee={fee}
            netAmount={netAmount}
            netColorClass="text-green-600"
          />
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
            <strong className="text-gray-700">
              24 à 48h ouvrées
            </strong>
          </p>
        </div>
      </div>

      {/* ── Security Notice ── */}
      <div className="glass-card flex items-start gap-3 rounded-2xl p-4 lg:rounded-3xl lg:p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Transaction sécurisée
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
            En confirmant, le montant de{" "}
            <strong className="text-gray-700">
              {formatCurrency(netAmount)} FCFA
            </strong>{" "}
            sera traité sous 24 à 48h ouvrées et transféré sur votre
            compte{" "}
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
