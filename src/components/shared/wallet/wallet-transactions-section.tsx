"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { WalletTransactionRow } from "./wallet-transaction-row";
import type {
  WalletTransaction,
  EntryTypeConfigItem,
  StatusDisplayItem,
  FilterOption,
} from "@/features/shared/wallet.types";

interface WalletTransactionsSectionProps {
  transactions: WalletTransaction[];
  filterOptions: readonly FilterOption[];
  entryTypeConfig: Record<string, EntryTypeConfigItem>;
  statusDisplay: Record<string, StatusDisplayItem>;
  getEntryCategory: (entry: WalletTransaction) => string;
  defaultCategory: string;
}

/** Full transactions section with filter pills, table header, rows, and footer */
export function WalletTransactionsSection({
  transactions,
  filterOptions,
  entryTypeConfig,
  statusDisplay,
  getEntryCategory,
  defaultCategory,
}: WalletTransactionsSectionProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredTransactions =
    activeFilter === "all"
      ? transactions
      : transactions.filter(
          (t) => getEntryCategory(t) === activeFilter,
        );

  return (
    <section
      className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
      aria-labelledby="transactions-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="transactions-title"
          className="text-base font-semibold text-gray-900 lg:text-lg"
        >
          Historique des transactions
        </h2>

        {/* Filter pills */}
        <div className="flex gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === opt.value
                  ? "border-sugu-200 bg-sugu-50 text-sugu-600"
                  : "border-gray-200 bg-white/50 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="mt-4 hidden items-center gap-4 border-b border-gray-200/60 px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider lg:flex">
        <span className="w-24">Date</span>
        <span className="flex-1">Description</span>
        <span className="w-20 text-center">Type</span>
        <span className="w-28 text-right">Montant</span>
        <span className="w-24 text-right">Statut</span>
      </div>

      {/* Transaction rows */}
      <div className="mt-2 space-y-0 lg:mt-0">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((entry) => (
            <WalletTransactionRow
              key={entry.id}
              entry={entry}
              entryTypeConfig={entryTypeConfig}
              statusDisplay={statusDisplay}
              defaultCategory={defaultCategory}
              getCategory={getEntryCategory}
            />
          ))
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">
            Aucune transaction trouvée
          </p>
        )}
      </div>

      {/* Footer link */}
      <div className="mt-4 flex justify-center border-t border-gray-100/60 pt-4">
        <button className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-sugu-500">
          Voir tout l&apos;historique
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
