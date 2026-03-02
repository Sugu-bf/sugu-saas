"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, Toggle, PillInput, PillBadge, PillButton, InfoLine, Field } from "./settings-ui";
import { Download, Smartphone, Building2 } from "lucide-react";
import { useVendorSettings } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 2 — Paiements & Facturation
// ────────────────────────────────────────────────────────────

type PaymentMethod = "orange" | "wave" | "bank";
type PayoutFrequency = "daily" | "weekly" | "monthly";

const INVOICES = [
  { date: "24 Fév 2026", ref: "INV-2026-0024", amount: "245 800", commission: "19 664", net: "226 136", status: "paid" as const },
  { date: "17 Fév 2026", ref: "INV-2026-0017", amount: "189 300", commission: "15 144", net: "174 156", status: "paid" as const },
  { date: "10 Fév 2026", ref: "INV-2026-0010", amount: "312 500", commission: "25 000", net: "287 500", status: "paid" as const },
  { date: "03 Fév 2026", ref: "INV-2026-0003", amount: "156 900", commission: "12 552", net: "144 348", status: "pending" as const },
  { date: "28 Jan 2026", ref: "INV-2026-0028", amount: "278 400", commission: "22 272", net: "256 128", status: "scheduled" as const },
  { date: "21 Jan 2026", ref: "INV-2026-0021", amount: "198 700", commission: "15 896", net: "182 804", status: "paid" as const },
];

const STATUS_BADGE = { paid: "green", pending: "amber", scheduled: "blue" } as const;
const STATUS_LABEL = { paid: "Payé", pending: "En attente", scheduled: "Programmé" } as const;

