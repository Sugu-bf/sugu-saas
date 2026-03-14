"use client";

import { cn } from "@/lib/utils";
import { SectionCard, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { Download, Star, Check, X as XIcon, CheckCircle2 } from "lucide-react";
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

interface PlanFeature { label: string; free: boolean; pro: boolean; enterprise: boolean }

const PLAN_FEATURES: PlanFeature[] = [
  { label: "Jusqu'à 50 produits", free: true, pro: false, enterprise: false },
  { label: "Produits illimités", free: false, pro: true, enterprise: true },
  { label: "Statistiques de base", free: true, pro: true, enterprise: true },
  { label: "Analytics avancés", free: false, pro: true, enterprise: true },
  { label: "Support email", free: true, pro: true, enterprise: true },
  { label: "Support prioritaire 24/7", free: false, pro: true, enterprise: true },
  { label: "Badge vérifié", free: false, pro: true, enterprise: true },
  { label: "API & Webhooks", free: false, pro: true, enterprise: true },
  { label: "Manager de compte dédié", free: false, pro: false, enterprise: true },
  { label: "Intégrations sur mesure", free: false, pro: false, enterprise: true },
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

      {/* ─── Card 2: Comparaison des plans ─── */}
      <SectionCard title="Comparaison des plans" id="plan-comparison">
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Gratuit */}
          <div className={cn(
            "rounded-2xl border p-5 backdrop-blur",
            isFree ? "border-2 border-sugu-300 bg-sugu-50/20 dark:border-sugu-700 dark:bg-sugu-950/10" : "border-white/60 bg-white/30 dark:border-gray-700/50 dark:bg-gray-800/20"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gratuit</h3>
              {isFree && <PillBadge variant="orange">Actuel</PillBadge>}
            </div>
            <p className="mt-1 text-xl font-extrabold text-gray-700 dark:text-gray-300">0 <span className="text-sm font-medium text-gray-400">FCFA/mois</span></p>
            <div className="mt-4 space-y-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  {f.free ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />}
                  <span className={cn("text-xs", f.free ? "text-gray-700 dark:text-gray-300" : "text-gray-400 line-through dark:text-gray-600")}>{f.label}</span>
                </div>
              ))}
            </div>
            {!isFree && <PillButton variant="outline" className="mt-4 w-full" size="sm">Rétrograder</PillButton>}
            {isFree && <p className="mt-4 text-center text-xs font-semibold text-sugu-600 dark:text-sugu-400"><CheckCircle2 className="inline h-3 w-3" /> Plan actuel</p>}
          </div>

          {/* Pro */}
          <div className={cn(
            "rounded-2xl border p-5",
            isPro ? "border-2 border-sugu-300 bg-sugu-50/20 dark:border-sugu-700 dark:bg-sugu-950/10" : "border-white/60 bg-white/30 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/20"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sugu-600 dark:text-sugu-400">Pro</h3>
              {isPro && <PillBadge variant="orange">Actuel</PillBadge>}
            </div>
            <p className="mt-1 text-xl font-extrabold text-sugu-600 dark:text-sugu-400">14 900 <span className="text-sm font-medium text-gray-400">FCFA/mois</span></p>
            <div className="mt-4 space-y-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  {f.pro ? <Check className="h-3.5 w-3.5 text-sugu-500" /> : <XIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />}
                  <span className={cn("text-xs", f.pro ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400 line-through")}>{f.label}</span>
                </div>
              ))}
            </div>
            {isPro && <p className="mt-4 text-center text-xs font-semibold text-sugu-600 dark:text-sugu-400"><CheckCircle2 className="inline h-3 w-3" /> Plan actuel</p>}
            {!isPro && <PillButton variant="primary" className="mt-4 w-full" size="sm">Passer au Pro</PillButton>}
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-gray-300 bg-gray-50/30 p-5 backdrop-blur dark:border-gray-600 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enterprise</h3>
            <p className="mt-1 text-xl font-extrabold text-gray-700 dark:text-gray-300">Sur devis</p>
            <div className="mt-4 space-y-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  {f.enterprise ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />}
                  <span className={cn("text-xs", f.enterprise ? "text-gray-700 dark:text-gray-300" : "text-gray-400 line-through dark:text-gray-600")}>{f.label}</span>
                </div>
              ))}
            </div>
            <PillButton variant="outline" className="mt-4 w-full" size="sm">Nous contacter</PillButton>
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
