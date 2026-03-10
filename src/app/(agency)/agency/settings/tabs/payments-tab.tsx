"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, Banknote, Wallet, CreditCard, BookOpen, Save, Loader2 } from "lucide-react";
import type { AgencySettingsResponse } from "@/features/agency/schema";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200", checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600")}>
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

type PayMethod = "orange" | "wave" | "bank";

interface PaymentsTabProps {
  data: AgencySettingsResponse;
  onSave: (payload: UpdateAgencySettingsPayload) => void;
  isSaving: boolean;
}

export function PaymentsTab({ data, onSave, isSaving }: PaymentsTabProps) {
  // Initialize from API data or defaults
  const apiSettings = data.paymentSettings;
  const [method, setMethod] = useState<PayMethod>(
    (apiSettings?.method as PayMethod) ?? "orange",
  );
  const [phoneNumber, setPhoneNumber] = useState(
    apiSettings?.phoneNumber ?? data.phonePrimary ?? "",
  );
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    (apiSettings?.frequency as "daily" | "weekly" | "monthly") ?? "weekly",
  );
  const [autoTransfer, setAutoTransfer] = useState(apiSettings?.autoTransfer ?? true);
  const [minAmount, setMinAmount] = useState(apiSettings?.minAmount ?? "5,000 FCFA");

  // Bank details
  const [bankName, setBankName] = useState(apiSettings?.bankDetails?.bank ?? "");
  const [accountNumber, setAccountNumber] = useState(apiSettings?.bankDetails?.accountNumber ?? "");
  const [iban, setIban] = useState(apiSettings?.bankDetails?.iban ?? "");

  const handleSave = () => {
    onSave({
      paymentSettings: {
        method,
        phoneNumber,
        frequency,
        autoTransfer,
        minAmount,
        bankDetails: {
          bank: bankName,
          accountNumber,
          iban,
        },
      },
    });
  };

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
            <Wallet className="h-5 w-5 text-orange-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Orange Money</p>
              <p className="text-[10px] text-gray-400">{phoneNumber || "Non configuré"}</p>
            </div>
            {phoneNumber && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">
                <CheckCircle2 className="h-3 w-3" />
                Vérifié
              </span>
            )}
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
            <CreditCard className="h-5 w-5 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Wave</p>
              <p className="text-[10px] text-gray-400">{phoneNumber || "Non configuré"}</p>
            </div>
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
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="form-input py-1.5 text-xs"
                  >
                    <option value="">Sélectionner</option>
                    <option value="BDM-SA">BDM-SA</option>
                    <option value="BMS-SA">BMS-SA</option>
                    <option value="BNDA">BNDA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">N° compte</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="form-input py-1.5 text-xs"
                    placeholder="N° de compte"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="form-input py-1.5 text-xs"
                    placeholder="IBAN"
                  />
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Phone number field when Orange/Wave selected */}
        {method !== "bank" && (
          <div className="mt-3 max-w-xs">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Numéro de téléphone</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="form-input py-2 text-sm"
              placeholder="+223 76 45 23 18"
            />
          </div>
        )}
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
        <div className="max-w-xs mb-3">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Montant minimum de versement</label>
          <input
            type="text"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="form-input py-2 text-sm"
          />
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
          <BookOpen className="mr-1 inline h-3.5 w-3.5" /> Voir le détail des frais →
        </button>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-sugu-600",
            isSaving && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? "Sauvegarde…" : "Sauvegarder les paiements"}
        </button>
      </div>
    </div>
  );
}
