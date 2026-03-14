"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DriverSettings } from "@/features/driver/schema";
import { useUpdateDriverNotifications } from "@/features/driver/hooks";
import { SectionCard, Toggle, PillBadge, PillButton, PillInput, Field } from "@/components/shared/settings-ui";
import { EventPreferencesTable, type EventRow } from "@/components/shared/event-preferences-table";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Smartphone,
  Mail,
  Bell,
  MessageCircle,
  Package,
  XCircle,
  Banknote,
  Clock,
  MessageSquare,
  Building,
  Moon,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 4 — Notifications (Driver)
// ────────────────────────────────────────────────────────────

interface TabNotificationsProps {
  data: DriverSettings;
}

// Icon mapping for channels
const CHANNEL_ICONS: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  "ch-sms": { icon: <Smartphone className="h-4 w-4" />, bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-500" },
  "ch-email": { icon: <Mail className="h-4 w-4" />, bg: "bg-purple-50 dark:bg-purple-950/30", color: "text-purple-500" },
  "ch-push": { icon: <Bell className="h-4 w-4" />, bg: "bg-green-50 dark:bg-green-950/30", color: "text-green-500" },
  "ch-whatsapp": { icon: <MessageCircle className="h-4 w-4" />, bg: "bg-emerald-50 dark:bg-emerald-950/30", color: "text-emerald-500" },
};

// Icons for events
const EVENT_ICONS: Record<string, React.ReactNode> = {
  package: <Package className="h-4 w-4 text-sugu-500" />,
  "x-circle": <XCircle className="h-4 w-4 text-red-500" />,
  banknote: <Banknote className="h-4 w-4 text-green-500" />,
  clock: <Clock className="h-4 w-4 text-amber-500" />,
  "message-square": <MessageSquare className="h-4 w-4 text-blue-500" />,
  building: <Building className="h-4 w-4 text-indigo-500" />,
};

export function TabNotifications({ data }: TabNotificationsProps) {
  const notif = data.notifications;

  // Channels state
  const [channels, setChannels] = useState(notif.channels.map((ch) => ({ ...ch })));

  // Events state — map to EventRow format for shared table
  // Keep a stable iconKey map (id → original icon key string) to avoid fragile JSX ref comparison on save
  const [iconKeyMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(notif.events.map((ev) => [ev.id, ev.icon]))
  );

  const [events, setEvents] = useState<EventRow[]>(
    notif.events.map((ev) => ({
      id: ev.id,
      icon: EVENT_ICONS[ev.icon] ?? <Package className="h-4 w-4 text-gray-400" />,
      label: ev.label,
      sms: ev.sms,
      email: ev.email,
      push: ev.push,
      whatsapp: ev.whatsapp,
    }))
  );

  // Quiet hours state
  const [quietEnabled, setQuietEnabled] = useState(notif.quietHours.enabled);
  const [quietFrom, setQuietFrom] = useState(notif.quietHours.from);
  const [quietTo, setQuietTo] = useState(notif.quietHours.to);

  const updateNotifMutation = useUpdateDriverNotifications();

  const toggleChannel = (id: string) =>
    setChannels((c) => c.map((ch) => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch)));

  const toggleEvent = (idx: number, key: "sms" | "email" | "push" | "whatsapp") =>
    setEvents((e) => e.map((ev, i) => (i === idx ? { ...ev, [key]: !ev[key] } : ev)));

  const handleSaveNotifications = async () => {
    try {
      await updateNotifMutation.mutateAsync({
        channels,
        events: events.map((ev) => ({
          id: ev.id,
          icon: iconKeyMap[ev.id] ?? "package",
          label: ev.label,
          sms: ev.sms,
          email: ev.email,
          push: ev.push,
          whatsapp: ev.whatsapp,
        })),
        quietHours: { enabled: quietEnabled, from: quietFrom, to: quietTo },
      });
      toast.success("Préférences de notification sauvegardées");
    } catch {
      toast.error("Erreur lors de la sauvegarde des notifications");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Canaux de notification ─── */}
      <SectionCard title="Canaux de notification" id="notif-channels" className="animate-card-enter">
        <div className="mt-4 space-y-2">
          {channels.map((ch) => {
            const iconInfo = CHANNEL_ICONS[ch.id] ?? { icon: <Bell className="h-4 w-4" />, bg: "bg-gray-100", color: "text-gray-500" };
            return (
              <div key={ch.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
                <span className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", iconInfo.bg, iconInfo.color)}>
                  {iconInfo.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{ch.label}</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{ch.detail}</p>
                </div>
                <Toggle checked={ch.enabled} onChange={() => toggleChannel(ch.id)} label={`${ch.label} activé`} />
                {ch.pro && <PillBadge variant="orange">PRO</PillBadge>}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ─── Card 2: Préférences par événement (shared) ─── */}
      <EventPreferencesTable
        events={events}
        onToggle={toggleEvent}
        className="animate-card-enter"
        style={{ animationDelay: "60ms" } as React.CSSProperties}
      />

      {/* ─── Card 3: Mode silencieux ─── */}
      <SectionCard title="Mode silencieux" id="notif-quiet" className="animate-card-enter" style={{ animationDelay: "120ms" } as React.CSSProperties}>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode silencieux</span>
            <Toggle checked={quietEnabled} onChange={() => setQuietEnabled(!quietEnabled)} label="Mode silencieux" />
          </div>
          <div className={cn("mt-4 space-y-4 transition-opacity", !quietEnabled && "opacity-50 pointer-events-none")}>
            <Field label="Plage horaire">
              <div className="flex items-center gap-3">
                <PillInput
                  type="time"
                  value={quietFrom}
                  onChange={setQuietFrom}
                  prefix={<Moon className="h-3.5 w-3.5 text-gray-400" />}
                />
                <span className="text-sm text-gray-400">—</span>
                <PillInput
                  type="time"
                  value={quietTo}
                  onChange={setQuietTo}
                  prefix={<Moon className="h-3.5 w-3.5 text-gray-400" />}
                />
              </div>
            </Field>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Aucune notification sonore pendant ces heures</p>
          </div>
        </div>
      </SectionCard>

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-3">
        <PillButton
          variant="primary"
          onClick={handleSaveNotifications}
          disabled={updateNotifMutation.isPending}
        >
          {updateNotifMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder les notifications
        </PillButton>
      </div>
    </div>
  );
}
