"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, Banknote } from "lucide-react";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200", checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600")}>
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

type PayMethod = "orange" | "wave" | "bank";

export function PaymentsTab() {
  const [method, setMethod] = useState<PayMethod>("orange");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [autoTransfer, setAutoTransfer] = useState(true);

  return (
    <div className="space-y-4">
      {/* Méthode de versement */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Méthode de versement
        </h3>
        <div className="space-y-2.5">
          {/* Orange Money */}
          <button
            onClick={() => setMethod("orange")}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
              method === "orange"
                ? "border-sugu-400 ring-2 ring-sugu-200 bg-sugu-50/30 dark:ring-sugu-900/50 dark:bg-sugu-950/10"
                : "border-gray-200 bg-white/60 dark:border-gray-800 dark:bg-gray-900/40",
            )}
          >
            <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", method === "orange" ? "border-sugu-500" : "border-gray-300")}>
              {method === "orange" && <div className="h-2 w-2 rounded-full bg-sugu-500" />}
            </div>
            <span className="text-xl">🟠</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Orange Money</p>
              <p className="text-[10px] text-gray-400">+223 76 45 23 18</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">
              <CheckCircle2 className="h-3 w-3" />
              Vérifié
            </span>
          </button>

          {/* Wave */}
          <button
            onClick={() => setMethod("wave")}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
              method === "wave"
                ? "border-sugu-400 ring-2 ring-sugu-200 bg-sugu-50/30 dark:ring-sugu-900/50"
                : "border-gray-200 bg-white/60 dark:border-gray-800 dark:bg-gray-900/40",
            )}
          >
            <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", method === "wave" ? "border-sugu-500" : "border-gray-300")}>
              {method === "wave" && <div className="h-2 w-2 rounded-full bg-sugu-500" />}
            </div>
            <span className="text-xl">🔵</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Wave</p>
              <p className="text-[10px] text-gray-400">+223 76 45 23 18</p>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800">
              Non vérifié
            </span>
          </button>

          {/* Virement bancaire */}
          <button
            onClick={() => setMethod("bank")}
            className={cn(
              "w-full flex flex-col gap-3 rounded-xl border p-4 text-left transition-all",
              method === "bank"
                ? "border-sugu-400 ring-2 ring-sugu-200 bg-sugu-50/30 dark:ring-sugu-900/50"
                : "border-gray-200 bg-white/60 dark:border-gray-800 dark:bg-gray-900/40",
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", method === "bank" ? "border-sugu-500" : "border-gray-300")}>
                {method === "bank" && <div className="h-2 w-2 rounded-full bg-sugu-500" />}
              </div>
              <Banknote className="h-5 w-5 text-gray-400" />
              <p className="text-xs font-bold text-gray-900 dark:text-white">Virement bancaire</p>
            </div>
            {method === "bank" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 ml-7">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Banque</label>
                  <select className="form-input py-1.5 text-xs">
                    <option>BDM-SA</option>
                    <option>BMS-SA</option>
                    <option>BNDA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">N° compte</label>
                  <input type="text" className="form-input py-1.5 text-xs" placeholder="N° de compte" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">IBAN</label>
                  <input type="text" className="form-input py-1.5 text-xs" placeholder="IBAN" />
                </div>
              </div>
            )}
          </button>
        </div>
      </section>

      {/* Fréquence de versement */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Fréquence de versement
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {([["daily", "Quotidien"], ["weekly", "Hebdomadaire"], ["monthly", "Mensuel"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFrequency(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                frequency === key
                  ? "bg-sugu-500 text-white shadow-sm"
                  : "bg-white/60 text-gray-600 border border-gray-200 hover:bg-white dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mb-3">
          Prochain versement : <span className="font-semibold text-gray-600 dark:text-gray-300">Lundi 28 Février 2026</span>
        </p>
        <div className="max-w-xs mb-3">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Montant minimum de versement</label>
          <input type="text" defaultValue="5,000 FCFA" className="form-input py-2 text-sm" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">Versement automatique</span>
          <Toggle checked={autoTransfer} onChange={() => setAutoTransfer(!autoTransfer)} label="Auto versement" />
        </div>
      </section>

      {/* Commission SUGU */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Commission SUGU
        </h3>
        <div className="space-y-2 rounded-xl bg-gray-50/80 p-4 dark:bg-gray-900/60">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Info className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>Commission SUGU : <span className="font-bold text-gray-900 dark:text-white">5%</span> par livraison</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Info className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>Frais de transfert : <span className="font-bold text-gray-900 dark:text-white">150 FCFA</span> par versement</span>
          </div>
        </div>
        <button className="mt-3 text-xs font-semibold text-sugu-500 hover:text-sugu-600">
          📖 Voir le détail des frais →
        </button>
      </section>
    </div>
  );
}
