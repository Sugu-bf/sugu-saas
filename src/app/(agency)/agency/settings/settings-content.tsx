"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2,
  User,
  Car,
  MapPinned,
  CreditCard,
  Bell,
  ShieldCheck,
  Crown,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Eye,
  Phone,
  Globe,
  MessageCircle,
  Facebook,
} from "lucide-react";
import type { AgencySettingsResponse } from "@/features/agency/schema";
import { AccountTab } from "./tabs/account-tab";
import { VehiclesTab } from "./tabs/vehicles-tab";
import { ZonesTab } from "./tabs/zones-tab";
import { PaymentsTab } from "./tabs/payments-tab";
import { NotificationsTab } from "./tabs/notifications-tab";
import { SecurityTab } from "./tabs/security-tab";
import { SubscriptionTab } from "./tabs/subscription-tab";
import { DeleteTab } from "./tabs/delete-tab";

// ────────────────────────────────────────────────────────────
// Sidebar tabs
// ────────────────────────────────────────────────────────────

type SettingsTab =
  | "agency"
  | "account"
  | "vehicles"
  | "zones"
  | "payments"
  | "notifications"
  | "security"
  | "subscription"
  | "delete";

const SETTINGS_TABS: {
  key: SettingsTab;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}[] = [
  { key: "agency", label: "Mon agence", icon: <Building2 className="h-4 w-4" /> },
  { key: "account", label: "Mon compte", icon: <User className="h-4 w-4" /> },
  { key: "vehicles", label: "Véhicules & Flotte", icon: <Car className="h-4 w-4" /> },
  { key: "zones", label: "Zones de couverture", icon: <MapPinned className="h-4 w-4" /> },
  { key: "payments", label: "Paiements", icon: <CreditCard className="h-4 w-4" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { key: "security", label: "Sécurité", icon: <ShieldCheck className="h-4 w-4" /> },
  {
    key: "subscription",
    label: "Mon abonnement",
    icon: <Crown className="h-4 w-4" />,
  },
  {
    key: "delete",
    label: "Supprimer l'agence",
    icon: <Trash2 className="h-4 w-4" />,
    danger: true,
  },
];

// ────────────────────────────────────────────────────────────
// Toggle switch
// ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Form field helpers
// ────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
      {children}
      {required && <span className="text-sugu-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldInput({
  value,
  disabled,
  className,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      disabled={disabled}
      className={cn(
        "form-input py-2 text-sm",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    />
  );
}

// ────────────────────────────────────────────────────────────
// Social icon helper
// ────────────────────────────────────────────────────────────

function SocialIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "whatsapp":
      return <MessageCircle className="h-4 w-4 text-green-500" />;
    case "facebook":
      return <Facebook className="h-4 w-4 text-blue-600" />;
    case "globe":
      return <Globe className="h-4 w-4 text-gray-400" />;
    default:
      return <Globe className="h-4 w-4 text-gray-400" />;
  }
}

// ────────────────────────────────────────────────────────────
// Mon agence tab content
// ────────────────────────────────────────────────────────────

