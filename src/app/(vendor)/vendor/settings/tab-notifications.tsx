"use client";

import { useState, useEffect, useCallback } from "react";
import { SectionCard, Toggle, PillBadge, PillButton } from "@/components/shared/settings-ui";
import { EventPreferencesTable, type EventRow } from "@/components/shared/event-preferences-table";
import { useUpdateNotifications, useVendorSettings } from "@/features/vendor/hooks";
import {
  Save,
  Loader2,
  Smartphone,
  Mail,
  Bell,
  MessageCircle,
  ShoppingCart,
  Banknote,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleOff,
  Star,
  MessageSquare,
  BarChart3,
  PartyPopper,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 4 — Notifications (Production-grade, fully dynamic)
// ────────────────────────────────────────────────────────────

interface Channel {
  id: string;
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  detail: string;
  pro?: boolean;
}

type EventKey =
  | "new_order"
  | "payment_received"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "low_stock"
  | "out_of_stock"
  | "new_review"
  | "new_support_message"
  | "weekly_report"
  | "promotion";

// Default event rows (used when backend has no eventPreferences saved)
function getDefaultEvents(emailAlerts: {newOrder: boolean; lowStock: boolean; marketing: boolean}): EventRow[] {
  return [
    { id: "new_order",     icon: <ShoppingCart className="h-4 w-4 text-sugu-500" />,   label: "Nouvelle commande",   sms: true,  email: emailAlerts.newOrder, push: true,  whatsapp: true },
    { id: "payment_received", icon: <Banknote className="h-4 w-4 text-green-500" />,   label: "Paiement reçu",       sms: true,  email: true,                push: false, whatsapp: false },
    { id: "order_shipped",  icon: <Truck className="h-4 w-4 text-blue-500" />,          label: "Commande expédiée",   sms: false, email: true,                push: false, whatsapp: false },
    { id: "order_delivered", icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, label: "Commande livrée",     sms: false, email: true,                push: false, whatsapp: false },
    { id: "order_cancelled", icon: <XCircle className="h-4 w-4 text-red-500" />,        label: "Commande annulée",    sms: true,  email: true,                push: true,  whatsapp: false },
    { id: "low_stock",       icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: "Stock faible",       sms: true,  email: emailAlerts.lowStock, push: true,  whatsapp: false },
    { id: "out_of_stock",    icon: <CircleOff className="h-4 w-4 text-red-600" />,       label: "Rupture de stock",   sms: true,  email: true,                push: true,  whatsapp: true },
    { id: "new_review",      icon: <Star className="h-4 w-4 text-amber-400" />,          label: "Nouvel avis client", sms: false, email: true,                push: false, whatsapp: false },
    { id: "new_support_message", icon: <MessageSquare className="h-4 w-4 text-blue-500" />, label: "Nouveau message support", sms: true, email: true, push: true, whatsapp: false },
    { id: "weekly_report",   icon: <BarChart3 className="h-4 w-4 text-indigo-500" />,    label: "Rapport hebdomadaire", sms: false, email: true,              push: false, whatsapp: false },
    { id: "promotion",       icon: <PartyPopper className="h-4 w-4 text-pink-500" />,    label: "Promotion / Offre SUGU", sms: false, email: emailAlerts.marketing, push: false, whatsapp: false },
  ];
}

export function TabNotifications() {
  const { data: settingsData } = useVendorSettings();
  const apiNotifications = settingsData?.notifications;
  const apiEventPreferences = apiNotifications?.eventPreferences;

  // Channels state — initialized from API contact data
  const phone = settingsData?.profile?.phone ?? "";
  const email = settingsData?.profile?.email ?? "";

  const [channels, setChannels] = useState<Channel[]>([
    { id: "sms", icon: <Smartphone className="h-4 w-4" />, label: "SMS", enabled: true, detail: phone },
    { id: "email", icon: <Mail className="h-4 w-4" />, label: "Email", enabled: true, detail: email },
    { id: "push", icon: <Bell className="h-4 w-4" />, label: "Push (navigateur)", enabled: apiNotifications?.pushNotifications ?? false, detail: "" },
    { id: "whatsapp", icon: <MessageCircle className="h-4 w-4" />, label: "WhatsApp", enabled: true, detail: phone, pro: true },
  ]);

  // Build events from backend eventPreferences or defaults
  const buildEventsFromApi = useCallback((): EventRow[] => {
    const emailAlerts = apiNotifications?.emailAlerts ?? { newOrder: true, lowStock: true, marketing: false };
    const defaults = getDefaultEvents(emailAlerts);

    if (apiEventPreferences && apiEventPreferences.length > 0) {
      return defaults.map(defaultRow => {
        const apiEvent = apiEventPreferences.find(e => e.event === defaultRow.id);
        if (apiEvent) {
          return {
            ...defaultRow,
            sms: apiEvent.sms,
            email: apiEvent.email,
            push: apiEvent.push,
            whatsapp: apiEvent.whatsapp,
          };
        }
        return defaultRow;
      });
    }

    return defaults;
  }, [apiNotifications, apiEventPreferences]);

  const [events, setEvents] = useState<EventRow[]>(buildEventsFromApi);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateNotificationsMutation = useUpdateNotifications();

  // Update channels when API data changes
  /* eslint-disable react-hooks/set-state-in-effect */
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

  // Update events when API data changes
  useEffect(() => {
    if (settingsData) {
      setEvents(buildEventsFromApi());
    }
  }, [settingsData, buildEventsFromApi]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleChannel = (id: string) => {
    setChannels((c) => c.map((ch) => (ch.id === id ? { ...ch, enabled: !ch.enabled } : ch)));
    setHasChanges(true);
  };

  const toggleEvent = (idx: number, key: "sms" | "email" | "push" | "whatsapp") => {
    setEvents((e) => e.map((ev, i) => (i === idx ? { ...ev, [key]: !ev[key] } : ev)));
    setHasChanges(true);
  };

  /** Save notifications preferences to the backend */
  const handleSaveNotifications = async () => {
    setSaveError(null);

    const emailChannel = channels.find((c) => c.id === "email");
    const smsChannel = channels.find((c) => c.id === "sms");
    const pushChannel = channels.find((c) => c.id === "push");
    const whatsappChannel = channels.find((c) => c.id === "whatsapp");

    // Build email alerts from the events matrix
    const newOrderEmailEnabled = events.find((e) => e.id === "new_order")?.email ?? true;
    const lowStockEmailEnabled = events.find((e) => e.id === "low_stock")?.email ?? true;
    const marketingEmailEnabled = events.find((e) => e.id === "promotion")?.email ?? false;

    // Build event preferences array for the backend
    const eventPreferences = events.map(ev => ({
      event: ev.id as EventKey,
      sms: ev.sms && (smsChannel?.enabled ?? true),
      email: ev.email && (emailChannel?.enabled ?? true),
      push: ev.push && (pushChannel?.enabled ?? false),
      whatsapp: ev.whatsapp && (whatsappChannel?.enabled ?? true),
    }));

    try {
      await updateNotificationsMutation.mutateAsync({
        emailAlerts: {
          newOrder: newOrderEmailEnabled && (emailChannel?.enabled ?? true),
          lowStock: lowStockEmailEnabled && (emailChannel?.enabled ?? true),
          marketing: marketingEmailEnabled && (emailChannel?.enabled ?? true),
        },
        pushNotifications: pushChannel?.enabled ?? false,
        eventPreferences,
        channels: {
          sms: smsChannel?.enabled ?? true,
          email: emailChannel?.enabled ?? true,
          push: pushChannel?.enabled ?? false,
          whatsapp: whatsappChannel?.enabled ?? true,
        },
      });
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError("Échec de la sauvegarde. Veuillez réessayer.");
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">{ch.icon}</span>
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

      {/* ─── Card 2: Préférences par événement (shared) ─── */}
      <EventPreferencesTable
        events={events}
        onToggle={toggleEvent}
      />

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-3">
        <PillButton
          variant="primary"
          onClick={handleSaveNotifications}
          disabled={updateNotificationsMutation.isPending || !hasChanges}
        >
          {updateNotificationsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder les notifications
        </PillButton>
        {saveSuccess && (
          <span className="text-xs text-green-600"><CheckCircle2 className="inline h-3 w-3" /> Préférences sauvegardées</span>
        )}
        {saveError && (
          <span className="text-xs text-red-500">{saveError}</span>
        )}
        {hasChanges && !saveSuccess && (
          <span className="text-xs text-amber-500">Modifications non sauvegardées</span>
        )}
      </div>
    </div>
  );
}
