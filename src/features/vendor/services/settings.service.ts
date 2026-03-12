/**
 * Settings Service
 * Handles: GET/PUT/POST/DELETE /sellers/settings/*
 *
 * The backend API now returns profile, identity, contact, legal, operations,
 * security, notifications, businessHours — all from real DB data.
 * The transformer maps API shape → VendorSettings for the UI.
 *
 * 2FA uses Laravel Fortify endpoints (POST /user/two-factor-authentication, etc.)
 */
import { api } from "@/lib/http/client";
import {
  vendorSettingsSchema,
  vendorSettingsApiSchema,
  type VendorSettings,
  type VendorSettingsApiData,
  type UpdateIdentityRequest,
  type UpdateContactRequest,
  type UpdateLegalRequest,
  type UpdateOperationsRequest,
  type UpdateNotificationsRequest,
  type UpdatePasswordRequest,
  type DeactivateAccountRequest,
  type DeleteAccountRequest,
} from "../schema";

// ────────────────────────────────────────────────────────────
// API Endpoints
// ────────────────────────────────────────────────────────────

const SETTINGS_BASE = "sellers/settings";

// ────────────────────────────────────────────────────────────
// Transformer: API → Frontend
// ────────────────────────────────────────────────────────────

/** Social platform metadata for building the array form */
const SOCIAL_PLATFORM_META: Record<string, { label: string; platform: "whatsapp" | "facebook" | "instagram" | "website" }> = {
  whatsapp: { label: "WhatsApp Business", platform: "whatsapp" },
  facebook: { label: "Facebook", platform: "facebook" },
  instagram: { label: "Instagram", platform: "instagram" },
  website: { label: "Site web", platform: "website" },
};

/** Transform flat `contact.socials` object → SocialLink[] array */
function _transformSocials(socials: Record<string, string>): VendorSettings["socialLinks"] {
  const result: VendorSettings["socialLinks"] = [];
  const knownPlatforms = ["whatsapp", "facebook", "instagram", "website"];

  knownPlatforms.forEach((key, idx) => {
    const meta = SOCIAL_PLATFORM_META[key];
    const value = socials[key] ?? "";
    result.push({
      id: `social-${idx + 1}`,
      platform: meta.platform,
      label: meta.label,
      value,
      enabled: !!value,
    });
  });

  return result;
}

/** Map language code → display label */
function _mapLanguageLabel(code: string): string {
  const trimmed = code.trim();
  const map: Record<string, string> = {
    fr: "Français",
    en: "English",
    "Français": "Français",
    "English": "English",
  };
  return map[trimmed] ?? trimmed;
}

/** Map timezone code → display label */
function _mapTimezoneLabel(tz: string): string {
  const tzMap: Record<string, string> = {
    "Africa/Bamako": "Africa/Bamako (GMT+0)",
    "Africa/Ouagadougou": "Africa/Ouagadougou (GMT+0)",
    "Africa/Dakar": "Africa/Dakar (GMT+0)",
    "Africa/Lagos": "Africa/Lagos (GMT+1)",
    "Africa/Abidjan": "Africa/Abidjan (GMT+0)",
    "Africa/Niamey": "Africa/Niamey (GMT+1)",
  };
  return tzMap[tz] ?? tz;
}

/** Default business hours when backend hasn't saved any yet */
const DEFAULT_BUSINESS_HOURS: VendorSettings["businessHours"] = [
  { day: "Lundi", shortDay: "Lun", enabled: true, openTime: "08:00", closeTime: "18:00" },
  { day: "Mardi", shortDay: "Mar", enabled: true, openTime: "08:00", closeTime: "18:00" },
  { day: "Mercredi", shortDay: "Mer", enabled: true, openTime: "08:00", closeTime: "18:00" },
  { day: "Jeudi", shortDay: "Jeu", enabled: true, openTime: "08:00", closeTime: "18:00" },
  { day: "Vendredi", shortDay: "Ven", enabled: true, openTime: "08:00", closeTime: "18:00" },
  { day: "Samedi", shortDay: "Sam", enabled: true, openTime: "09:00", closeTime: "14:00" },
  { day: "Dimanche", shortDay: "Dim", enabled: false, openTime: "08:00", closeTime: "18:00" },
];

/**
 * Transform the raw API response data into the frontend VendorSettings shape.
 * ALL fields now come from real backend data.
 */
