"use client";

import { useState } from "react";
import { SectionCard, PillInput, PillBadge, PillButton } from "./settings-ui";
import { Eye, EyeOff, Copy, RefreshCw, Check } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 6 — Intégrations
// ────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  comingSoon?: boolean;
}

const INTEGRATIONS: Integration[] = [
  { id: "whatsapp", name: "WhatsApp Business API", icon: "💬", description: "Recevez les commandes sur WhatsApp", connected: true },
  { id: "ga", name: "Google Analytics", icon: "📊", description: "Suivez le trafic de votre boutique", connected: false },
  { id: "fbpixel", name: "Facebook Pixel", icon: "📘", description: "Retargeting publicitaire", connected: false },
  { id: "wave", name: "Comptabilité (Wave App)", icon: "📒", description: "Synchronisez vos finances", connected: false, comingSoon: true },
];

const WEBHOOK_EVENTS = [
  { id: "order.created", label: "commande.créée", checked: true },
  { id: "order.delivered", label: "commande.livrée", checked: true },
  { id: "payment.received", label: "paiement.reçu", checked: true },
  { id: "stock.alert", label: "stock.alerte", checked: false },
];

export function TabIntegrations() {
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://mon-site.ml/webhook/sugu");
  const [integrations] = useState(INTEGRATIONS);
  const [events, setEvents] = useState(WEBHOOK_EVENTS);

  // TODO: fetch the real API key from the backend — never hardcode secrets
  const apiKey = "sk_test_REPLACE_ME_WITH_REAL_KEY";
  const maskedKey = "sk_test_••••••••••••_KEY";

  const copyKey = () => {
    navigator.clipboard?.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleEvent = (id: string) =>
    setEvents((e) => e.map((ev) => (ev.id === id ? { ...ev, checked: !ev.checked } : ev)));

  return (
    <div className="space-y-6">
      {/* ─── Card 1: API & Webhooks ─── */}
      <SectionCard
        title="API & Webhooks"
        id="api-webhooks"
        badge={<PillBadge variant="orange">Pro</PillBadge>}
      >
        <div className="mt-5 space-y-4">
          {/* API Key */}
          <div className="rounded-2xl border border-white/60 bg-white/30 p-4 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/20">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clé API</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-full bg-gray-100/80 px-3 py-1.5 font-mono text-xs text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                {apiKeyRevealed ? apiKey : maskedKey}
              </code>
              <button onClick={() => setApiKeyRevealed(!apiKeyRevealed)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Révéler la clé">
                {apiKeyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={copyKey} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {copiedKey ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                Copier
              </button>
              <PillButton variant="danger-outline" size="sm">
                <RefreshCw className="h-3 w-3" />
                Régénérer
              </PillButton>
            </div>
            <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">Créée le : 15 Jan 2026</p>
            <button className="mt-1 text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400">
              📖 Documentation API →
            </button>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Webhook URL</p>
            <div className="flex flex-wrap items-center gap-2">
              <PillInput value={webhookUrl} onChange={setWebhookUrl} className="flex-1 min-w-[200px]" />
              <PillButton variant="outline" size="sm">Tester</PillButton>
              <PillBadge variant="green">✅ Actif</PillBadge>
            </div>
          </div>

          {/* Webhook Events */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Événements webhook</p>
            <div className="flex flex-wrap gap-2">
              {events.map((ev) => (
                <label key={ev.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/60 bg-white/30 px-3 py-1.5 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/20">
                  <input
                    type="checkbox"
                    checked={ev.checked}
                    onChange={() => toggleEvent(ev.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500 dark:border-gray-600"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ─── Card 2: Applications connectées ─── */}
      <SectionCard title="Applications connectées" id="connected-apps">
        <div className="mt-5 space-y-3">
          {integrations.map((integ) => (
            <div key={integ.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/30 p-4 backdrop-blur dark:border-gray-700/50 dark:bg-gray-800/20">
              <span className="text-2xl">{integ.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{integ.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{integ.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {integ.comingSoon && <PillBadge variant="amber">Bientôt</PillBadge>}
                {integ.connected ? (
                  <>
                    <PillBadge variant="green">🟢 Connecté</PillBadge>
                    <button className="text-xs font-medium text-red-500 hover:text-red-600">Déconnecter</button>
                  </>
                ) : (
                  <PillButton variant="outline" size="sm" disabled={integ.comingSoon}>
                    Connecter
                  </PillButton>
                )}
              </div>
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