export function TabPayments() {
  const { data: settingsData } = useVendorSettings();
  const apiPayment = settingsData?.operations?.payment;

  // Determine initial payment method from API
  const initialMethod: PaymentMethod = apiPayment?.orangeMoney ? "orange" : apiPayment?.wave ? "wave" : "orange";

  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [orangeNum, setOrangeNum] = useState(settingsData?.profile?.phone ?? "");
  const [waveNum, setWaveNum] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [iban, setIban] = useState("");
  const [frequency, setFrequency] = useState<PayoutFrequency>("weekly");
  const [minPayout, setMinPayout] = useState("5 000");
  const [autoPayout, setAutoPayout] = useState(true);

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Méthode de paiement ─── */}
      <SectionCard title="Méthode de paiement principale" id="payment-method">
        <div className="mt-5 space-y-3">
          {/* Orange Money */}
          <PaymentMethodCard
            selected={method === "orange"}
            onSelect={() => setMethod("orange")}
            icon={<Smartphone className="h-5 w-5 text-orange-500" />}
            name="Orange Money"
            description="Paiement mobile via Orange Money"
          >
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <PillInput value={orangeNum} onChange={setOrangeNum} className="max-w-[200px]" prefix="🇲🇱" />
              <PillBadge variant="green">✅ Vérifié</PillBadge>
            </div>
          </PaymentMethodCard>

          {/* Wave */}
          <PaymentMethodCard
            selected={method === "wave"}
            onSelect={() => setMethod("wave")}
            icon={<Smartphone className="h-5 w-5 text-blue-500" />}
            name="Wave"
            description="Paiement mobile via Wave"
          >
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <PillInput value={waveNum} onChange={setWaveNum} placeholder="+223 XX XX XX XX" className="max-w-[200px]" />
              <PillButton variant="outline" size="sm">Vérifier</PillButton>
            </div>
          </PaymentMethodCard>

          {/* Virement bancaire */}
          <PaymentMethodCard
            selected={method === "bank"}
            onSelect={() => setMethod("bank")}
            icon={<Building2 className="h-5 w-5 text-gray-500" />}
            name="Virement bancaire"
            description="Virement sur compte bancaire"
          >
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Nom de la banque">
                <PillInput value={bankName} onChange={setBankName} />
              </Field>
              <Field label="Numéro de compte">
                <PillInput value={bankAccount} onChange={setBankAccount} placeholder="XXXX XXXX XXXX" />
              </Field>
              <Field label="Code IBAN">
                <PillInput value={iban} onChange={setIban} placeholder="ML XX XXXX..." />
              </Field>
            </div>
          </PaymentMethodCard>
        </div>
      </SectionCard>

      {/* ─── Card 2: Commission & Frais ─── */}
      <SectionCard title="Commission & Frais" id="commission-fees">
        <div className="mt-4 space-y-2">
          <InfoLine label="Commission SUGU" value="8%" tooltip="Calculée sur le montant HT de chaque commande livrée" />
          <InfoLine label="Commission sur livraison" value="2%" />
          <InfoLine label="Frais de transfert" value="150 FCFA par virement" />
        </div>
        <button className="mt-3 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400">
          📖 Voir le détail complet des frais →
        </button>
      </SectionCard>

      {/* ─── Card 3: Fréquence de versement ─── */}
      <SectionCard title="Fréquence de versement" id="payout-frequency">
        <div className="mt-4 flex flex-wrap gap-2">
          {(["daily", "weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-all",
                frequency === f
                  ? "bg-gradient-to-r from-sugu-500 to-sugu-600 text-white shadow-sm shadow-sugu-500/20"
                  : "border border-gray-300 bg-white/50 text-gray-600 backdrop-blur hover:border-sugu-300 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300",
              )}
            >
              {f === "daily" ? "Quotidien" : f === "weekly" ? "Hebdomadaire" : "Mensuel"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Prochain versement : <span className="font-semibold text-gray-700 dark:text-gray-200">Lundi 28 Février 2026</span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Montant minimum de versement">
            <PillInput value={minPayout} onChange={setMinPayout} suffix={<span className="text-xs text-gray-400">FCFA</span>} />
          </Field>
          <div className="flex items-center gap-3 self-end pb-1">
            <Toggle checked={autoPayout} onChange={() => setAutoPayout(!autoPayout)} label="Versement automatique" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Versement automatique</span>
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 4: Historique des factures ─── */}
      <SectionCard title="Historique des factures" id="invoice-history">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Date", "Référence", "Montant", "Commission", "Net", "Statut", ""].map((h) => (
                  <th key={h} className="py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {INVOICES.map((inv) => (
                <tr key={inv.ref} className="transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                  <td className="py-3 text-gray-600 dark:text-gray-400">{inv.date}</td>
                  <td className="py-3 font-mono text-xs text-gray-500">{inv.ref}</td>
                  <td className="py-3 font-semibold text-gray-900 dark:text-white">{inv.amount} FCFA</td>
                  <td className="py-3 text-red-500">-{inv.commission}</td>
                  <td className="py-3 font-semibold text-green-600 dark:text-green-400">{inv.net} FCFA</td>
                  <td className="py-3"><PillBadge variant={STATUS_BADGE[inv.status]}>{STATUS_LABEL[inv.status]}</PillBadge></td>
                  <td className="py-3">
                    <button className="text-gray-400 transition-colors hover:text-sugu-500" aria-label="Télécharger PDF">
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between">
          <button className="text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400">
            Voir toutes les factures →
          </button>
          <PillButton variant="outline" size="sm">
            <Download className="h-3.5 w-3.5" />
            Télécharger tout (PDF)
          </PillButton>
        </div>
      </SectionCard>
    </div>
  );
}

/** Radio-selectable payment method card */
function PaymentMethodCard({
  selected,
  onSelect,
  icon,
  name,
  description,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  name: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-sugu-300 bg-sugu-50/30 shadow-sm shadow-sugu-500/10 dark:border-sugu-700 dark:bg-sugu-950/10"
          : "border-white/60 bg-white/30 backdrop-blur hover:border-gray-300 dark:border-gray-700/50 dark:bg-gray-800/20 dark:hover:border-gray-600",
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-sugu-500" : "border-gray-300 dark:border-gray-600",
        )}>
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-sugu-500" />}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 shadow-sm dark:bg-gray-800/60">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      {selected && children && <div className="ml-8 mt-2">{children}</div>}
    </button>
  );
}