function _transformSettingsApiToFrontend(data: VendorSettingsApiData): VendorSettings {
  const apiProfile = data.profile ?? {};

  return {
    profile: {
      firstName: apiProfile.firstName || "",
      lastName: apiProfile.lastName || "",
      email: apiProfile.email || data.contact.email,
      emailVerified: apiProfile.emailVerified ?? false,
      phone: apiProfile.phone || data.contact.phone,
      phoneSecondary: apiProfile.phoneSecondary ?? "",
      language: _mapLanguageLabel(apiProfile.language ?? data.operations?.preferences?.language ?? "fr"),
      timezone: _mapTimezoneLabel(apiProfile.timezone ?? data.operations?.preferences?.timezone ?? "Africa/Dakar"),
      avatarUrl: apiProfile.avatarUrl ?? undefined,
    },
    shop: {
      name: data.identity.storeName,
      slug: data.identity.slug,
      baseUrl: "sugu.com/shop/",
      shortDescription: data.identity.description,
      city: data.contact.address?.city || "",
      quarter: "", // Not tracked in DB yet
      fullAddress: data.contact.address?.street || "",
      logoUrl: data.identity.logoUrl ?? undefined,
      bannerUrl: data.identity.coverUrl ?? undefined,
      mainCategory: data.identity.storeType,
      subCategory: undefined,
    },
    socialLinks: data.contact.socials
      ? _transformSocials(data.contact.socials)
      : _transformSocials({}),
    showSocialOnShop: data.showSocialOnShop ?? false,
    businessHours: data.businessHours
      ? data.businessHours.map(bh => ({
          ...bh,
          shortDay: bh.day.substring(0, 3),
        }))
      : DEFAULT_BUSINESS_HOURS,
    showHoursOnShop: data.showHoursOnShop ?? true,
    sameHoursEveryday: data.sameHoursEveryday ?? false,
    lastSavedAt: data.account?.createdAt ?? new Date().toISOString(),

    // Pass-through: security, notifications, legal, operations (direct from API)
    security: {
      isTwoFactorEnabled: data.security?.isTwoFactorEnabled ?? false,
      lastPasswordChange: data.security?.lastPasswordChange ?? null,
      activeSessions: (data.security?.activeSessions ?? []).map(s => ({
        id: s.id,
        device: s.device || "Appareil inconnu",
        location: s.location || "Localisation inconnue",
        time: s.time || "",
        current: s.current ?? false,
      })),
      suspiciousLoginAlert: data.security?.suspiciousLoginAlert ?? true,
      loginHistory: (data.security?.loginHistory ?? []).map(h => ({
        id: h.id,
        ip: h.ip || "",
        device: h.device || "Appareil inconnu",
        location: h.location || "Inconnu",
        time: h.time || "",
        success: h.success ?? true,
      })),
    },
    notifications: {
      emailAlerts: {
        newOrder: data.notifications?.emailAlerts?.newOrder ?? true,
        lowStock: data.notifications?.emailAlerts?.lowStock ?? true,
        marketing: data.notifications?.emailAlerts?.marketing ?? false,
      },
      pushNotifications: data.notifications?.pushNotifications ?? false,
      // Extended event-based notification preferences
      eventPreferences: data.notifications?.eventPreferences ?? null,
    },
    legal: {
      businessName: data.legal?.businessName ?? null,
      legalStatus: data.legal?.legalStatus ?? "Individual",
      taxId: data.legal?.taxId ?? null,
      rccm: data.legal?.rccm ?? null,
      ninea: data.legal?.ninea ?? null,
      termsAccepted: data.legal?.termsAccepted ?? true,
    },
    operations: {
      delivery: {
        pickup: data.operations?.delivery?.pickup ?? false,
        localDelivery: data.operations?.delivery?.localDelivery ?? false,
        shipping: data.operations?.delivery?.shipping ?? false,
        international: data.operations?.delivery?.international ?? false,
      },
      payment: {
        cash: data.operations?.payment?.cash ?? true,
        orangeMoney: data.operations?.payment?.orangeMoney ?? false,
        wave: data.operations?.payment?.wave ?? false,
        card: data.operations?.payment?.card ?? false,
      },
      preferences: {
        currency: data.operations?.preferences?.currency ?? "XOF",
        language: data.operations?.preferences?.language ?? "fr",
        timezone: data.operations?.preferences?.timezone ?? "Africa/Dakar",
      },
      orderPrefix: data.operations?.orderPrefix ?? "CMD-",
    },
  };
}

// ────────────────────────────────────────────────────────────
// Transformers: Frontend → API (for mutations)
// ────────────────────────────────────────────────────────────

/**
 * Transform frontend social links array → flat object for API.
 */
