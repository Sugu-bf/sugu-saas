"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SectionCard, Toggle, PillInput, PillBadge, PillButton } from "./settings-ui";
import { useUpdateNotifications, useVendorSettings } from "@/features/vendor/hooks";
import { Save, Loader2 } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 4 — Notifications
// ────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  icon: string;
  label: string;
  enabled: boolean;
  detail: string;
  pro?: boolean;
}

interface EventRow {
  icon: string;
  label: string;
  sms: boolean;
  email: boolean;
  push: boolean;
  whatsapp: boolean;
}

export function TabNotifications() {
  const { data: settingsData } = useVendorSettings();
  const apiNotifications = settingsData?.notifications;

  // Channels state — initialized from API contact data
  const phone = settingsData?.profile?.phone ?? "";
  const email = settingsData?.profile?.email ?? "";

  const [channels, setChannels] = useState<Channel[]>([
    { id: "sms", icon: "📱", label: "SMS", enabled: true, detail: phone },
    { id: "email", icon: "📧", label: "Email", enabled: true, detail: email },
    { id: "push", icon: "🔔", label: "Push (navigateur)", enabled: apiNotifications?.pushNotifications ?? false, detail: "" },
    { id: "whatsapp", icon: "💬", label: "WhatsApp", enabled: true, detail: phone, pro: true },
  ]);

  // Events state — initialized from API notification preferences
  const [events, setEvents] = useState<EventRow[]>([
    { icon: "🛒", label: "Nouvelle commande", sms: true, email: apiNotifications?.emailAlerts?.newOrder ?? true, push: true, whatsapp: true },
    { icon: "💰", label: "Paiement reçu", sms: true, email: true, push: false, whatsapp: false },
    { icon: "🚚", label: "Commande expédiée", sms: false, email: true, push: false, whatsapp: false },
    { icon: "✅", label: "Commande livrée", sms: false, email: true, push: false, whatsapp: false },
    { icon: "❌", label: "Commande annulée", sms: true, email: true, push: true, whatsapp: false },
    { icon: "⚠️", label: "Stock faible", sms: true, email: apiNotifications?.emailAlerts?.lowStock ?? true, push: true, whatsapp: false },
    { icon: "🔴", label: "Rupture de stock", sms: true, email: true, push: true, whatsapp: true },
    { icon: "⭐", label: "Nouvel avis client", sms: false, email: true, push: false, whatsapp: false },
    { icon: "💬", label: "Nouveau message support", sms: true, email: true, push: true, whatsapp: false },
    { icon: "📊", label: "Rapport hebdomadaire", sms: false, email: true, push: false, whatsapp: false },
    { icon: "🎉", label: "Promotion / Offre SUGU", sms: false, email: apiNotifications?.emailAlerts?.marketing ?? false, push: false, whatsapp: false },
  ]);

  const [quietHours, setQuietHours] = useState(false);
  const [quietFrom, setQuietFrom] = useState("22:00");
  const [quietTo, setQuietTo] = useState("07:00");
  const [exceptUrgent, setExceptUrgent] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateNotificationsMutation = useUpdateNotifications();

  // Update channels when API data changes
  useEffect(() => {
    if (settingsData) {
      setChannels(prev => prev.map(ch => {
        if (ch.id === "sms") return { ...ch, detail: settingsData.profile.phone };
        if (ch.id === "email") return { ...ch, detail: settingsData.profile.email };
        if (ch.id === "push") return { ...ch, enabled: settingsData.notifications?.pushNotifications ?? false };
        if (ch.id === "whatsapp") return { ...ch, detail: settingsData.profile.phone };
        return ch;
      }));
    }
  }, [settingsData]);

  const toggleChannel = (id: string) =>
    setChannels((c) => c.map((ch) => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch)));

  const toggleEvent = (idx: number, key: "sms" | "email" | "push" | "whatsapp") =>
    setEvents((e) => e.map((ev, i) => (i === idx ? { ...ev, [key]: !ev[key] } : ev)));

  /** Save notifications preferences to the backend */
  const handleSaveNotifications = async () => {
    const emailChannel = channels.find((c) => c.id === "email");
    const pushChannel = channels.find((c) => c.id === "push");

    const newOrderEmailEnabled = events.find((e) => e.label === "Nouvelle commande")?.email ?? true;
    const lowStockEmailEnabled = events.find((e) => e.label === "Stock faible")?.email ?? true;
    const marketingEmailEnabled = events.find((e) => e.label === "Promotion / Offre SUGU")?.email ?? false;

    try {
      await updateNotificationsMutation.mutateAsync({
        emailAlerts: {
          newOrder: newOrderEmailEnabled && (emailChannel?.enabled ?? true),
          lowStock: lowStockEmailEnabled && (emailChannel?.enabled ?? true),
          marketing: marketingEmailEnabled && (emailChannel?.enabled ?? true),
        },
        pushNotifications: pushChannel?.enabled ?? false,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[notifications] Save failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Canaux de notification ─── */}
      <SectionCard title="Canaux de notification" id="notif-channels">
        <div className="mt-4 space-y-2">
          {channels.map((ch) => (
            <div key={ch.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
              <span className="text-lg">{ch.icon}</span>
              <span className="min-w-[100px] text-sm font-medium text-gray-900 dark:text-white">{ch.label}</span>
              <Toggle checked={ch.enabled} onChange={() => toggleChannel(ch.id)} label={`${ch.label} activé`} />
              {ch.detail ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">{ch.detail}</span>
              ) : (
                <button className="text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400">
                  Activer les notifications push
                </button>
              )}
              {ch.pro && <PillBadge variant="orange">Pro</PillBadge>}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ─── Card 2: Préférences par événement ─── */}
      <SectionCard title="Préférences par événement" id="notif-events">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Événement</th>
                {["SMS", "Email", "Push", "WhatsApp"].map((h) => (
                  <th key={h} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 w-16">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {events.map((ev, idx) => (
                <tr key={ev.label} className="transition-colors hover:bg-white/30 dark:hover:bg-white/5">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span>{ev.icon}</span>
                      {ev.label}
                    </span>
                  </td>
                  {(["sms", "email", "push", "whatsapp"] as const).map((key) => (
                    <td key={key} className="py-2.5 text-center">
                      <MiniToggle checked={ev[key]} onChange={() => toggleEvent(idx, key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ─── Card 3: Heures silencieuses ─── */}
      <SectionCard title="Heures silencieuses" id="quiet-hours">
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Toggle checked={quietHours} onChange={() => setQuietHours(!quietHours)} label="Heures silencieuses" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Activer les heures silencieuses</span>
          </div>
          {quietHours && (
            <div className="ml-14 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">De</span>
                <PillInput type="time" value={quietFrom} onChange={setQuietFrom} className="!w-28" />
                <span className="text-sm text-gray-600 dark:text-gray-400">à</span>
                <PillInput type="time" value={quietTo} onChange={setQuietTo} className="!w-28" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Les notifications SMS et Push seront suspendues pendant cette période. Les emails seront toujours envoyés.
              </p>
              <div className="flex items-center gap-3">
                <Toggle checked={exceptUrgent} onChange={() => setExceptUrgent(!exceptUrgent)} label="Sauf commandes urgentes" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Sauf commandes urgentes</span>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-3">
        <PillButton
          variant="primary"
          onClick={handleSaveNotifications}
          disabled={updateNotificationsMutation.isPending}
        >
          {updateNotificationsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder les notifications
        </PillButton>
        {saveSuccess && (
          <span className="text-xs text-green-600">✅ Préférences sauvegardées</span>
        )}
      </div>
    </div>
  );
}

/** Mini inline toggle for the matrix */
function MiniToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors duration-200",
        checked ? "bg-sugu-500" : "bg-gray-200 dark:bg-gray-700",
      )}
    >
      <span
        className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ width: "14px", height: "14px", transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}