function AgencyTab({ data }: { data: AgencySettingsResponse }) {
  const [scheduleState, setScheduleState] = useState(data.schedule);
  const [vehicles, setVehicles] = useState(data.vehicles);
  const [sameHours, setSameHours] = useState(data.sameHoursWeekdays);
  const [afterHours, setAfterHours] = useState(data.acceptAfterHours);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      {/* ═══ Left column ═══ */}
      <div className="space-y-4">
        {/* ── Logo & Identité ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
            Logo &amp; Identité
          </h3>
          <div className="flex flex-col gap-5 sm:flex-row">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-sugu-50 dark:border-gray-700 dark:bg-gray-900/40">
                {data.logoUrl ? (
                  <span className="text-3xl">📦</span>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-400 to-sugu-600 text-xs font-black text-white">
                      SUGU
                    </div>
                  </div>
                )}
              </div>
              <button className="text-[10px] font-semibold text-sugu-500 hover:text-sugu-600">
                Changer le logo
              </button>
              <button className="text-[10px] font-semibold text-red-500 hover:text-red-600">
                Supprimer
              </button>
              <p className="text-[9px] text-gray-400">PNG, JPG • Max 2MB</p>
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>Nom de l&apos;agence</FieldLabel>
                <FieldInput value={data.agencyName} />
              </div>
              <div>
                <FieldLabel>Sigle / Nom court</FieldLabel>
                <FieldInput value={data.shortName} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel required>Email de l&apos;agence</FieldLabel>
                <div className="relative">
                  <FieldInput value={data.email} />
                  {data.emailVerified && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Vérifié
                    </span>
                  )}
                </div>
              </div>
              <div>
                <FieldLabel required>Téléphone principal</FieldLabel>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">🇲🇱</span>
                  <FieldInput value={data.phonePrimary} className="pl-8" />
                </div>
              </div>
              <div>
                <FieldLabel>Téléphone secondaire</FieldLabel>
                <FieldInput value={data.phoneSecondary} />
              </div>
              <div>
                <FieldLabel required>Numéro RCCM / NIF</FieldLabel>
                <FieldInput value={data.rccm} />
              </div>
              <div>
                <FieldLabel>Date de création</FieldLabel>
                <FieldInput value={data.createdAt} disabled />
              </div>
            </div>
          </div>
        </section>

        {/* ── Adresse & Localisation ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <span className="text-base">📍</span>
            Adresse &amp; Localisation
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <FieldLabel required>Adresse du siège</FieldLabel>
              <FieldInput value={data.address} />
            </div>
            <div>
              <FieldLabel required>Ville</FieldLabel>
              <FieldInput value={data.city} />
            </div>
            <div>
              <FieldLabel required>Quartier</FieldLabel>
              <FieldInput value={data.quartier} />
            </div>
            <div>
              <FieldLabel>Pays</FieldLabel>
              <div className="flex items-center gap-2">
                <FieldInput value={data.country} disabled />
                <span className="text-lg">{data.countryFlag}</span>
              </div>
            </div>
            <div className="sm:col-span-3">
              <FieldLabel>Description de l&apos;emplacement</FieldLabel>
              <textarea
                defaultValue={data.locationDescription}
                placeholder="Description de l'emplacement"
                rows={2}
                className="form-input py-2 text-sm resize-none"
              />
            </div>
          </div>
        </section>

        {/* ── Informations de service ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <span className="text-base">🚚</span>
            Informations de service
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Type d&apos;agence</FieldLabel>
              <select defaultValue={data.agencyType} className="form-input py-2 text-sm">
                <option>Livraison express</option>
                <option>Livraison standard</option>
                <option>Coursier</option>
              </select>
            </div>
            <div>
              <FieldLabel>Capacité journalière</FieldLabel>
              <FieldInput value={data.dailyCapacity} />
            </div>
          </div>

          {/* Vehicle types */}
          <div className="mt-3 flex flex-wrap gap-2">
            {vehicles.map((v, i) => (
              <button
                key={v.type}
                onClick={() => {
                  const next = [...vehicles];
                  next[i] = { ...next[i], selected: !next[i].selected };
                  setVehicles(next);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                  v.selected
                    ? "border-sugu-400 bg-sugu-500 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
                )}
              >
                <span>{v.icon}</span>
                {v.type}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <FieldLabel>Description de l&apos;agence</FieldLabel>
            <textarea
              defaultValue={data.description}
              rows={3}
              className="form-input py-2 text-sm resize-none"
            />
          </div>
        </section>
      </div>

      {/* ═══ Right column ═══ */}
      <div className="space-y-4">
        {/* ── Horaires de service ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <Clock className="h-4 w-4 text-sugu-500" />
            Horaires de service
          </h3>
          <div className="space-y-2.5">
            {scheduleState.map((day, i) => (
              <div key={day.day} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {day.day}
                </span>
                <Toggle
                  checked={day.enabled}
                  label={`${day.day} activé`}
                  onChange={() => {
                    const next = [...scheduleState];
                    next[i] = { ...next[i], enabled: !next[i].enabled };
                    setScheduleState(next);
                  }}
                />
                {day.enabled ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      defaultValue={day.openTime}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    />
                    <span className="text-[10px] text-gray-400">à</span>
                    <input
                      type="time"
                      defaultValue={day.closeTime}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    />
                  </div>
                ) : (
                  <span className="text-xs italic text-gray-400">Fermé</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={sameHours}
                onChange={() => setSameHours(!sameHours)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500"
              />
              Appliquer les mêmes horaires Lun-Ven
            </label>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={afterHours}
                  onChange={() => setAfterHours(!afterHours)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500"
                />
                <span>
                  Accepter des livraisons en dehors des horaires
                  <br />
                  <span className="text-[10px] text-gray-400">
                    (Surcharge de {data.afterHoursSurcharge})
                  </span>
                </span>
              </label>
              <Toggle checked={afterHours} label="Après horaires" onChange={() => setAfterHours(!afterHours)} />
            </div>
          </div>
        </section>

        {/* ── Réseaux & Contact public ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <Phone className="h-4 w-4 text-sugu-500" />
            Réseaux &amp; Contact public
          </h3>
          <div className="space-y-4">
            {data.socialLinks.map((link) => (
              <div key={link.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {link.platform}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Eye className="h-3 w-3" />
                    Visible sur SUGU
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <FieldInput value={link.value} className="pr-8" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      <SocialIcon icon={link.icon} />
                    </span>
                  </div>
                  <Toggle checked={link.enabled} label={`${link.platform} activé`} />
                  <Toggle checked={link.visibleOnSugu} label={`${link.platform} visible`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}



// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function SettingsContent({ data }: { data: AgencySettingsResponse }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("agency");
  const [hasChanges] = useState(true);

  const showFooter = hasChanges && activeTab !== "subscription" && activeTab !== "delete";

  return (
    <div className="space-y-4">
      {/* ══ Header ══ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Paramètres
        </h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            Dernière sauvegarde: {data.lastSaved}
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </span>
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sugu-500/25 hover:shadow-lg transition-all">
            <Save className="h-3.5 w-3.5" />
            Sauvegarder tout
          </button>
        </div>
      </header>

      {/* ══ Body: sidebar + content ══ */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Settings sidebar */}
        <nav
          className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:w-52 lg:flex-shrink-0 lg:overflow-visible"
          aria-label="Paramètres navigation"
        >
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all lg:w-full",
                activeTab === tab.key
                  ? "bg-sugu-500 text-white shadow-sm"
                  : tab.danger
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "subscription" && (
                <span className="ml-auto rounded bg-sugu-50 px-1.5 py-0.5 text-[9px] font-bold text-sugu-600 dark:bg-sugu-950/30">
                  Pro
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="min-w-0 flex-1">
          {activeTab === "agency" && <AgencyTab data={data} />}
          {activeTab === "account" && <AccountTab />}
          {activeTab === "vehicles" && <VehiclesTab />}
          {activeTab === "zones" && <ZonesTab />}
          {activeTab === "payments" && <PaymentsTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "subscription" && <SubscriptionTab />}
          {activeTab === "delete" && <DeleteTab />}
        </div>
      </div>

      {/* ══ Footer bar (unsaved changes) ══ */}
      {showFooter && (
        <footer className="glass-card rounded-2xl px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-card-enter">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
              ⚠
            </span>
            <span className="font-semibold">Modifications non sauvegardées</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              Annuler les modifications
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sugu-500/25 hover:shadow-lg transition-all">
              <Save className="h-3.5 w-3.5" />
              Sauvegarder les modifications
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
