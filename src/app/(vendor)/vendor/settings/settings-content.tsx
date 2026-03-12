"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  VendorSettings,
  SocialLink,
} from "@/features/vendor/schema";
import {
  useVendorSettings,
  useUpdateIdentity,
  useUpdateContact,
  useUpdateProfile,
  useUploadLogo,
  useUploadCover,
  useStoreCategories,
} from "@/features/vendor/hooks";
import {
  buildIdentityRequest,
  buildContactRequest,
  buildProfileRequest,
} from "@/features/vendor/service";
import { Toggle, PillInput, PillSelect, PillButton, SectionCard, Field } from "./settings-ui";
import { TabPayments } from "./tab-payments";
import { TabDelivery } from "./tab-delivery";
import { TabNotifications } from "./tab-notifications";
import { TabSecurity } from "./tab-security";
import { TabIntegrations } from "./tab-integrations";
import { TabDisplay } from "./tab-display";
import { TabSubscription } from "./tab-subscription";
import { TabLegal } from "./tab-legal";
import { TabDeleteAccount } from "./tab-delete-account";
import {
  User,
  CreditCard,
  Truck,
  Bell,
  Shield,
  Puzzle,
  Palette,
  Crown,
  Trash2,
  Camera,
  Copy,
  Check,
  AlertTriangle,
  Save,
  Globe,
  MessageCircle,
  Facebook,
  Instagram,
  Upload,
  Scale,
  Loader2,
  Phone,
  Languages,
  Store,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type SettingsTab =
  | "profile"
  | "payments"
  | "delivery"
  | "notifications"
  | "security"
  | "integrations"
  | "display"
  | "subscription"
  | "legal"
  | "delete";

interface NavItem {
  key: SettingsTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  danger?: boolean;
  pro?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "profile", label: "Mon profil", icon: <User className="h-4 w-4" /> },
  { key: "payments", label: "Paiements & Facturation", icon: <CreditCard className="h-4 w-4" /> },
  { key: "delivery", label: "Livraison", icon: <Truck className="h-4 w-4" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, badge: 3 },
  { key: "security", label: "Sécurité", icon: <Shield className="h-4 w-4" /> },
  { key: "integrations", label: "Intégrations", icon: <Puzzle className="h-4 w-4" /> },
  { key: "display", label: "Préférences d'affichage", icon: <Palette className="h-4 w-4" /> },
  { key: "subscription", label: "Mon abonnement", icon: <Crown className="h-4 w-4" />, pro: true },
  { key: "legal", label: "Mentions légales", icon: <Scale className="h-4 w-4" /> },
  { key: "delete", label: "Supprimer le compte", icon: <Trash2 className="h-4 w-4" />, danger: true },
];

// Social platform icons
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
};

// ────────────────────────────────────────────────────────────
// Page Client Wrapper (with React Query)
// ────────────────────────────────────────────────────────────

/** Client entry point: fetches settings via React Query + renders content */
export function SettingsPageClient() {
  const { data, isLoading, error } = useVendorSettings();

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1440px] py-20 text-center">
        <p className="text-red-500">Erreur lors du chargement des paramètres.</p>
        <p className="mt-2 text-sm text-gray-500">Veuillez réessayer.</p>
      </div>
    );
  }

  return <SettingsContent data={data} />;
}

/** Skeleton while settings are loading */
function SettingsLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <div className="glass-card space-y-2 rounded-2xl p-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        </div>
        <div className="space-y-6 xl:col-span-9">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl p-6">
              <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-6 space-y-4">
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface SettingsContentProps {
  data: VendorSettings;
}

