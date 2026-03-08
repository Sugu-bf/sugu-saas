"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Smartphone, Mail, MessageCircle, Truck, CheckCircle2, XCircle, Clock, Ticket, Banknote, HardHat, BarChart3, Save, Loader2 } from "lucide-react";
import type { AgencySettingsResponse } from "@/features/agency/schema";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200", checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600")}>
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

// Default channels used when API has no notification preferences
const DEFAULT_CHANNELS = [
  { id: "sms", label: "SMS", detail: "", on: true },
  { id: "email", label: "Email", detail: "", on: true },
  { id: "whatsapp", label: "WhatsApp", detail: "", on: true },
];

// Default events used when API has no notification preferences
const DEFAULT_EVENTS = [
  { label: "Nouvelle livraison assignée", sms: true, email: true, whatsapp: true },
  { label: "Livraison réussie", sms: false, email: true, whatsapp: false },
  { label: "Livraison échouée", sms: true, email: true, whatsapp: true },
  { label: "Retard signalé", sms: true, email: true, whatsapp: true },
  { label: "Nouvelle réclamation", sms: true, email: true, whatsapp: false },
  { label: "Paiement reçu", sms: false, email: true, whatsapp: false },
  { label: "Livreur hors ligne (+2h)", sms: true, email: true, whatsapp: false },
  { label: "Rapport hebdomadaire", sms: false, email: true, whatsapp: false },
];

const CHANNEL_ICONS: Record<string, ReactNode> = {
  sms: <Smartphone className="h-4 w-4 text-gray-500" />,
  email: <Mail className="h-4 w-4 text-gray-500" />,
  whatsapp: <MessageCircle className="h-4 w-4 text-green-500" />,
};

const EVENT_ICONS: ReactNode[] = [
  <Truck key="1" className="h-3.5 w-3.5 text-blue-500" />,
  <CheckCircle2 key="2" className="h-3.5 w-3.5 text-green-500" />,
  <XCircle key="3" className="h-3.5 w-3.5 text-red-500" />,
  <Clock key="4" className="h-3.5 w-3.5 text-amber-500" />,
  <Ticket key="5" className="h-3.5 w-3.5 text-purple-500" />,
  <Banknote key="6" className="h-3.5 w-3.5 text-green-600" />,
  <HardHat key="7" className="h-3.5 w-3.5 text-orange-500" />,
  <BarChart3 key="8" className="h-3.5 w-3.5 text-indigo-500" />,
];

interface NotificationsTabProps {
  data: AgencySettingsResponse;
  onSave: (payload: UpdateAgencySettingsPayload) => void;
  isSaving: boolean;
}

export function NotificationsTab({ data, onSave, isSaving }: NotificationsTabProps) {
  const apiPrefs = data.notificationPreferences;

  // Initialize channels: use API data or defaults enriched with agency contact info
  const initialChannels = apiPrefs?.channels?.length
    ? apiPrefs.channels
    : DEFAULT_CHANNELS.map((ch) => ({
        ...ch,
        detail: ch.id === "sms" || ch.id === "whatsapp"
          ? data.phonePrimary
          : ch.id === "email"
            ? data.email
            : "",
      }));

  const initialEvents = apiPrefs?.events?.length ? apiPrefs.events : DEFAULT_EVENTS;

  const [channels, setChannels] = useState(initialChannels);
  const [events, setEvents] = useState(initialEvents);

  const toggleChannel = (id: string) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, on: !c.on } : c)));
  };

  const toggleEvent = (idx: number, channel: "sms" | "email" | "whatsapp") => {
    setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, [channel]: !e[channel] } : e)));
  };

  const handleSave = () => {
    onSave({
      notificationPreferences: {
        channels,
        events,
      },
    });
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
              {CHANNEL_ICONS[ch.id] ?? <Smartphone className="h-4 w-4 text-gray-500" />}
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
                  <td className="py-2.5 text-gray-700 dark:text-gray-300">
                    <span className="inline-flex items-center gap-1.5">
                      {EVENT_ICONS[i]}
                      {ev.label}
                    </span>
                  </td>
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

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-sugu-500/25 hover:shadow-lg transition-all",
            isSaving && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? "Sauvegarde…" : "Sauvegarder les notifications"}
        </button>
      </div>
    </div>
  );
}
