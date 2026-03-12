"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  Eye,
  Phone,
  Globe,
  MessageCircle,
  Facebook,
  Loader2,
  MapPin,
  Truck,
  Flag,
  AlertTriangle,
  Bike,
  type LucideIcon,
} from "lucide-react";
import type { AgencySettingsResponse } from "@/features/agency/schema";
import { useUpdateAgencySettings, useUploadAgencyLogo, useDeleteAgencyLogo } from "@/features/agency/hooks";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";
import { AccountTab } from "./tabs/account-tab";
import { VehiclesTab } from "./tabs/vehicles-tab";
import { ZonesTab } from "./tabs/zones-tab";
import { PaymentsTab } from "./tabs/payments-tab";
import { NotificationsTab } from "./tabs/notifications-tab";
import { SecurityTab } from "./tabs/security-tab";
import { SubscriptionTab } from "./tabs/subscription-tab";
import { DeleteTab } from "./tabs/delete-tab";
import { Toggle } from "./components/toggle";

// ────────────────────────────────────────────────────────────
// Vehicle icon helper (maps icon name → Lucide component)
// ────────────────────────────────────────────────────────────

const VEHICLE_ICON_MAP: Record<string, LucideIcon> = {
  bike: Bike,
  car: Car,
  truck: Truck,
};

function VehicleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = VEHICLE_ICON_MAP[name] ?? Truck;
  return <Icon className={className} />;
}

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
// Form field helpers — now controlled
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
  onChange,
  disabled,
  className,
  name,
  placeholder,
  type = "text",
  maxLength,
}: {
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      disabled={disabled}
      readOnly={!onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className={cn(
        "form-input py-2 text-sm",
        disabled && "opacity-60 cursor-not-allowed",
        !onChange && "opacity-60 cursor-not-allowed",
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
// Mon agence tab content — fully controlled form
// ────────────────────────────────────────────────────────────

interface AgencyFormState {
  agencyName: string;
  shortName: string;
  email: string;
  phonePrimary: string;
  phoneSecondary: string;
  rccm: string;
  address: string;
  city: string;
  quartier: string;
  locationDescription: string;
  agencyType: string;
  dailyCapacity: string;
  description: string;
}

function AgencyTab({
  data,
  formState,
  onFormChange,
  vehicles,
  onVehiclesChange,
  socialLinks,
  onSocialLinksChange,
  logoPreview,
  onLogoPreviewChange,
  uploadLogoMutation,
  deleteLogoMutation,
}: {
  data: AgencySettingsResponse;
  formState: AgencyFormState;
  onFormChange: (field: keyof AgencyFormState, value: string) => void;
  vehicles: Array<{ type: string; icon: string; selected: boolean }>;
  onVehiclesChange: (vehicles: Array<{ type: string; icon: string; selected: boolean }>) => void;
  socialLinks: AgencySettingsResponse["socialLinks"];
  onSocialLinksChange: (links: AgencySettingsResponse["socialLinks"]) => void;
  logoPreview: string | null;
  onLogoPreviewChange: (url: string | null) => void;
  uploadLogoMutation: ReturnType<typeof useUploadAgencyLogo>;
  deleteLogoMutation: ReturnType<typeof useDeleteAgencyLogo>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadLogoMutation.isPending;
  const isDeleting = deleteLogoMutation.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Le fichier est trop volumineux. Maximum 2 MB.");
      return;
    }
    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    onLogoPreviewChange(previewUrl);

    // Upload to backend
    uploadLogoMutation.mutate(file, {
      onError: () => {
        onLogoPreviewChange(null);
        URL.revokeObjectURL(previewUrl);
        alert("Erreur lors de l'upload du logo.");
      },
      onSuccess: (result) => {
        URL.revokeObjectURL(previewUrl);
        onLogoPreviewChange(result.url);
      },
    });

    // Reset input so re-selecting the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteLogo = () => {
    deleteLogoMutation.mutate(undefined, {
      onSuccess: () => {
        onLogoPreviewChange(null);
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

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
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-sugu-50 dark:border-gray-700 dark:bg-gray-900/40 overflow-hidden">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-sugu-500" />
                ) : logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                ) : data.logoUrl ? (
                  <img src={data.logoUrl} alt="Logo" className="h-full w-full object-cover rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sugu-500 text-xs font-black text-white">
                      SUGU
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "text-[10px] font-semibold text-sugu-500 hover:text-sugu-600 transition-colors",
                  isUploading && "opacity-50 cursor-not-allowed",
                )}
              >
                {isUploading ? "Upload en cours…" : "Changer le logo"}
              </button>
              <button
                onClick={handleDeleteLogo}
                disabled={isDeleting || isUploading || (!data.logoUrl && !logoPreview)}
                className={cn(
                  "text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors",
                  (isDeleting || (!data.logoUrl && !logoPreview)) && "opacity-50 cursor-not-allowed",
                )}
              >
                {isDeleting ? "Suppression…" : "Supprimer"}
              </button>
              <p className="text-[9px] text-gray-400">PNG, JPG • Max 2MB</p>
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>Nom de l&apos;agence</FieldLabel>
                <input
                  type="text"
                  name="agencyName"
                  value={formState.agencyName}
                  onChange={(e) => onFormChange("agencyName", e.target.value)}
                  maxLength={255}
                  className="form-input py-2 text-sm"
                />
              </div>
              <div>
                <FieldLabel>Sigle / Nom court</FieldLabel>
                <input
                  type="text"
                  name="shortName"
                  value={formState.shortName}
                  onChange={(e) => onFormChange("shortName", e.target.value)}
                  maxLength={50}
                  className="form-input py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel required>Email de l&apos;agence</FieldLabel>
                <div className="relative">
                  <FieldInput
                    value={formState.email}
                    onChange={(v) => onFormChange("email", v)}
                    name="email"
                    type="email"
                  />
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
                  <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <FieldInput
                    value={formState.phonePrimary}
                    onChange={(v) => onFormChange("phonePrimary", v)}
                    className="pl-8"
                    name="phonePrimary"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Téléphone secondaire</FieldLabel>
                <FieldInput
                  value={formState.phoneSecondary}
                  onChange={(v) => onFormChange("phoneSecondary", v)}
                  name="phoneSecondary"
                  placeholder="Optionnel"
                />
              </div>
              <div>
                <FieldLabel required>Numéro RCCM / NIF</FieldLabel>
                <input
                  type="text"
                  name="rccm"
                  value={formState.rccm}
                  onChange={(e) => onFormChange("rccm", e.target.value)}
                  maxLength={255}
                  className="form-input py-2 text-sm"
                />
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
            <MapPin className="h-4 w-4 text-sugu-500" />
            Adresse &amp; Localisation
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <FieldLabel required>Adresse du siège</FieldLabel>
              <FieldInput
                value={formState.address}
                onChange={(v) => onFormChange("address", v)}
                name="address"
              />
            </div>
            <div>
              <FieldLabel required>Ville</FieldLabel>
              <FieldInput
                value={formState.city}
                onChange={(v) => onFormChange("city", v)}
                name="city"
              />
            </div>
            <div>
              <FieldLabel required>Quartier</FieldLabel>
              <FieldInput
                value={formState.quartier}
                onChange={(v) => onFormChange("quartier", v)}
                name="quartier"
              />
            </div>
            <div>
              <FieldLabel>Pays</FieldLabel>
              <div className="flex items-center gap-2">
                <FieldInput value={data.country} disabled />
                <Flag className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="sm:col-span-3">
              <FieldLabel>Description de l&apos;emplacement</FieldLabel>
              <textarea
                name="locationDescription"
                value={formState.locationDescription}
                onChange={(e) => onFormChange("locationDescription", e.target.value)}
                placeholder="Description de l'emplacement"
                rows={2}
                maxLength={500}
                className="form-input py-2 text-sm resize-none"
              />
            </div>
          </div>
        </section>

        {/* ── Informations de service ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <Truck className="h-4 w-4 text-sugu-500" />
            Informations de service
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Type d&apos;agence</FieldLabel>
              <select
                name="agencyType"
                value={formState.agencyType}
                onChange={(e) => onFormChange("agencyType", e.target.value)}
                className="form-input py-2 text-sm"
              >
                <option value="">Sélectionner un type</option>
                <option value="Livraison express">Livraison express</option>
                <option value="Livraison standard">Livraison standard</option>
                <option value="Coursier">Coursier</option>
              </select>
            </div>
            <div>
              <FieldLabel>Capacité journalière</FieldLabel>
              <FieldInput
                value={formState.dailyCapacity}
                onChange={(v) => onFormChange("dailyCapacity", v)}
                name="dailyCapacity"
              />
            </div>
          </div>

          {/* Vehicle types */}
          <div className="mt-3 flex flex-wrap gap-2">
            {vehicles.map((v, i) => (
              <button
                key={v.type}
                type="button"
                onClick={() => {
                  const next = [...vehicles];
                  next[i] = { ...next[i], selected: !next[i].selected };
                  onVehiclesChange(next);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                  v.selected
                    ? "border-sugu-400 bg-sugu-500 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
                )}
              >
                <VehicleIcon name={v.icon} className="h-4 w-4" />
                {v.type}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <FieldLabel>Description de l&apos;agence</FieldLabel>
            <textarea
              name="description"
              value={formState.description}
              onChange={(e) => onFormChange("description", e.target.value)}
              rows={3}
              maxLength={2000}
              className="form-input py-2 text-sm resize-none"
            />
          </div>
        </section>
      </div>

      {/* ═══ Right column ═══ */}
      <div className="space-y-4">
        {/* ── Réseaux & Contact public ── */}
        <section className="glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-4">
            <Phone className="h-4 w-4 text-sugu-500" />
            Réseaux &amp; Contact public
          </h3>
          <div className="space-y-4">
            {socialLinks.map((link, idx) => (
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
                    <input
                      type="text"
                      value={link.value}
                      onChange={(e) => {
                        const updated = [...socialLinks];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        onSocialLinksChange(updated);
                      }}
                      className="form-input py-2 text-sm pr-8"
                      placeholder={link.icon === "globe" ? "https://..." : ""}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      <SocialIcon icon={link.icon} />
                    </span>
                  </div>
                  <Toggle
                    checked={link.enabled}
                    onChange={() => {
                      const updated = [...socialLinks];
                      updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                      onSocialLinksChange(updated);
                    }}
                    label={`${link.platform} activé`}
                  />
                  <Toggle
                    checked={link.visibleOnSugu}
                    onChange={() => {
                      const updated = [...socialLinks];
                      updated[idx] = { ...updated[idx], visibleOnSugu: !updated[idx].visibleOnSugu };
                      onSocialLinksChange(updated);
                    }}
                    label={`${link.platform} visible`}
                  />
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
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  // Agency tab form state — fully controlled
  const [formState, setFormState] = useState<AgencyFormState>({
    agencyName: data.agencyName,
    shortName: data.shortName,
    email: data.email,
    phonePrimary: data.phonePrimary,
    phoneSecondary: data.phoneSecondary,
    rccm: data.rccm,
    address: data.address,
    city: data.city,
    quartier: data.quartier,
    locationDescription: data.locationDescription,
    agencyType: data.agencyType,
    dailyCapacity: data.dailyCapacity,
    description: data.description,
  });

  const [vehicles, setVehicles] = useState(data.vehicles ?? []);
  const [socialLinks, setSocialLinks] = useState(data.socialLinks ?? []);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const updateMutation = useUpdateAgencySettings();
  const uploadLogoMutation = useUploadAgencyLogo();
  const deleteLogoMutation = useDeleteAgencyLogo();

  // Mark form as dirty — no deps on hasChanges to avoid stale closure
  const markDirty = useCallback(() => setHasChanges(true), []);

  const handleFormChange = useCallback((field: keyof AgencyFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    markDirty();
  }, [markDirty]);

  const handleVehiclesChange = useCallback(
    (newVehicles: Array<{ type: string; icon: string; selected: boolean }>) => {
      setVehicles(newVehicles);
      markDirty();
    },
    [markDirty],
  );

  const handleSocialLinksChange = useCallback(
    (newLinks: AgencySettingsResponse["socialLinks"]) => {
      setSocialLinks(newLinks);
      markDirty();
    },
    [markDirty],
  );



  // Collect form data and submit via mutation
  const handleSave = useCallback(() => {
    // Only the agency tab uses this global save button
    if (activeTab !== "agency") return;
    // Prevent double-submit
    if (updateMutation.isPending) return;

    // Client-side validation for required fields
    if (!formState.agencyName.trim()) {
      setShowErrorToast(true);
      return;
    }
    if (!formState.email.trim()) {
      setShowErrorToast(true);
      return;
    }
    if (!formState.phonePrimary.trim()) {
      setShowErrorToast(true);
      return;
    }

    const payload: UpdateAgencySettingsPayload = {
      ...formState,
      vehicles,
      socialLinks,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setHasChanges(false);
        setShowSuccessToast(true);
      },
      onError: () => {
        setShowErrorToast(true);
      },
    });
  }, [activeTab, formState, vehicles, socialLinks, updateMutation]);

  // Auto-dismiss toasts after 3s
  useEffect(() => {
    if (showSuccessToast) {
      const t = setTimeout(() => setShowSuccessToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (showErrorToast) {
      const t = setTimeout(() => setShowErrorToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showErrorToast]);

  // Reset the form to original values
  const handleCancel = useCallback(() => {
    setFormState({
      agencyName: data.agencyName,
      shortName: data.shortName,
      email: data.email,
      phonePrimary: data.phonePrimary,
      phoneSecondary: data.phoneSecondary,
      rccm: data.rccm,
      address: data.address,
      city: data.city,
      quartier: data.quartier,
      locationDescription: data.locationDescription,
      agencyType: data.agencyType,
      dailyCapacity: data.dailyCapacity,
      description: data.description,
    });
    setVehicles(data.vehicles ?? []);
    setSocialLinks(data.socialLinks ?? []);
    setLogoPreview(null);
    setHasChanges(false);
  }, [data]);

  const showFooter = hasChanges && activeTab !== "subscription" && activeTab !== "delete";
  const isSaving = updateMutation.isPending;

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
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-sugu-600",
              (isSaving || !hasChanges) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isSaving ? "Sauvegarde…" : "Sauvegarder tout"}
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
          {activeTab === "agency" && (
            <AgencyTab
              data={data}
              formState={formState}
              onFormChange={handleFormChange}
              vehicles={vehicles}
              onVehiclesChange={handleVehiclesChange}
              socialLinks={socialLinks}
              onSocialLinksChange={handleSocialLinksChange}
              logoPreview={logoPreview}
              onLogoPreviewChange={setLogoPreview}
              uploadLogoMutation={uploadLogoMutation}
              deleteLogoMutation={deleteLogoMutation}
            />
          )}
          {activeTab === "account" && <AccountTab data={data} />}
          {activeTab === "vehicles" && <VehiclesTab data={data} onSave={(payload: UpdateAgencySettingsPayload) => updateMutation.mutate(payload)} isSaving={isSaving} />}
          {activeTab === "zones" && <ZonesTab data={data} onSave={(payload: UpdateAgencySettingsPayload) => updateMutation.mutate(payload)} isSaving={isSaving} />}
          {activeTab === "payments" && <PaymentsTab data={data} onSave={(payload: UpdateAgencySettingsPayload) => updateMutation.mutate(payload)} isSaving={isSaving} />}
          {activeTab === "notifications" && <NotificationsTab data={data} onSave={(payload: UpdateAgencySettingsPayload) => updateMutation.mutate(payload)} isSaving={isSaving} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "subscription" && <SubscriptionTab />}
          {activeTab === "delete" && <DeleteTab />}
        </div>
      </div>

      {/* ══ Success toast indicator — auto-dismisses after 3s ══ */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-card-enter inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          Paramètres sauvegardés
        </div>
      )}

      {/* ══ Error indicator — auto-dismisses after 4s ══ */}
      {showErrorToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-card-enter inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg">
          <AlertTriangle className="h-4 w-4" /> Erreur lors de la sauvegarde
        </div>
      )}

      {/* ══ Footer bar (unsaved changes) ══ */}
      {showFooter && (
        <footer className="glass-card rounded-2xl px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-card-enter">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-3 w-3" />
            </span>
            <span className="font-semibold">Modifications non sauvegardées</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              Annuler les modifications
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-sugu-600",
                isSaving && "opacity-50 cursor-not-allowed",
              )}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Sauvegarde…" : "Sauvegarder les modifications"}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
