"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, Toggle, PillInput, PillBadge, PillButton, InfoLine, Field } from "./settings-ui";
import { Download, Smartphone, Building2, Phone, CheckCircle2, Save, Loader2 } from "lucide-react";
import { useVendorSettings, useUpdateOperations } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 2 — Paiements & Facturation
// ────────────────────────────────────────────────────────────

type PaymentMethod = "orange" | "wave" | "bank";
type PayoutFrequency = "daily" | "weekly" | "monthly";

export function TabPayments() {
  const { data: settingsData } = useVendorSettings();
  const apiPayment = settingsData?.operations?.payment;
  const updateOperationsMutation = useUpdateOperations();

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
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when API data loads
  useEffect(() => {
    if (settingsData) {
      setOrangeNum(settingsData.profile.phone);
      const pm = settingsData.operations?.payment;
      if (pm?.orangeMoney) setMethod("orange");
      else if (pm?.wave) setMethod("wave");
    }
  }, [settingsData]);

  const handleSavePayment = async () => {
    try {
      await updateOperationsMutation.mutateAsync({
        payment: {
          cash: apiPayment?.cash ?? true,
          orangeMoney: method === "orange",
          wave: method === "wave",
          card: apiPayment?.card ?? false,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[payments] Save failed:", err);
    }
  };

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
              <PillInput value={orangeNum} onChange={setOrangeNum} className="max-w-[200px]" prefix={<Phone className="h-3.5 w-3.5 text-gray-400" />} />
              {settingsData?.profile?.phone && (
                <PillBadge variant="green"><CheckCircle2 className="inline h-3 w-3" /> Vérifié</PillBadge>
              )}
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
          <InfoLine label="Commission SUGU" value={`${settingsData?.operations?.preferences?.currency === "XOF" ? "8" : "8"}%`} tooltip="Calculée sur le montant HT de chaque commande livrée" />
          <InfoLine label="Commission sur livraison" value="2%" />
          <InfoLine label="Frais de transfert" value="150 FCFA par virement" />
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          Les taux de commission sont définis par SUGU et ne sont pas modifiables.
        </p>
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
        <div className="mt-4 py-8 text-center">
          <Download className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aucune facture disponible pour le moment.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Les factures apparaîtront ici après vos premières transactions.
          </p>
        </div>
      </SectionCard>

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-3">
        <PillButton
          variant="primary"
          onClick={handleSavePayment}
          disabled={updateOperationsMutation.isPending}
        >
          {updateOperationsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder les paiements
        </PillButton>
        {saveSuccess && (
          <span className="text-xs text-green-600"><CheckCircle2 className="inline h-3 w-3" /> Préférences sauvegardées</span>
        )}
      </div>
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
