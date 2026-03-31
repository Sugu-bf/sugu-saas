import { api } from "@/lib/http/client";
import { agencySettingsResponseSchema, type AgencySettingsResponse } from "../schema";
import { formatRelativeDate } from "./utils";

// Settings — API + transformer + mutations
// ============================================================

// ── Country code → name + flag mapping ─────────────────────

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  ML: { name: "Mali", flag: "ML" },
  BF: { name: "Burkina Faso", flag: "BF" },
  CI: { name: "Côte d'Ivoire", flag: "CI" },
  SN: { name: "Sénégal", flag: "SN" },
  GN: { name: "Guinée", flag: "GN" },
  NE: { name: "Niger", flag: "NE" },
  TG: { name: "Togo", flag: "TG" },
  BJ: { name: "Bénin", flag: "BJ" },
  GH: { name: "Ghana", flag: "GH" },
  NG: { name: "Nigeria", flag: "NG" },
};

/**
 * Transform backend settings (DB columns + metadata) → frontend AgencySettingsResponse.
 *
 * The backend returns a shape close to the DeliveryPartner model:
 * { name, code, contact_email, contact_phone, country_code, metadata: {...}, ... }
 *
 * Many fields live in the `metadata` JSON column.
 */
function _transformSettingsResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const meta = (raw.metadata ?? {}) as Record<string, unknown>;
  const countryCode = String(raw.country_code ?? meta.country_code ?? "ML");
  const country = COUNTRY_MAP[countryCode] ?? { name: countryCode, flag: countryCode };

  // Format created_at to French date
  let createdAt = String(raw.created_at ?? "");
  try {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      const frMonths = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
      ];
      createdAt = `${d.getDate()} ${frMonths[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // keep as-is
  }

  // Format updated_at to relative French
  let lastSaved = "—";
  const updatedAt = raw.updated_at ?? raw.last_saved;
  if (typeof updatedAt === "string" && updatedAt) {
    lastSaved = formatRelativeDate(updatedAt);
  }

  // No mock/default data — only real API data is used

  // Determine emailVerified from the nested owner or direct flag
  const ownerMeta = raw.owner as Record<string, unknown> | undefined;
  const emailVerified = Boolean(
    raw.email_verified ??
    meta.email_verified ??
    (ownerMeta?.email_verified_at ? true : false),
  );

  return {
    agencyName: String(raw.name ?? raw.agencyName ?? ""),
    shortName: String(raw.code ?? raw.shortName ?? ""),
    email: String(raw.contact_email ?? raw.email ?? ""),
    emailVerified,
    phonePrimary: String(raw.contact_phone ?? raw.phonePrimary ?? ""),
    phoneSecondary: String(meta.phone_secondary ?? raw.phoneSecondary ?? ""),
    rccm: String(meta.rccm ?? raw.legal_name ?? raw.rccm ?? ""),
    createdAt: String(raw.createdAt ?? createdAt),
    logoUrl: (raw.logo_url ?? raw.logoUrl ?? null) as string | null,

    address: String(raw.address_line1 ?? raw.address ?? ""),
    city: String(raw.city ?? ""),
    quartier: String(meta.quartier ?? raw.address_line2 ?? raw.quartier ?? ""),
    country: country.name,
    countryFlag: country.flag,
    locationDescription: String(meta.location_description ?? raw.locationDescription ?? ""),

    agencyType: String(meta.agency_type ?? raw.agencyType ?? ""),
    dailyCapacity: String(meta.daily_capacity ?? raw.dailyCapacity ?? ""),
    vehicles: Array.isArray(meta.vehicles) ? meta.vehicles
      : Array.isArray(raw.vehicles) ? raw.vehicles
      : [],
    description: String(raw.description ?? ""),

    schedule: Array.isArray(meta.schedule) ? meta.schedule
      : Array.isArray(raw.schedule) ? raw.schedule
      : [],
    sameHoursWeekdays: Boolean(meta.same_hours_weekdays ?? raw.sameHoursWeekdays ?? false),
    acceptAfterHours: Boolean(meta.accept_after_hours ?? raw.acceptAfterHours ?? false),
    afterHoursSurcharge: String(meta.after_hours_surcharge ?? raw.afterHoursSurcharge ?? ""),

    socialLinks: Array.isArray(meta.social_links) ? meta.social_links
      : Array.isArray(raw.socialLinks) ? raw.socialLinks
      : [],

    lastSaved: String(raw.lastSaved ?? lastSaved),

    // ── Extended settings fields ──────────────────────────────

    // Coverage zones
    zones: Array.isArray(raw.zones) ? raw.zones
      : Array.isArray(meta.zones) ? meta.zones
      : [],

    // Zone delivery rules
    zoneRules: (raw.zone_rules ?? meta.zone_rules ?? null) as Record<string, unknown> | null,

    // Fleet summary
    fleet: (raw.fleet ?? meta.fleet ?? null) as Record<string, unknown> | null,

    // Payment settings
    paymentSettings: (raw.payment_settings ?? meta.payment_settings ?? null) as Record<string, unknown> | null,

    // Notification preferences
    notificationPreferences: (raw.notification_preferences ?? meta.notification_preferences ?? null) as Record<string, unknown> | null,
  };
}

/**
 * Fetch the agency settings.
 *
 * Tries to load from the real API endpoint `GET /agencies/{agencyId}/settings`.
 * Falls back gracefully to mock data if the endpoint is unavailable.
 *
 * @param agencyId — The delivery partner ULID (optional — mock if missing)
 */
export async function getAgencySettings(
  agencyId: string,
): Promise<AgencySettingsResponse> {
  const raw = await api.get<{ success: boolean; data: Record<string, unknown> }>(
    `agencies/${agencyId}/settings`,
  );

  return agencySettingsResponseSchema.parse(
    _transformSettingsResponse(raw.data),
  );
}

// ── Settings mutation payloads ─────────────────────────────

export interface UpdateAgencySettingsPayload {
  agencyName?: string;
  shortName?: string;
  email?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  rccm?: string;
  address?: string;
  city?: string;
  quartier?: string;
  locationDescription?: string;
  agencyType?: string;
  dailyCapacity?: string;
  vehicles?: Array<{ type: string; icon: string; selected: boolean }>;
  description?: string;
  schedule?: Array<{ day: string; enabled: boolean; openTime: string; closeTime: string }>;
  sameHoursWeekdays?: boolean;
  acceptAfterHours?: boolean;
  afterHoursSurcharge?: string;
  socialLinks?: Array<{ id: string; platform: string; value: string; icon: string; enabled: boolean; visibleOnSugu: boolean }>;
  // Extended settings
  zones?: Array<{ id: string; name: string; tarif: string; delay: string; enabled: boolean }>;
  zoneRules?: { maxRadius: string; acceptOutside: boolean; outsideSurcharge: string; freeAbove: boolean; freeAboveAmount: string };
  fleet?: { vehicles: Array<{ type: string; count: number; base: string; perKm: string; maxWeight: string }>; totalVehicles: number };
  paymentSettings?: { method: string; phoneNumber: string; frequency: string; autoTransfer: boolean; minAmount: string; bankDetails?: { bank: string; accountNumber: string; iban: string } };
  notificationPreferences?: { channels: Array<{ id: string; label: string; detail: string; on: boolean }>; events: Array<{ label: string; sms: boolean; email: boolean; whatsapp: boolean }> };
}

/**
 * Update agency settings via PUT /agencies/{agencyId}/settings.
 *
 * The backend maps these frontend field names to DB columns + metadata JSON.
 */
export async function updateAgencySettings(
  agencyId: string,
  data: UpdateAgencySettingsPayload,
): Promise<AgencySettingsResponse> {
  const raw = await api.put<{ success: boolean; data: Record<string, unknown> }>(
    `agencies/${agencyId}/settings`,
    data,
  );
  return agencySettingsResponseSchema.parse(
    _transformSettingsResponse(raw.data),
  );
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

/**
 * Change the authenticated user's password.
 *
 * PUT /auth/password
 */
export async function updatePassword(data: UpdatePasswordPayload): Promise<void> {
  await api.put("auth/password", data);
}

// ── Logo Upload / Delete ─────────────────────────────────────

/**
 * Upload or replace the agency logo.
 *
 * POST /agencies/{agencyId}/settings/logo
 *
 * Uses raw fetch because the central HTTP client forces Content-Type: application/json
 * which is incompatible with multipart/form-data file uploads.
 */
export async function uploadAgencyLogo(
  agencyId: string,
  file: File,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("logo", file);

  // Read token from cookie (same logic as the central HTTP client)
  const token = typeof window !== "undefined"
    ? document.cookie.match(/(?:^|; )sugu_token=([^;]*)/)?.[1]
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.endsWith("/")
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : `${process.env.NEXT_PUBLIC_API_BASE_URL}/`;

  const res = await fetch(`${baseUrl}agencies/${agencyId}/settings/logo`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Upload échoué" }));
    throw new Error(err.message ?? "Erreur lors de l'upload du logo");
  }

  const json = await res.json();
  return { url: json.url };
}

/**
 * Delete the agency logo.
 *
 * DELETE /agencies/{agencyId}/settings/logo
 */
export async function deleteAgencyLogo(agencyId: string): Promise<void> {
  await api.delete(`agencies/${agencyId}/settings/logo`);
}

/**
 * Delete an agency permanently.
 *
 * DELETE /agencies/{agencyId}
 * Requires body `{ confirm: "SUPPRIMER" }` for safety.
 */
export async function deleteAgency(
  agencyId: string,
  confirm: string,
): Promise<void> {
  await api.delete(`agencies/${agencyId}`, {
    headers: { "X-Confirm-Delete": confirm },
  });
}

// ============================================================

