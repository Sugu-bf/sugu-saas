"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200", checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600")}>
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

const CHANNELS = [
  { id: "sms", icon: "📱", label: "SMS", detail: "+223 76 45 23 18", on: true },
  { id: "email", icon: "📧", label: "Email", detail: "contact@expressbamako.ml", on: true },
  { id: "whatsapp", icon: "💬", label: "WhatsApp", detail: "+223 76 45 23 18", on: true },
];

const EVENTS = [
  { label: "🚚 Nouvelle livraison assignée", sms: true, email: true, whatsapp: true },
  { label: "✅ Livraison réussie", sms: false, email: true, whatsapp: false },
  { label: "❌ Livraison échouée", sms: true, email: true, whatsapp: true },
  { label: "⏰ Retard signalé", sms: true, email: true, whatsapp: true },
  { label: "🎫 Nouvelle réclamation", sms: true, email: true, whatsapp: false },
  { label: "💰 Paiement reçu", sms: false, email: true, whatsapp: false },
  { label: "👷 Livreur hors ligne (+2h)", sms: true, email: true, whatsapp: false },
  { label: "📊 Rapport hebdomadaire", sms: false, email: true, whatsapp: false },
];

export function NotificationsTab() {
  const [channels, setChannels] = useState(CHANNELS);
  const [events, setEvents] = useState(EVENTS);
  const [quietHours, setQuietHours] = useState(false);
  const [exceptUrgent, setExceptUrgent] = useState(true);

  const toggleChannel = (id: string) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, on: !c.on } : c)));
  };

  const toggleEvent = (idx: number, channel: "sms" | "email" | "whatsapp") => {
    setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, [channel]: !e[channel] } : e)));
  };

  return (
    <div className="space-y-4">
      {/* Canaux */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Canaux de notification
        </h3>
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3">
              <span className="text-base">{ch.icon}</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white w-20">{ch.label}</span>
              <Toggle checked={ch.on} onChange={() => toggleChannel(ch.id)} label={ch.label} />
              <span className="text-[10px] text-gray-400 ml-auto">{ch.detail}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Alertes par événement */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Alertes par événement
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 text-left">Événement</th>
                <th className="pb-2 text-center w-14">SMS</th>
                <th className="pb-2 text-center w-14">Email</th>
                <th className="pb-2 text-center w-14">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {events.map((ev, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-gray-700 dark:text-gray-300">{ev.label}</td>
                  <td className="py-2.5 text-center">
                    <Toggle checked={ev.sms} onChange={() => toggleEvent(i, "sms")} />
                  </td>
                  <td className="py-2.5 text-center">
                    <Toggle checked={ev.email} onChange={() => toggleEvent(i, "email")} />
                  </td>
                  <td className="py-2.5 text-center">
                    <Toggle checked={ev.whatsapp} onChange={() => toggleEvent(i, "whatsapp")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Heures silencieuses */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Heures silencieuses
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Activer les heures silencieuses</span>
            <Toggle checked={quietHours} onChange={() => setQuietHours(!quietHours)} label="Heures silencieuses" />
          </div>
          {quietHours && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-[11px] text-gray-500">De</span>
              <input type="time" defaultValue="22:00" className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900" />
              <span className="text-[11px] text-gray-500">À</span>
              <input type="time" defaultValue="07:00" className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900" />
            </div>
          )}
          <p className="text-[10px] text-gray-400 italic">
            Les notifications SMS seront suspendues. Emails envoyés normalement.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Sauf livraisons urgentes</span>
            <Toggle checked={exceptUrgent} onChange={() => setExceptUrgent(!exceptUrgent)} label="Sauf urgentes" />
          </div>
        </div>
      </section>
    </div>
  );
}