export function SettingsContent({ data }: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Profile form state
  const [profile, setProfile] = useState(data.profile);
  const [shop, setShop] = useState(data.shop);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(data.socialLinks);
  const [showSocialOnShop, setShowSocialOnShop] = useState(data.showSocialOnShop);

  // File upload refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Mutation hooks
  const updateIdentityMutation = useUpdateIdentity();
  const updateContactMutation = useUpdateContact();
  const updateProfileMutation = useUpdateProfile();
  const uploadLogoMutation = useUploadLogo();
  const uploadCoverMutation = useUploadCover();
  const isSaving = updateIdentityMutation.isPending || updateContactMutation.isPending || updateProfileMutation.isPending;

  // Load categories from API
  const { data: categories = [] } = useStoreCategories();

  // Compute subcategories based on selected main category
  const selectedMainCat = categories.find(
    (c) => c.name === shop.mainCategory || c.id === shop.mainCategory
  );
  const subCategories = selectedMainCat?.children ?? [];

  // File upload handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le logo ne doit pas dépasser 2 Mo");
      return;
    }
    try {
      const result = await uploadLogoMutation.mutateAsync(file);
      setShop((prev) => ({ ...prev, logoUrl: result.url }));
      toast.success("Logo mis à jour avec succès");
    } catch {
      toast.error("Erreur lors de l'upload du logo");
    }
    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La bannière ne doit pas dépasser 5 Mo");
      return;
    }
    try {
      const result = await uploadCoverMutation.mutateAsync(file);
      setShop((prev) => ({ ...prev, bannerUrl: result.url }));
      toast.success("Bannière mise à jour avec succès");
    } catch {
      toast.error("Erreur lors de l'upload de la bannière");
    }
    e.target.value = "";
  };

  const copySlug = () => {
    navigator.clipboard?.writeText(`${shop.baseUrl}${shop.slug}`);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const updateProfile = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateShop = (field: string, value: string) => {
    setShop((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const toggleSocialLink = (id: string) => {
    setSocialLinks((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setHasChanges(true);
  };

  const updateSocialValue = (id: string, value: string) => {
    setSocialLinks((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
    setHasChanges(true);
  };



  /** Save profile tab: calls identity + contact + profile + business hours mutations in parallel */
  const handleSaveProfile = async () => {
    try {
      await Promise.all([
        updateIdentityMutation.mutateAsync(buildIdentityRequest(shop)),
        updateContactMutation.mutateAsync(buildContactRequest(profile, shop, socialLinks)),
        updateProfileMutation.mutateAsync(buildProfileRequest(profile)),
      ]);
      setHasChanges(false);
    } catch (err) {
      console.error("[settings] Save failed:", err);
    }
  };

  /** Cancel changes: reset to last fetched data */
  const handleCancelChanges = () => {
    setProfile(data.profile);
    setShop(data.shop);
    setSocialLinks(data.socialLinks);
    setShowSocialOnShop(data.showSocialOnShop);
    setHasChanges(false);
  };

  const lastSaveDate = new Date(data.lastSavedAt);
  const minutesAgo = Math.round((Date.now() - lastSaveDate.getTime()) / 60000);
  const lastSaveLabel = minutesAgo < 1 ? "à l'instant" : `il y a ${minutesAgo} min`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-20">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-500 dark:text-gray-400">Dernière sauvegarde: {lastSaveLabel}</span>
          </div>
          <PillButton variant="primary" onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder tout
          </PillButton>
        </div>
      </header>

      {/* ════════════ Layout: Nav + Content ════════════ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ──── Left: Settings Navigation ──── */}
        <nav className="xl:col-span-3" aria-label="Navigation des paramètres">
          <div className="glass-card sticky top-4 space-y-0.5 rounded-2xl p-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all",
                  activeTab === item.key
                    ? "bg-sugu-500 text-white"
                    : item.danger
                      ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                      : "text-gray-600 hover:bg-gray-100/80 dark:text-gray-400 dark:hover:bg-gray-800/50",
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    activeTab === item.key ? "bg-white/20 text-white" : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
                  )}>
                    {item.badge}
                  </span>
                )}
                {item.pro && (
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    activeTab === item.key ? "bg-white/20 text-white" : "bg-sugu-100 text-sugu-600 dark:bg-sugu-950/30 dark:text-sugu-400",
                  )}>
                    Pro
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* ──── Right: Tab Content (75% width) ──── */}
        <div className="xl:col-span-9">
          {/* Profile Tab — inline (uses full width with 2-col layout) */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Center: Profile & Shop Form */}
              <main className="space-y-6 xl:col-span-7">
                {/* Photo de profil & Identité */}
                <SectionCard title="Photo de profil & Identité" id="profile-identity-title">
                  {/* Avatar */}
                  <div className="mt-5 flex items-center gap-5">
                    <div className="relative">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sugu-500 text-2xl font-bold text-white">
                        {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                      </div>
                      <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sugu-500 text-white shadow-sm transition-all hover:bg-sugu-600 dark:border-gray-900" aria-label="Changer la photo">
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div>
                      <button className="text-sm font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400">Changer la photo</button>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Supprimer</p>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">JPG, PNG • Max 2MB</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Prénom" required><PillInput value={profile.firstName} onChange={(v) => updateProfile("firstName", v)} /></Field>
                    <Field label="Nom" required><PillInput value={profile.lastName} onChange={(v) => updateProfile("lastName", v)} /></Field>
                  </div>

                  {/* Email */}
                  <div className="mt-4">
                    <Field label="Email" required>
                      <PillInput
                        value={profile.email}
                        onChange={(v) => updateProfile("email", v)}
                        suffix={profile.emailVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-950/30 dark:text-green-400">
                            <Check className="h-3 w-3" /> Vérifié
                          </span>
                        ) : undefined}
                      />
                    </Field>
                  </div>

                  {/* Phones */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Téléphone">
                      <PillInput value={profile.phone} onChange={(v) => updateProfile("phone", v)} prefix={<Phone className="h-3.5 w-3.5 text-gray-400" />} />
                    </Field>
                    <Field label="Téléphone secondaire">
                      <PillInput value={profile.phoneSecondary ?? ""} onChange={(v) => updateProfile("phoneSecondary", v)} placeholder="Optionnel" />
                    </Field>
                  </div>

                  {/* Language & Timezone */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Langue">
                      <PillSelect value={profile.language} onChange={(v) => updateProfile("language", v)} prefix={<Languages className="h-3.5 w-3.5 text-gray-400" />} options={[{ value: "Français", label: "Français" }, { value: "English", label: "English" }]} />
                    </Field>
                    <Field label="Fuseau horaire">
                      <PillSelect value={profile.timezone} onChange={(v) => updateProfile("timezone", v)} options={[
                        { value: "Africa/Bamako (GMT+0)", label: "Africa/Bamako (GMT+0)" },
                        { value: "Africa/Ouagadougou (GMT+0)", label: "Africa/Ouagadougou (GMT+0)" },
                        { value: "Africa/Dakar (GMT+0)", label: "Africa/Dakar (GMT+0)" },
                        { value: "Africa/Lagos (GMT+1)", label: "Africa/Lagos (GMT+1)" },
                      ]} />
                    </Field>
                  </div>
                </SectionCard>

                {/* Shop Info */}
                <SectionCard title="Informations de la boutique" id="shop-info-title">
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nom de la boutique" required>
                      <PillInput value={shop.name} onChange={(v) => updateShop("name", v)} />
                    </Field>
                    <Field label="Slug URL">
                      <PillInput
                        value={shop.slug}
                        onChange={(v) => updateShop("slug", v)}
                        prefix={<span className="text-[10px]">{shop.baseUrl}</span>}
                        suffix={
                          <button onClick={copySlug} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600" aria-label="Copier l'URL">
                            {copiedSlug ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copier
                          </button>
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Description courte">
                      <textarea value={shop.shortDescription} onChange={(e) => updateShop("shortDescription", e.target.value)} rows={3} className="w-full rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-700 backdrop-blur placeholder:text-gray-400 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 resize-none" />
                    </Field>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Ville" required><PillInput value={shop.city} onChange={(v) => updateShop("city", v)} /></Field>
                    <Field label="Quartier" required><PillInput value={shop.quarter} onChange={(v) => updateShop("quarter", v)} /></Field>
                    <Field label="Adresse complète"><PillInput value={shop.fullAddress} onChange={(v) => updateShop("fullAddress", v)} /></Field>
                  </div>

                  {/* Hidden file inputs */}
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                  <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />

                  {/* Logo & Banner */}
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Logo de la boutique</p>
                      <div className="mt-2 flex items-center gap-4">
                        {shop.logoUrl ? (
                          <img src={shop.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-sugu-500 text-xl font-bold text-white">
                            {shop.name?.charAt(0)?.toUpperCase() ?? "S"}
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <PillButton variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadLogoMutation.isPending}>
                            <Upload className="h-3 w-3" /> {uploadLogoMutation.isPending ? "Envoi..." : "Changer le logo"}
                          </PillButton>
                          <button className="text-[11px] text-gray-400 hover:text-gray-600">Supprimer</button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Bannière de la boutique</p>
                      <div className="mt-2">
                        <div className="relative h-20 overflow-hidden rounded-xl bg-sugu-100 dark:bg-sugu-900/20">
                          {shop.bannerUrl ? (
                            <img src={shop.bannerUrl} alt="Bannière" className="h-full w-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center"><Store className="h-8 w-8 text-gray-400 opacity-40" /></div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <PillButton variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploadCoverMutation.isPending}>
                            <Upload className="h-3 w-3" /> {uploadCoverMutation.isPending ? "Envoi..." : "Changer la bannière"}
                          </PillButton>
                          <span className="text-[10px] text-gray-400">Recommandé: 1200×400px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category — loaded from API */}
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Catégorie principale">
                      <PillSelect
                        value={shop.mainCategory}
                        onChange={(v) => {
                          // Reset subcategory when main category changes
                          setShop((prev) => ({ ...prev, mainCategory: v, subCategory: undefined }));
                          setHasChanges(true);
                        }}
                        options={
                          categories.length > 0
                            ? categories.map((c) => ({ value: c.name, label: c.name }))
                            : [{ value: shop.mainCategory, label: shop.mainCategory }]
                        }
                      />
                    </Field>
                    <Field label="Sous-catégorie">
                      <PillSelect
                        value={shop.subCategory ?? ""}
                        onChange={(v) => updateShop("subCategory", v)}
                        options={
                          subCategories.length > 0
                            ? [{ value: "", label: "— Sélectionner —" }, ...subCategories.map((c) => ({ value: c.name, label: c.name }))]
                            : [{ value: shop.subCategory ?? "", label: shop.subCategory || "Aucune sous-catégorie" }]
                        }
                      />
                    </Field>
                  </div>
                </SectionCard>
              </main>

              {/* Right Sidebar: Social & Hours */}
              <aside className="space-y-6 xl:col-span-5" aria-label="Réseaux sociaux et horaires">
                {/* Social Links */}
                <SectionCard title="" id="social-section">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Réseaux sociaux & Contact</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {socialLinks.map((link) => (
                      <div key={link.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100/80 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                          {SOCIAL_ICONS[link.platform]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{link.label}</p>
                          <input
                            type="text"
                            value={link.value}
                            onChange={(e) => updateSocialValue(link.id, e.target.value)}
                            placeholder={link.platform === "website" ? "https://..." : ""}
                            className="mt-0.5 w-full rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-gray-700 backdrop-blur placeholder:text-gray-300 transition-all focus:border-sugu-300 focus:outline-none focus:ring-1 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200"
                            aria-label={link.label}
                          />
                        </div>
                        <Toggle checked={link.enabled} onChange={() => toggleSocialLink(link.id)} label={`Activer ${link.label}`} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50/80 px-3 py-2.5 dark:bg-gray-800/30">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Visible sur la boutique</span>
                    <Toggle checked={showSocialOnShop} onChange={() => { setShowSocialOnShop(!showSocialOnShop); setHasChanges(true); }} label="Visible sur la boutique" />
                  </div>
                </SectionCard>


              </aside>
            </div>
          )}

          {/* Other tabs */}
          {activeTab === "payments" && <TabPayments />}
          {activeTab === "delivery" && <TabDelivery />}
          {activeTab === "notifications" && <TabNotifications />}
          {activeTab === "security" && <TabSecurity />}
          {activeTab === "integrations" && <TabIntegrations />}
          {activeTab === "display" && <TabDisplay />}
          {activeTab === "subscription" && <TabSubscription />}
          {activeTab === "legal" && <TabLegal />}
          {activeTab === "delete" && <TabDeleteAccount />}
        </div>
      </div>

      {/* ════════════ Sticky Bottom Bar ════════════ */}
      {hasChanges && activeTab !== "delete" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/60 bg-white/90 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/90">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Modifications non sauvegardées</span>
            </div>
            <div className="flex items-center gap-3">
              <PillButton variant="outline" onClick={handleCancelChanges}>
                Annuler les modifications
              </PillButton>
              <PillButton variant="primary" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder les modifications
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
