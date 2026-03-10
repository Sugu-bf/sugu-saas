"use client";

import { Wallet, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WithdrawFormData } from "./types";
import { MIN_WITHDRAWAL_AMOUNT, WITHDRAWAL_FEE_PERCENT, QUICK_AMOUNTS } from "./types";

interface StepMontantProps {
  data: WithdrawFormData;
  onChange: (field: keyof WithdrawFormData, value: string) => void;
  availableBalance: number;
}

export function StepMontant({ data, onChange, availableBalance }: StepMontantProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;
  const remaining = availableBalance - amount;
  const withdrawPercent = availableBalance > 0 ? Math.min((amount / availableBalance) * 100, 100) : 0;

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
              Solde disponible : <strong className="text-gray-700">{formatCurrency(availableBalance)} FCFA</strong>
            </span>
          </div>

          {/* Big centered input */}
          <div className="mt-6 flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              value={data.amount ? formatCurrency(parseInt(data.amount, 10)) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                onChange("amount", raw);
              }}
              placeholder="0"
              className="w-full border-0 border-b-2 border-sugu-500 bg-transparent text-center text-5xl font-black text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
              autoFocus
            />
            <span className="mt-2 text-base font-medium text-gray-500">FCFA</span>
          </div>

          {/* Quick amount pills */}
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {QUICK_AMOUNTS.map((qa) => {
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
              onClick={() => onChange("amount", String(availableBalance))}
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
                min={MIN_WITHDRAWAL_AMOUNT}
                max={availableBalance}
                step={1000}
                value={amount || MIN_WITHDRAWAL_AMOUNT}
                onChange={(e) => onChange("amount", e.target.value)}
                className="earnings-range-slider w-full"
              />
              {/* Custom track fill */}
              <div className="pointer-events-none absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-gray-200 w-full">
                <div
                  className="h-full rounded-full bg-sugu-500"
                  style={{ width: `${withdrawPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
              <span>{formatCurrency(MIN_WITHDRAWAL_AMOUNT)} FCFA</span>
              <span>{formatCurrency(availableBalance)} FCFA</span>
            </div>
          </div>

          {/* Info note */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <span className="text-xs text-amber-700">
              Seuil minimum de retrait : <strong>{formatCurrency(MIN_WITHDRAWAL_AMOUNT)} FCFA</strong>
            </span>
          </div>

          {/* Validation messages */}
          {amount > 0 && amount < MIN_WITHDRAWAL_AMOUNT && (
            <p className="mt-2 text-xs font-medium text-red-500">
              Le montant minimum est de {formatCurrency(MIN_WITHDRAWAL_AMOUNT)} FCFA
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
              <span className="text-xs font-semibold text-gray-500">FCFA</span>
            </div>
          </div>

          <div className="my-3 border-t border-gray-200/60" />

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Frais de transfert ({WITHDRAWAL_FEE_PERCENT * 100}%)
              </span>
              <span className="text-sm font-bold text-red-500">
                -{formatCurrency(fee)} FCFA
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Montant net reçu
              </span>
              <span className="text-lg font-black text-sugu-600">
                {formatCurrency(Math.max(netAmount, 0))} FCFA
              </span>
            </div>
          </div>

          <div className="my-3 border-t border-gray-200/60" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Solde après retrait</span>
            <span className="text-sm font-bold text-gray-800">
              {formatCurrency(Math.max(remaining, 0))} FCFA
            </span>
          </div>

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
              <span className="text-sugu-600 font-medium">Retrait</span>
              <span className="text-green-600 font-medium">Restant</span>
            </div>
          </div>
        </div>

        {/* Donut chart card */}
        <div className="glass-card rounded-2xl p-4 lg:rounded-3xl">
          <h4 className="text-xs font-semibold text-gray-500">Votre solde</h4>
          <div className="mt-3 flex items-center gap-4">
            {/* SVG Donut */}
            <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
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
              <text x="40" y="44" textAnchor="middle" className="fill-gray-900 text-xs font-bold">
                {Math.round(withdrawPercent)}%
              </text>
            </svg>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">Retrait</p>
                <p className="text-sm font-bold text-sugu-600">{formatCurrency(amount)} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Restant</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(Math.max(remaining, 0))} FCFA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
