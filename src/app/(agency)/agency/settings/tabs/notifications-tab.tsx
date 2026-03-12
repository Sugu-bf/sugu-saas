"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Smartphone, Mail, MessageCircle, Bell, Save, Loader2 } from "lucide-react";
import type { AgencySettingsResponse } from "@/features/agency/schema";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";
import { Toggle } from "../components/toggle";



const CHANNEL_ICONS: Record<string, ReactNode> = {
  sms: <Smartphone className="h-4 w-4 text-gray-500" />,
  email: <Mail className="h-4 w-4 text-gray-500" />,
  whatsapp: <MessageCircle className="h-4 w-4 text-green-500" />,
};

interface NotificationsTabProps {
  data: AgencySettingsResponse;
  onSave: (payload: UpdateAgencySettingsPayload) => void;
  isSaving: boolean;
}

export function NotificationsTab({ data, onSave, isSaving }: NotificationsTabProps) {
  const apiPrefs = data.notificationPreferences;

  // Use strictly API data — empty arrays if no data from backend
  const initialChannels = apiPrefs?.channels ?? [];
  const initialEvents = apiPrefs?.events ?? [];

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

  // Empty state
  if (channels.length === 0 && events.length === 0) {
    return (
      <div className="space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 mb-1">Aucune préférence de notification configurée</p>
            <p className="text-[10px] text-gray-400 max-w-xs">
              Les préférences de notification n&apos;ont pas encore été configurées pour cette agence. Elles seront disponibles après la première sauvegarde.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Canaux */}
      {channels.length > 0 && (
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
      )}

      {/* Alertes par événement */}
      {events.length > 0 && (
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
                      {ev.label}
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
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-sugu-600",
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
