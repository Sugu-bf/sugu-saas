"use client";

import {
  Banknote,
  Receipt,
  ArrowDownToLine,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { WITHDRAWAL_FEE_PERCENT } from "./types";

interface WithdrawSummaryCardProps {
  amount: number;
  fee: number;
  netAmount: number;
  /** "full" shows Lucide icons on each row (driver confirmation) */
  variant?: "compact" | "full";
  /** Show remaining balance row */
  remaining?: number;
  /** Title override */
  title?: string;
  /** Net color override */
  netColorClass?: string;
}

export function WithdrawSummaryCard({
  amount,
  fee,
  netAmount,
  variant = "compact",
  remaining,
  title,
  netColorClass = "text-sugu-600",
}: WithdrawSummaryCardProps) {
  if (variant === "full") {
    return (
      <div className="space-y-0 rounded-xl bg-white/40 p-5">
        {/* Amount */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <Banknote className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Montant</span>
          </div>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(amount)} FCFA
          </span>
        </div>

        <div className="border-t border-gray-200/40" />

        {/* Fee */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <Receipt className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Frais ({WITHDRAWAL_FEE_PERCENT * 100}%)
            </span>
          </div>
          <span className="text-sm font-medium text-gray-500">
            {formatCurrency(fee)} FCFA
          </span>
        </div>

        <div className="border-t border-gray-200/40" />

        {/* Net amount */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <ArrowDownToLine className="h-4 w-4 text-sugu-500" />
            <span className="text-sm font-semibold text-gray-700">
              Montant net reçu
            </span>
          </div>
          <span className={`text-lg font-black ${netColorClass}`}>
            {formatCurrency(netAmount)} FCFA
          </span>
        </div>

        {remaining !== undefined && (
          <>
            <div className="border-t border-gray-200/40" />
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Solde restant</span>
              </div>
              <span className="text-sm font-bold text-gray-700">
                {formatCurrency(Math.max(remaining, 0))} FCFA
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Compact variant (default) ──────────────────────────────
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      )}

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
        <span className={`text-lg font-black ${netColorClass}`}>
          {formatCurrency(netAmount)} FCFA
        </span>
      </div>

      {remaining !== undefined && (
        <>
          <div className="border-t border-dashed border-gray-200" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Solde après retrait</span>
            <span className="text-sm font-bold text-gray-800">
              {formatCurrency(Math.max(remaining, 0))} FCFA
            </span>
          </div>
        </>
      )}
    </div>
  );
}
