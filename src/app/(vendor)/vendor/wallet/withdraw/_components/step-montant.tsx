"use client";

import { Wallet, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { WithdrawFormData } from "./types";
import { INPUT_CLASS, LABEL_CLASS, MIN_WITHDRAWAL_AMOUNT, WITHDRAWAL_FEE_PERCENT } from "./types";

interface StepMontantProps {
  data: WithdrawFormData;
  onChange: (field: keyof WithdrawFormData, value: string) => void;
  availableBalance: number;
}

const QUICK_PERCENTS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Max", value: 1 },
] as const;

export function StepMontant({ data, onChange, availableBalance }: StepMontantProps) {
  const amount = parseFloat(data.amount) || 0;
  const fee = Math.round(amount * WITHDRAWAL_FEE_PERCENT);
  const netAmount = amount - fee;

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
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
            <span>+12.5% ce mois</span>
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
          <strong>{formatCurrency(MIN_WITHDRAWAL_AMOUNT)} FCFA</strong>
        </span>
      </div>

      {/* ── Amount Input ── */}
      <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
        <label htmlFor="withdraw-amount" className={LABEL_CLASS}>
          Montant à retirer (FCFA)
        </label>
        <input
          id="withdraw-amount"
          type="text"
          inputMode="numeric"
          placeholder="150,000"
          value={data.amount}
          onChange={(e) => {
            // Allow only digits
            const raw = e.target.value.replace(/[^\d]/g, "");
            onChange("amount", raw);
          }}
          className={`${INPUT_CLASS} text-lg font-bold lg:text-xl`}
          autoFocus
        />

        {/* Quick-select pills */}
        <div className="mt-3 flex gap-2">
          {QUICK_PERCENTS.map((opt) => {
            const calcValue = Math.floor(availableBalance * opt.value);
            const isActive = data.amount === String(calcValue);
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange("amount", String(calcValue))}
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

      {/* ── Preview (net amount) ── */}
      {amount >= MIN_WITHDRAWAL_AMOUNT && amount <= availableBalance && (
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
            Après frais de transfert ({WITHDRAWAL_FEE_PERCENT * 100}%)
          </p>
        </div>
      )}
    </div>
  );
}
