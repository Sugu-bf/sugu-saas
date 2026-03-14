"use client";

import { Wallet, AlertTriangle, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WithdrawFormData, WithdrawConfig } from "./types";
import { WITHDRAWAL_FEE_PERCENT } from "./types";
import { WithdrawSummaryCard } from "./withdraw-summary-card";

interface StepMontantProps {
  data: WithdrawFormData;
  onChange: (field: keyof WithdrawFormData, value: string) => void;
  availableBalance: number;
  config: WithdrawConfig<unknown>;
}

export function StepMontant(props: StepMontantProps) {
  if (props.config.stepMontantVariant === "rich") {
    return <StepMontantRich {...props} />;
  }
  return <StepMontantSimple {...props} />;
}

// ────────────────────────────────────────────────────────────
// RICH variant (Driver: 2 columns, big input, range slider, donut)
// ────────────────────────────────────────────────────────────

function StepMontantRich({
  data,
  onChange,
  availableBalance,
  config,
}: StepMontantProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;
  const remaining = availableBalance - amount;
  const withdrawPercent =
    availableBalance > 0
      ? Math.min((amount / availableBalance) * 100, 100)
      : 0;
  const quickAmounts = config.quickAmounts ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* ── Left Column ── */}
      <div className="space-y-4 lg:col-span-7">
        {/* Amount Input Card */}
        <div className="glass-card rounded-2xl p-6 lg:rounded-3xl">
          <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
            Combien souhaitez-vous retirer ?
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Wallet className="h-3.5 w-3.5" />
            <span>
              Solde disponible :{" "}
              <strong className="text-gray-700">
                {formatCurrency(availableBalance)} FCFA
              </strong>
            </span>
          </div>

          {/* Big centered input */}
          <div className="mt-6 flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              value={
                data.amount
                  ? formatCurrency(parseInt(data.amount, 10))
                  : ""
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                onChange("amount", raw);
              }}
              placeholder="0"
              className="w-full border-0 border-b-2 border-sugu-500 bg-transparent text-center text-5xl font-black text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
              autoFocus
            />
            <span className="mt-2 text-base font-medium text-gray-500">
              FCFA
            </span>
          </div>

          {/* Quick amount pills */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {quickAmounts.map((qa) => {
              const isActive = data.amount === String(qa);
              return (
                <button
                  key={qa}
                  type="button"
                  onClick={() => onChange("amount", String(qa))}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "border-2 border-sugu-500 bg-sugu-50/30 text-sugu-600"
                      : "border-gray-200 bg-white/50 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {formatCurrency(qa)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                onChange("amount", String(availableBalance))
              }
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                data.amount === String(availableBalance)
                  ? "border-2 border-sugu-500 bg-sugu-50/30 text-sugu-600"
                  : "border-gray-200 bg-white/50 text-gray-700 hover:border-gray-300"
              }`}
            >
              Tout ({formatCurrency(availableBalance)})
            </button>
          </div>

          {/* Range slider */}
          <div className="mt-5">
            <div className="relative">
              <input
                type="range"
                min={config.minWithdrawalAmount}
                max={availableBalance}
                step={1000}
                value={amount || config.minWithdrawalAmount}
                onChange={(e) => onChange("amount", e.target.value)}
                className="earnings-range-slider w-full"
              />
              {/* Custom track fill */}
              <div className="pointer-events-none absolute top-1/2 left-0 h-2 w-full -translate-y-1/2 rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-sugu-500"
                  style={{ width: `${withdrawPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
              <span>
                {formatCurrency(config.minWithdrawalAmount)} FCFA
              </span>
              <span>{formatCurrency(availableBalance)} FCFA</span>
            </div>
          </div>

          {/* Info note */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-xs text-amber-700">
              Seuil minimum de retrait :{" "}
              <strong>
                {formatCurrency(config.minWithdrawalAmount)} FCFA
              </strong>
            </span>
          </div>

          {/* Validation messages */}
          {amount > 0 && amount < config.minWithdrawalAmount && (
            <p className="mt-2 text-xs font-medium text-red-500">
              Le montant minimum est de{" "}
              {formatCurrency(config.minWithdrawalAmount)} FCFA
            </p>
          )}
          {amount > availableBalance && (
            <p className="mt-2 text-xs font-medium text-red-500">
              Le montant dépasse votre solde disponible
            </p>
          )}
        </div>
      </div>

      {/* ── Right Column: Summary ── */}
      <div className="space-y-4 lg:col-span-5">
        {/* Withdrawal summary */}
        <div className="glass-card rounded-2xl p-5 lg:rounded-3xl lg:p-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Résumé du retrait
          </h3>

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Montant du retrait
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[28px] font-black text-gray-900">
                {formatCurrency(amount)}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                FCFA
              </span>
            </div>
          </div>

          <div className="my-3 border-t border-gray-200/60" />

          <WithdrawSummaryCard
            amount={amount}
            fee={fee}
            netAmount={Math.max(netAmount, 0)}
            remaining={Math.max(remaining, 0)}
          />

          {/* Balance bar */}
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="flex h-full">
                <div
                  className="rounded-l-full bg-sugu-500 transition-all duration-300"
                  style={{ width: `${withdrawPercent}%` }}
                />
                <div
                  className="bg-green-400 transition-all duration-300"
                  style={{ width: `${100 - withdrawPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[10px]">
              <span className="font-medium text-sugu-600">Retrait</span>
              <span className="font-medium text-green-600">Restant</span>
            </div>
          </div>
        </div>

        {/* Donut chart card */}
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl">
          <h4 className="text-xs font-semibold text-gray-500">
            Votre solde
          </h4>
          <div className="mt-3 flex items-center gap-4">
            {/* SVG Donut */}
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              className="shrink-0"
            >
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="#f15412"
                strokeWidth="10"
                strokeDasharray={`${withdrawPercent * 1.884} ${188.4 - withdrawPercent * 1.884}`}
                strokeDashoffset="47.1"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="#4ade80"
                strokeWidth="10"
                strokeDasharray={`${(100 - withdrawPercent) * 1.884} ${188.4 - (100 - withdrawPercent) * 1.884}`}
                strokeDashoffset={`${47.1 - withdrawPercent * 1.884}`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              <text
                x="40"
                y="44"
                textAnchor="middle"
                className="fill-gray-900 text-xs font-bold"
              >
                {Math.round(withdrawPercent)}%
              </text>
            </svg>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Retrait</p>
                <p className="text-sm font-bold text-sugu-600">
                  {formatCurrency(amount)} FCFA
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Restant</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(Math.max(remaining, 0))} FCFA
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SIMPLE variant (Vendor: 1 column, balance card, percent pills)
// ────────────────────────────────────────────────────────────

function StepMontantSimple({
  data,
  onChange,
  availableBalance,
  config,
}: StepMontantProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;
  const quickPercents = config.quickPercents ?? [];

  return (
    <div className="space-y-4">
      {/* ── Balance Card ── */}
      <div className="glass-card flex items-center justify-between rounded-2xl p-4 lg:rounded-3xl lg:p-5">
        <div>
          <p className="text-xs font-medium text-gray-500 lg:text-sm">
            Solde disponible
          </p>
          <p className="mt-1 text-2xl font-black text-gray-900 lg:text-3xl">
            {formatCurrency(availableBalance)}{" "}
            <span className="text-base font-semibold text-gray-500 lg:text-lg">
              FCFA
            </span>
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white lg:h-14 lg:w-14">
          <Wallet className="h-6 w-6 lg:h-7 lg:w-7" />
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex items-center gap-2 px-1">
        <Info className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">
          Montant minimum de retrait :{" "}
          <strong>
            {formatCurrency(config.minWithdrawalAmount)} FCFA
          </strong>
        </span>
      </div>

      {/* ── Amount Input ── */}
      <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
        <label htmlFor="withdraw-amount" className={config.labelClass}>
          Montant à retirer (FCFA)
        </label>
        <input
          id="withdraw-amount"
          type="text"
          inputMode="numeric"
          placeholder="150,000"
          value={data.amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, "");
            onChange("amount", raw);
          }}
          className={`${config.inputClass} text-lg font-bold lg:text-xl`}
          autoFocus
        />

        {/* Quick-select pills */}
        <div className="mt-3 flex gap-2">
          {quickPercents.map((opt) => {
            const calcValue = Math.floor(
              availableBalance * opt.value,
            );
            const isActive = data.amount === String(calcValue);
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() =>
                  onChange("amount", String(calcValue))
                }
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-sugu-400 bg-sugu-50 text-sugu-600 shadow-sm"
                    : "border-gray-200 bg-white/60 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Validation message */}
        {amount > 0 && amount < config.minWithdrawalAmount && (
          <p className="mt-2 text-xs font-medium text-red-500">
            Le montant minimum est de{" "}
            {formatCurrency(config.minWithdrawalAmount)} FCFA
          </p>
        )}
        {amount > availableBalance && (
          <p className="mt-2 text-xs font-medium text-red-500">
            Le montant dépasse votre solde disponible
          </p>
        )}
      </div>

      {/* ── Preview (net amount) ── */}
      {amount >= config.minWithdrawalAmount &&
        amount <= availableBalance && (
          <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Vous recevrez estimé :
              </span>
              <span className="text-lg font-black text-green-600 lg:text-xl">
                ~{formatCurrency(netAmount)} FCFA
              </span>
            </div>
            <p className="mt-1 text-right text-[10px] text-gray-400 lg:text-xs">
              Après frais de transfert (
              {WITHDRAWAL_FEE_PERCENT * 100}%)
            </p>
          </div>
        )}
    </div>
  );
}
