"use client";

import { SectionCard, PillBadge } from "@/components/shared/settings-ui";
import { MessageCircle, BarChart3, Facebook, BookOpen, Puzzle } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 6 — Intégrations
// ────────────────────────────────────────────────────────────

const INTEGRATIONS = [
  { id: "whatsapp", name: "WhatsApp Business API", icon: <MessageCircle className="h-5 w-5 text-green-500" />, description: "Recevez les commandes sur WhatsApp", comingSoon: true },
  { id: "ga", name: "Google Analytics", icon: <BarChart3 className="h-5 w-5 text-orange-500" />, description: "Suivez le trafic de votre boutique", comingSoon: true },
  { id: "fbpixel", name: "Facebook Pixel", icon: <Facebook className="h-5 w-5 text-blue-600" />, description: "Retargeting publicitaire", comingSoon: true },
  { id: "wave", name: "Comptabilité (Wave App)", icon: <BookOpen className="h-5 w-5 text-teal-500" />, description: "Synchronisez vos finances", comingSoon: true },
];

export function TabIntegrations() {
  return (
    <div className="space-y-6">
      {/* ─── Info Banner ─── */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/30 px-4 py-3 backdrop-blur dark:border-amber-900/30 dark:bg-amber-950/10">
        <Puzzle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Intégrations — Bientôt disponible
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Les intégrations tierces (API, Webhooks, applications connectées) seront disponibles prochainement.
            Vous serez notifié dès leur lancement.
          </p>
        </div>
      </div>

      {/* ─── Card: Applications disponibles ─── */}
      <SectionCard title="Applications disponibles" id="available-apps">
        <div className="mt-5 space-y-3">
          {INTEGRATIONS.map((integ) => (
            <div key={integ.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/30 p-4 opacity-60 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/20">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/60">{integ.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{integ.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{integ.description}</p>
              </div>
              <PillBadge variant="amber">Bientôt</PillBadge>
            </div>
          ))}
        </div>
        <button className="mt-4 text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400">
          Proposer une intégration →
        </button>
      </SectionCard>
    </div>
  );
}
