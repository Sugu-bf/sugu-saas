"use client";

import { useState, useEffect } from "react";
import { SectionCard, Toggle, PillInput, PillButton, Field } from "./settings-ui";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { useUpdateLegal, useVendorSettings } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 9 — Mentions légales
// ────────────────────────────────────────────────────────────

const LEGAL_DOCS = [
  { title: "Conditions Générales de Vente (CGV)", description: "Règles applicables à toutes les transactions sur la marketplace SUGU.", url: "#" },
  { title: "Politique de Confidentialité", description: "Comment SUGU collecte, utilise et protège vos données personnelles.", url: "#" },
  { title: "Conditions Générales d'Utilisation (CGU)", description: "Règles d'utilisation de la plateforme SUGU Pro.", url: "#" },
  { title: "Politique de Livraison & Retours", description: "Conditions de livraison, retours et remboursements.", url: "#" },
  { title: "Politique Anti-Fraude", description: "Mesures de protection contre la fraude et les abus.", url: "#" },
];

export function TabLegal() {
  const { data: settingsData } = useVendorSettings();
  const apiLegal = settingsData?.legal;

  const [businessName, setBusinessName] = useState(apiLegal?.businessName ?? "");
  const [legalStatus, setLegalStatus] = useState(apiLegal?.legalStatus ?? "Individual");
  const [taxId, setTaxId] = useState(apiLegal?.taxId ?? "");
  const [rccm, setRccm] = useState(apiLegal?.rccm ?? "");
  const [ninea, setNinea] = useState(apiLegal?.ninea ?? "");
  const [cgvAccepted, setCgvAccepted] = useState(apiLegal?.termsAccepted ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateLegalMutation = useUpdateLegal();

  // Sync form state when API data loads/updates
  useEffect(() => {
    if (apiLegal) {
      setBusinessName(apiLegal.businessName ?? "");
      setLegalStatus(apiLegal.legalStatus ?? "Individual");
      setTaxId(apiLegal.taxId ?? "");
      setRccm(apiLegal.rccm ?? "");
      setNinea(apiLegal.ninea ?? "");
      setCgvAccepted(apiLegal.termsAccepted ?? true);
    }
  }, [apiLegal]);

  const handleSaveLegal = async () => {
    try {
      await updateLegalMutation.mutateAsync({
        businessName: businessName || undefined,
        legalStatus: legalStatus || undefined,
        taxId: taxId || undefined,
        rccm: rccm || undefined,
        ninea: ninea || undefined,
        termsAccepted: cgvAccepted,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[legal] Save failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Informations légales ─── */}
      <SectionCard title="Informations légales de l'entreprise" id="legal-info">
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Raison sociale">
            <PillInput value={businessName} onChange={setBusinessName} placeholder="Nom de l'entreprise" />
          </Field>
          <Field label="Statut juridique">
            <PillInput value={legalStatus} onChange={setLegalStatus} placeholder="Individual, SARL, SA…" />
          </Field>
          <Field label="Numéro fiscal (IFU)">
            <PillInput value={taxId} onChange={setTaxId} placeholder="Numéro d'identification fiscale" />
          </Field>
          <Field label="RCCM">
            <PillInput value={rccm} onChange={setRccm} placeholder="Registre du commerce" />
          </Field>
          <Field label="NINEA">
            <PillInput value={ninea} onChange={setNinea} placeholder="Numéro d'identification" />
          </Field>
        </div>
      </SectionCard>

      {/* ─── Card 2: Documents légaux ─── */}
      <SectionCard title="Documents légaux" id="legal-docs">
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Consultez les documents juridiques régissant l&apos;utilisation de la plateforme SUGU Pro.
        </p>
        <div className="mt-5 space-y-3">
          {LEGAL_DOCS.map((doc) => (
            <a
              key={doc.title}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/30 p-4 backdrop-blur transition-all hover:border-sugu-300 hover:shadow-sm dark:border-gray-700/50 dark:bg-gray-800/20 dark:hover:border-sugu-700"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sugu-50 text-sugu-500 dark:bg-sugu-950/30 dark:text-sugu-400">
                <ExternalLink className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{doc.title}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{doc.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400" />
            </a>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 dark:bg-gray-800/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                J&apos;accepte les CGV mises à jour (v2.1)
              </span>
            </div>
          </div>
          <Toggle checked={cgvAccepted} onChange={() => setCgvAccepted(!cgvAccepted)} label="Accepter les CGV" />
        </div>
      </SectionCard>

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-3">
        <PillButton
          variant="primary"
          onClick={handleSaveLegal}
          disabled={updateLegalMutation.isPending}
        >
          {updateLegalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder les informations légales
        </PillButton>
        {saveSuccess && (
          <span className="text-xs text-green-600">✅ Informations sauvegardées</span>
        )}
      </div>
    </div>
  );
}
