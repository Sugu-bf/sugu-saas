"use client";

import { SectionCard, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { Download, Star, Check, CheckCircle2 } from "lucide-react";
import { useVendorSettings } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 8 — Mon abonnement
// ────────────────────────────────────────────────────────────

const PRO_BENEFITS = [
  { label: "Produits illimités" },
  { label: "Analytics avancés" },
  { label: "Support prioritaire" },
  { label: "Badge vendeur vérifié sur la marketplace" },
  { label: "Priorité dans les résultats de recherche" },
  { label: "Codes promo & promotions" },
  { label: "Export CSV/PDF illimité" },
];



export function TabSubscription() {
  const { data: settingsData } = useVendorSettings();

  // From API: account.plan ('free' | 'pro' | 'enterprise') and account.createdAt
  const currentPlan = (settingsData as unknown as { account?: { plan?: string } })?.account?.plan ?? "free";
  const isPro = currentPlan === "pro";
  const isFree = currentPlan === "free";

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Plan actuel ─── */}
      <SectionCard title="" id="current-plan" className="ring-1 ring-sugu-200/50 dark:ring-sugu-900/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-sugu-600 dark:text-sugu-400">
                Plan {isPro ? "Pro" : isFree ? "Gratuit" : "Enterprise"}
              </h2>
              {isPro && <Star className="h-5 w-5 fill-sugu-400 text-sugu-400" />}
            </div>
            <p className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">
              {isPro ? "14 900" : isFree ? "0" : "Sur devis"} <span className="text-sm font-semibold text-gray-500">FCFA / mois</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <PillBadge variant="green"><CheckCircle2 className="inline h-3 w-3" /> Actif</PillBadge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <PillButton variant="outline">Changer de plan</PillButton>
            {isPro && (
              <button className="text-xs text-red-500 transition-colors hover:text-red-600">
                Annuler l&apos;abonnement
              </button>
            )}
          </div>
        </div>
      </SectionCard>


      {/* ─── Card 3: Historique paiements ─── */}
      <SectionCard title="Historique des paiements d'abonnement" id="sub-payments">
        <div className="mt-4 py-6 text-center">
          <Download className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Aucun paiement d&apos;abonnement enregistré.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            L&apos;historique apparaîtra ici après votre premier paiement.
          </p>
        </div>
      </SectionCard>

      {/* ─── Card 4: Avantages Pro ─── */}
      {isPro && (
        <SectionCard title="Avantages Pro actifs" id="pro-benefits">
          <div className="mt-4 space-y-2">
            {PRO_BENEFITS.map((b) => (
              <div key={b.label} className="flex items-center gap-3 rounded-xl bg-green-50/30 px-4 py-2.5 dark:bg-green-950/10">
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{b.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
