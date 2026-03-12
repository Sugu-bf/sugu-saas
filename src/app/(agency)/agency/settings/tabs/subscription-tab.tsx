"use client";

import { Crown, Info } from "lucide-react";

export function SubscriptionTab() {
  return (
    <div className="space-y-4">
      {/* Plan actuel — informational */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sugu-50 dark:bg-sugu-950/30">
            <Crown className="h-7 w-7 text-sugu-500" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Gestion de l&apos;abonnement</h3>
          <p className="mt-2 text-xs text-gray-500 max-w-md">
            La gestion des abonnements sera bientôt disponible. Vous pourrez gérer votre plan, consulter l&apos;historique des paiements et changer de formule directement depuis cette page.
          </p>
        </div>
      </section>

      {/* Info */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-start gap-3 rounded-xl bg-sugu-50/60 p-4 dark:bg-sugu-950/20">
          <Info className="h-4 w-4 text-sugu-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Besoin d&apos;assistance ?</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Pour toute question concernant votre abonnement, contactez notre équipe support à <span className="font-semibold text-sugu-600">support@mysugu.com</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