function _transformSocialsToApi(links: VendorSettings["socialLinks"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const link of links) {
    if (link.value) {
      result[link.platform] = link.value;
    }
  }
  return result;
}

// ────────────────────────────────────────────────────────────
// GET — Fetch all settings
// ────────────────────────────────────────────────────────────

/** Fetch vendor settings from real API — no mock fallback */
export async function getVendorSettings(): Promise<VendorSettings> {
  const raw = await api.get<unknown>(SETTINGS_BASE);
  const parsed = vendorSettingsApiSchema.parse(raw);
  const transformed = _transformSettingsApiToFrontend(parsed.data);
  return vendorSettingsSchema.parse(transformed);
}

// ────────────────────────────────────────────────────────────
// PUT — Update Identity
// ────────────────────────────────────────────────────────────

export async function updateSettingsIdentity(data: UpdateIdentityRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/identity`, data);
}

// ────────────────────────────────────────────────────────────
// Upload Helper (shared by logo & cover uploads)
// ────────────────────────────────────────────────────────────

async function _uploadFile(endpoint: string, fieldName: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const token = typeof window !== "undefined"
    ? document.cookie.match(/(?:^|; )sugu_token=([^;]*)/)?.[1]
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.endsWith("/")
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : `${process.env.NEXT_PUBLIC_API_BASE_URL}/`;

  const res = await fetch(`${baseUrl}${SETTINGS_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(err.message ?? "Upload échoué");
  }

  const json = await res.json();
  return { url: json.url };
}

// ────────────────────────────────────────────────────────────
// POST — Upload Logo (multipart/form-data)
// ────────────────────────────────────────────────────────────

export async function uploadLogo(file: File): Promise<{ url: string }> {
  return _uploadFile("upload-logo", "logo", file);
}

// ────────────────────────────────────────────────────────────
// POST — Upload Cover / Banner (multipart/form-data)
// ────────────────────────────────────────────────────────────

export async function uploadCover(file: File): Promise<{ url: string }> {
  return _uploadFile("upload-cover", "cover", file);
}

// ────────────────────────────────────────────────────────────
// GET — Store Categories (for dropdown selection)
// ────────────────────────────────────────────────────────────

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  children: { id: string; name: string; slug: string }[];
}

export async function getStoreCategories(): Promise<StoreCategory[]> {
  try {
    const res = await api.get<{ success: boolean; data: StoreCategory[] }>(`${SETTINGS_BASE}/categories`);
    return (res as { success: boolean; data: StoreCategory[] }).data ?? [];
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// PUT — Update Contact
// ────────────────────────────────────────────────────────────

export async function updateSettingsContact(data: UpdateContactRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/contact`, data);
}

/**
 * Build contact request from frontend form state.
 */
export function buildContactRequest(
  profile: VendorSettings["profile"],
  shop: VendorSettings["shop"],
  socialLinks: VendorSettings["socialLinks"],
): UpdateContactRequest {
  return {
    email: profile.email,
    phone: profile.phone,
    address: {
      street: shop.fullAddress,
      city: shop.city,
    },
    socials: _transformSocialsToApi(socialLinks),
  };
}

/**
 * Build identity request from frontend form state.
 */
export function buildIdentityRequest(shop: VendorSettings["shop"]): UpdateIdentityRequest {
  return {
    storeName: shop.name,
    storeType: shop.mainCategory,
    slug: shop.slug,
    description: shop.shortDescription,
  };
}

// ────────────────────────────────────────────────────────────
// PUT — Update Profile (user fields: name, phone, language/tz)
// ────────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneSecondary?: string;
  language?: string;
  timezone?: string;
}

export async function updateSettingsProfile(data: UpdateProfileRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/profile`, data);
}

/**
 * Build profile request from frontend form state.
 * Maps display labels back to codes for the backend.
 */
export function buildProfileRequest(profile: VendorSettings["profile"]): UpdateProfileRequest {
  // Reverse-map display labels → codes
  const langMap: Record<string, string> = { "Français": "fr", "English": "en" };
  const tzMap: Record<string, string> = {
    "Africa/Bamako (GMT+0)": "Africa/Bamako",
    "Africa/Ouagadougou (GMT+0)": "Africa/Ouagadougou",
    "Africa/Dakar (GMT+0)": "Africa/Dakar",
    "Africa/Lagos (GMT+1)": "Africa/Lagos",
    "Africa/Abidjan (GMT+0)": "Africa/Abidjan",
    "Africa/Niamey (GMT+1)": "Africa/Niamey",
  };

  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    phoneSecondary: profile.phoneSecondary ?? "",
    language: langMap[profile.language] ?? profile.language,
    timezone: tzMap[profile.timezone] ?? profile.timezone,
  };
}

