"use client";

import { cn } from "@/lib/utils";
import { SectionCard, PillBadge, PillButton } from "./settings-ui";
import { Download, Star, Check, X as XIcon } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 8 — Mon abonnement
// ────────────────────────────────────────────────────────────

const PRO_BENEFITS = [
  { label: "Produits illimités", detail: "vous utilisez 156" },
  { label: "Analytics avancés", detail: "" },
  { label: "Support prioritaire", detail: "temps de réponse: < 2h" },
  { label: "Badge vendeur vérifié sur la marketplace", detail: "" },
  { label: "Priorité dans les résultats de recherche", detail: "" },
  { label: "Codes promo & promotions", detail: "" },
  { label: "Export CSV/PDF illimité", detail: "" },
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

const PAYMENTS = [
  { date: "28 Jan 2026", amount: "14 900 FCFA", method: "Orange Money", status: "paid" },
  { date: "28 Déc 2025", amount: "14 900 FCFA", method: "Orange Money", status: "paid" },
  { date: "28 Nov 2025", amount: "14 900 FCFA", method: "Orange Money", status: "paid" },
];

export function TabSubscription() {
  return (
    <div className="space-y-6">
      {/* ─── Card 1: Plan actuel ─── */}
      <SectionCard title="" id="current-plan" className="ring-1 ring-sugu-200/50 dark:ring-sugu-900/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-sugu-600 dark:text-sugu-400">Plan Pro</h2>
              <Star className="h-5 w-5 fill-sugu-400 text-sugu-400" />
            </div>
            <p className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">
              14 900 <span className="text-sm font-semibold text-gray-500">FCFA / mois</span>
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Renouvelé automatiquement le <span className="font-semibold text-gray-800 dark:text-gray-200">28 Fév 2026</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <PillBadge variant="green">✅ Actif</PillBadge>
              <span className="text-xs text-gray-400">Membre Pro depuis : Janvier 2026</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <PillButton variant="outline">Changer de plan</PillButton>
            <button className="text-xs text-red-500 transition-colors hover:text-red-600">
              Annuler l&apos;abonnement
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 2: Comparaison des plans ─── */}
      <SectionCard title="Comparaison des plans" id="plan-comparison">
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Gratuit */}
          <div className="rounded-2xl border border-white/60 bg-white/30 p-5 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/20">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gratuit</h3>
            <p className="mt-1 text-xl font-extrabold text-gray-700 dark:text-gray-300">0 <span className="text-sm font-medium text-gray-400">FCFA/mois</span></p>
            <div className="mt-4 space-y-2">
              {PLAN_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  {f.free ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />}
                  <span className={cn("text-xs", f.free ? "text-gray-700 dark:text-gray-300" : "text-gray-400 line-through dark:text-gray-600")}>{f.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-gray-400">Votre plan précédent</p>
            <PillButton variant="outline" disabled className="mt-2 w-full" size="sm">Rétrograder</PillButton>
          </div>

          {/* Pro — Actuel */}
          <div className="rounded-2xl border-2 border-sugu-300 bg-sugu-50/20 p-5 shadow-sm shadow-sugu-500/10 dark:border-sugu-700 dark:bg-sugu-950/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sugu-600 dark:text-sugu-400">Pro</h3>
              <PillBadge variant="orange">Actuel</PillBadge>
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
            <p className="mt-4 text-center text-xs font-semibold text-sugu-600 dark:text-sugu-400">✅ Plan actuel</p>
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
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Date", "Montant", "Méthode", "Statut", ""].map((h) => (
                  <th key={h} className="py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {PAYMENTS.map((p) => (
                <tr key={p.date} className="transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                  <td className="py-3 text-gray-600 dark:text-gray-400">{p.date}</td>
                  <td className="py-3 font-semibold text-gray-900 dark:text-white">{p.amount}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{p.method}</td>
                  <td className="py-3"><PillBadge variant="green">Payé</PillBadge></td>
                  <td className="py-3">
                    <button className="text-gray-400 hover:text-sugu-500 transition-colors" aria-label="Télécharger PDF">
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PillButton variant="outline" size="sm" className="mt-4">
          <Download className="h-3.5 w-3.5" />
          Télécharger toutes les factures
        </PillButton>
      </SectionCard>

      {/* ─── Card 4: Avantages Pro ─── */}
      <SectionCard title="Avantages Pro actifs" id="pro-benefits">
        <div className="mt-4 space-y-2">
          {PRO_BENEFITS.map((b) => (
            <div key={b.label} className="flex items-center gap-3 rounded-xl bg-green-50/30 px-4 py-2.5 dark:bg-green-950/10">
              <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {b.label}
                {b.detail && <span className="ml-1 text-xs text-gray-400">({b.detail})</span>}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
