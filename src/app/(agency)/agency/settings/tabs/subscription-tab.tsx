"use client";

import { CheckCircle2, Star, FileText } from "lucide-react";

export function SubscriptionTab() {
  return (
    <div className="space-y-4">
      {/* Plan actuel */}
      <section className="glass-card rounded-2xl p-5 border-sugu-300 ring-1 ring-sugu-200 dark:border-sugu-800 dark:ring-sugu-900/40">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-5 w-5 fill-sugu-500 text-sugu-500" />
          <h3 className="text-lg font-black text-sugu-600">Plan Pro</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-950/30"><CheckCircle2 className="h-3 w-3" /> Actif</span>
        </div>
        <p className="text-2xl font-black text-gray-900 dark:text-white">14,900 FCFA <span className="text-sm font-medium text-gray-400">/ mois</span></p>
        <p className="text-[10px] text-gray-400 mt-1">Renouvellement : 28 Fév 2026</p>
        <p className="text-[10px] text-gray-400">Membre depuis : Janvier 2026</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900">Changer de plan</button>
          <button className="text-xs font-semibold text-red-500 hover:text-red-600">Annuler l&apos;abonnement</button>
        </div>
      </section>

      {/* Comparaison */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="glass-card rounded-2xl p-5">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Gratuit</h4>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">0 FCFA <span className="text-sm font-medium text-gray-400">/ mois</span></p>
          <ul className="mt-3 space-y-1.5">
            {["10 livreurs max", "Tableau de bord basique", "Support email"].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500"><span className="text-gray-300">•</span> {f}</li>
            ))}
          </ul>
          <button disabled className="mt-4 rounded-full border bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-400 cursor-not-allowed">Rétrograder</button>
        </section>
        <section className="glass-card rounded-2xl p-5 border-sugu-300 ring-1 ring-sugu-200 dark:border-sugu-800 dark:ring-sugu-900/40">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pro</h4>
            <span className="rounded-full bg-sugu-50 px-2 py-0.5 text-[9px] font-bold text-sugu-600 dark:bg-sugu-950/30">Actuel</span>
          </div>
          <p className="text-xl font-black text-sugu-600 mt-1">14,900 FCFA <span className="text-sm font-medium text-gray-400">/ mois</span></p>
          <ul className="mt-3 space-y-1.5">
            {["Livreurs illimités", "Stats avancées", "Support prioritaire", "Badge vérifié"].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"><CheckCircle2 className="h-3 w-3 text-sugu-500 flex-shrink-0" /> {f}</li>
            ))}
          </ul>
          <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sugu-500"><CheckCircle2 className="h-3 w-3" /> Plan actuel</p>
        </section>
      </div>

      {/* Historique */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Historique des paiements</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 text-left">Date</th><th className="pb-2 text-left">Montant</th><th className="pb-2 text-left">Méthode</th><th className="pb-2 text-left">Statut</th><th className="pb-2 text-right">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {[{ d: "28 Jan 2026" }, { d: "28 Déc 2025" }, { d: "28 Nov 2025" }].map((r) => (
                <tr key={r.d}>
                  <td className="py-2.5 font-medium text-gray-700 dark:text-gray-300">{r.d}</td>
                  <td className="py-2.5 font-bold text-gray-900 dark:text-white">14,900 FCFA</td>
                  <td className="py-2.5 text-gray-500">Orange Money</td>
                  <td className="py-2.5"><span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">Payé</span></td>
                  <td className="py-2.5 text-right"><button className="rounded-lg p-1 text-gray-400 hover:text-sugu-500"><FileText className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