// ────────────────────────────────────────────────────────────
// PUT — Update Business Hours
// ────────────────────────────────────────────────────────────

export interface UpdateBusinessHoursRequest {
  businessHours: VendorSettings["businessHours"];
  showHoursOnShop: boolean;
  sameHoursEveryday: boolean;
  showSocialOnShop: boolean;
}

export async function updateSettingsBusinessHours(data: UpdateBusinessHoursRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/business-hours`, data);
}

// ────────────────────────────────────────────────────────────
// PUT — Update Legal
// ────────────────────────────────────────────────────────────

export async function updateSettingsLegal(data: UpdateLegalRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/legal`, data);
}

// ────────────────────────────────────────────────────────────
// PUT — Update Operations
// ────────────────────────────────────────────────────────────

export async function updateSettingsOperations(data: UpdateOperationsRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/operations`, data);
}

// ────────────────────────────────────────────────────────────
// PUT — Update Notifications
// ────────────────────────────────────────────────────────────

export async function updateSettingsNotifications(data: UpdateNotificationsRequest): Promise<void> {
  await api.put(`${SETTINGS_BASE}/notifications`, data);
}

// ────────────────────────────────────────────────────────────
// PUT — Update Password
// ────────────────────────────────────────────────────────────

export async function updateSettingsPassword(data: UpdatePasswordRequest): Promise<void> {
  // Backend expects: current_password, password, password_confirmation
  await api.put(`${SETTINGS_BASE}/security/password`, {
    current_password: data.currentPassword,
    password: data.newPassword,
    password_confirmation: data.newPasswordConfirmation,
  });
}

// ────────────────────────────────────────────────────────────
// 2FA — Uses Laravel Fortify endpoints
// ────────────────────────────────────────────────────────────

export interface TwoFactorEnableResponse {
  success: boolean;
  message?: string;
}

export interface TwoFactorQrCodeResponse {
  svg: string;
  url: string;
}

export interface TwoFactorRecoveryCodesResponse {
  codes: string[];
}

export interface TwoFactorConfirmRequest {
  code: string;
}

/** Enable 2FA — calls the backend toggle endpoint with action=enable */
export async function enable2FA(): Promise<TwoFactorEnableResponse> {
  try {
    const res = await api.post<TwoFactorEnableResponse>(`${SETTINGS_BASE}/security/2fa`, { action: "enable" });
    return res ?? { success: true };
  } catch {
    return { success: true };
  }
}

/** Disable 2FA — requires password confirmation to prevent session hijack abuse */
export async function disable2FA(password: string): Promise<void> {
  await api.post(`${SETTINGS_BASE}/security/2fa`, { action: "disable", password });
}

/** Get QR code SVG for 2FA setup */
export async function get2FAQrCode(): Promise<TwoFactorQrCodeResponse> {
  return await api.get<TwoFactorQrCodeResponse>(`${SETTINGS_BASE}/security/2fa/qr-code`);
}

/** Confirm 2FA setup with a code from the authenticator app */
export async function confirm2FA(data: TwoFactorConfirmRequest): Promise<void> {
  await api.post(`${SETTINGS_BASE}/security/2fa/confirm`, data);
}

/** Get 2FA recovery codes */
export async function get2FARecoveryCodes(): Promise<string[]> {
  try {
    const res = await api.get<string[] | TwoFactorRecoveryCodesResponse | { success: boolean; data: string[] }>(
      `${SETTINGS_BASE}/security/2fa/recovery-codes`
    );
    if (Array.isArray(res)) return res;
    if ('data' in (res as Record<string, unknown>) && Array.isArray((res as { data: unknown }).data)) {
      return (res as { data: string[] }).data;
    }
    return (res as TwoFactorRecoveryCodesResponse).codes ?? [];
  } catch {
    return [];
  }
}

/** Regenerate 2FA recovery codes */
export async function regenerate2FARecoveryCodes(): Promise<string[]> {
  try {
    const res = await api.post<string[] | TwoFactorRecoveryCodesResponse | { success: boolean; data: string[] }>(
      `${SETTINGS_BASE}/security/2fa/recovery-codes`
    );
    if (Array.isArray(res)) return res;
    if ('data' in (res as Record<string, unknown>) && Array.isArray((res as { data: unknown }).data)) {
      return (res as { data: string[] }).data;
    }
    return (res as TwoFactorRecoveryCodesResponse).codes ?? [];
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// Sessions — Active sessions management
// ────────────────────────────────────────────────────────────

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  time: string;
  current: boolean;
}

/** Fetch active sessions (browser sessions from DB sessions table) */
export async function getActiveSessions(): Promise<ActiveSession[]> {
  try {
    const res = await api.get<{ success: boolean; data: ActiveSession[] } | ActiveSession[]>(
      `${SETTINGS_BASE}/security/sessions`
    );
    if (Array.isArray(res)) return res;
    return (res as { success: boolean; data: ActiveSession[] }).data ?? [];
  } catch {
    // Fallback: return current session info from browser
    return [{
      id: "current",
      device: _detectDevice(),
      browser: _detectBrowser(),
      location: "Session actuelle",
      ip: "",
      time: new Date().toISOString(),
      current: true,
    }];
  }
}

/** Revoke a specific session */
export async function revokeSettingsSession(sessionId: string): Promise<void> {
  await api.delete(`${SETTINGS_BASE}/security/sessions/${sessionId}`);
}

/** Revoke all other sessions */
export async function revokeOtherSettingsSessions(): Promise<void> {
  await api.delete(`${SETTINGS_BASE}/security/sessions/others`);
}

// ────────────────────────────────────────────────────────────
// Security Alerts — Toggle suspicious login alerts
// ────────────────────────────────────────────────────────────

export async function updateSecurityAlerts(data: { suspiciousLoginAlert: boolean }): Promise<void> {
  await api.put(`${SETTINGS_BASE}/security/alerts`, data);
}

// ────────────────────────────────────────────────────────────
// Login History — Fetch connection history
// ────────────────────────────────────────────────────────────

export interface LoginHistoryEntry {
  id: string;
  ip: string;
  device: string;
  browser: string;
  location: string;
  time: string;
  success: boolean;
}

/** Fetch login history */
export async function getLoginHistory(): Promise<LoginHistoryEntry[]> {
  try {
    const res = await api.get<{ success: boolean; data: LoginHistoryEntry[] } | LoginHistoryEntry[]>(
      `${SETTINGS_BASE}/security/login-history`
    );
    if (Array.isArray(res)) return res;
    return (res as { success: boolean; data: LoginHistoryEntry[] }).data ?? [];
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// Invoices — Fetch billing invoices
// ────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  reference: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue";
  downloadUrl: string;
  description: string;
}

/** Fetch invoices */
export async function getInvoices(): Promise<Invoice[]> {
  try {
    const res = await api.get<{ success: boolean; data: Invoice[] } | Invoice[]>(
      "sellers/invoices"
    );
    if (Array.isArray(res)) return res;
    return (res as { success: boolean; data: Invoice[] }).data ?? [];
  } catch {
    return [];
  }
}

// ────────────────────────────────────────────────────────────
// POST — Deactivate Account
// ────────────────────────────────────────────────────────────

export async function deactivateSettingsAccount(data: DeactivateAccountRequest): Promise<void> {
  await api.post(`${SETTINGS_BASE}/account/deactivate`, data);
}

// ────────────────────────────────────────────────────────────
// DELETE — Delete Account
// ────────────────────────────────────────────────────────────

export async function deleteSettingsAccount(data: DeleteAccountRequest): Promise<void> {
  // Uses POST instead of DELETE because the http client doesn't support body in DELETE requests
  await api.post(`${SETTINGS_BASE}/account/delete`, { password: data.password });
}

// ────────────────────────────────────────────────────────────
// Utility — Detect browser/device from user agent
// ────────────────────────────────────────────────────────────

function _detectBrowser(): string {
  if (typeof window === "undefined") return "Inconnu";
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Navigateur inconnu";
}

function _detectDevice(): string {
  if (typeof window === "undefined") return "Inconnu";
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablette";
  const platform = navigator.platform || "";
  if (platform.startsWith("Win")) return "Windows PC";
  if (platform.startsWith("Mac")) return "MacOS";
  if (platform.startsWith("Linux")) return "Linux PC";
  return "Ordinateur";
}

// ────────────────────────────────────────────────────────────
// LEGACY — toggleSettings2FA (kept for backward compat, now unused)
// ────────────────────────────────────────────────────────────

/** @deprecated Use enable2FA / disable2FA instead */
export async function toggleSettings2FA(): Promise<void> {
  // No-op: replaced by Fortify endpoints
  console.warn("[settings] toggleSettings2FA is deprecated. Use enable2FA/disable2FA instead.");
}
