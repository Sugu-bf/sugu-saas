import { z } from "zod";
import { api, apiFetch, apiRequest } from "@/lib/http/client";
import { ApiError } from "@/lib/http/api-error";
import type { AccountSession, PasswordValues } from "@/features/settings";

// ============================================================
// An agency's settings (GET agencies/{id}/settings), its zones
// (agencies/{id}/zones), and the account of who runs it
// (partners/settings/*). One reading of each answer.
// ============================================================

const str = z.string().nullish().transform((value) => value ?? "");

const settingsSchema = z.object({
  name: str,
  code: str,
  contact_email: str,
  contact_phone: str,
  description: str,
  logo_url: z.string().nullish(),
  address_line1: str,
  city: str,
  rccm: z.string().nullish(),
  quartier: z.string().nullish(),
  permissions: z.object({ is_owner: z.boolean(), edit_identity: z.boolean(), edit_settings: z.boolean() }),
  fleet_summary: z.object({
    total: z.number(),
    active: z.number(),
    by_type: z.array(z.object({ type: z.string(), total: z.number(), active: z.number() })),
  }),
});

export interface AgencySettingsModel {
  name: string;
  code: string;
  email: string;
  phone: string;
  description: string;
  logoUrl: string | null;
  address: string;
  city: string;
  quartier: string;
  rccm: string;
  isOwner: boolean;
  canEditIdentity: boolean;
  fleet: z.infer<typeof settingsSchema>["fleet_summary"];
}

export async function fetchAgencySettings(agencyId: string): Promise<AgencySettingsModel> {
  const response = await api.get<{ data: unknown }>(`agencies/${agencyId}/settings`);
  const data = settingsSchema.parse(response.data);
  return {
    name: data.name,
    code: data.code,
    email: data.contact_email,
    phone: data.contact_phone,
    description: data.description,
    logoUrl: data.logo_url ?? null,
    address: data.address_line1,
    city: data.city,
    quartier: data.quartier ?? "",
    rccm: data.rccm ?? "",
    isOwner: data.permissions.is_owner,
    canEditIdentity: data.permissions.edit_identity,
    fleet: data.fleet_summary,
  };
}

export interface AgencyIdentityPayload {
  agencyName?: string;
  rccm?: string | null;
  description: string | null;
  email: string | null;
  phonePrimary: string | null;
  address: string | null;
  city: string | null;
  quartier: string | null;
}

export const saveAgencySettings = (agencyId: string, payload: AgencyIdentityPayload) => api.put(`agencies/${agencyId}/settings`, payload);

export async function uploadAgencyLogo(agencyId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("logo", file);
  let response: Response;
  try {
    response = await apiFetch(`agencies/${agencyId}/settings/logo`, { method: "POST", body: form });
  } catch {
    throw new ApiError({ message: "La connexion a été interrompue. Réessayez.", status: 0, code: "NETWORK" });
  }
  const body = (await response.json().catch(() => ({}))) as { url?: string; errors?: Record<string, string[]> };
  if (!response.ok || !body.url) {
    const message =
      response.status === 403
        ? "Seul le propriétaire de l'agence peut changer son logo."
        : response.status === 422
          ? body.errors?.logo?.[0] ?? "Cette image n'est pas acceptée (JPG, PNG ou WebP, 2 Mo au plus)."
          : response.status === 429
            ? "Trop d'envois en peu de temps. Patientez une minute."
            : "Le logo n'a pas pu être enregistré. Réessayez.";
    throw new ApiError({ message, status: response.status || 0, errors: body.errors });
  }
  return body.url;
}

// ── Zones ────────────────────────────────────────────────────

const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  tarif: z.number(),
  delay: z.string().nullish().transform((value) => value ?? ""),
  enabled: z.boolean(),
  zoneActive: z.boolean(),
  atCheckout: z.boolean(),
  position: z.object({ lat: z.number(), lng: z.number(), source: z.string() }).nullish(),
});

export type AgencyZone = z.infer<typeof zoneSchema>;

export async function fetchAgencyZones(agencyId: string): Promise<{ zones: AgencyZone[]; maxTarif: number }> {
  const response = await api.get<{ data: unknown[]; meta?: { max_tarif?: number } }>(`agencies/${agencyId}/zones`);
  return { zones: z.array(zoneSchema).parse(response.data ?? []), maxTarif: response.meta?.max_tarif ?? 1_000_000 };
}

export async function fetchZoneCatalog(agencyId: string): Promise<{ id: string; name: string }[]> {
  const response = await api.get<{ data: { id: string; name: string }[] }>(`agencies/${agencyId}/zones/catalog`);
  return response.data ?? [];
}

export interface ZoneDraft {
  name: string;
  tarif: number;
  delay: string;
  enabled: boolean;
}

export const createZone = (agencyId: string, zone: ZoneDraft) => api.post<{ data: unknown }>(`agencies/${agencyId}/zones`, zone);
export const updateZone = (agencyId: string, zoneId: string, change: Partial<Omit<ZoneDraft, "name">>) =>
  api.put<{ data: unknown }>(`agencies/${agencyId}/zones/${encodeURIComponent(zoneId)}`, change);
export const removeZone = (agencyId: string, zoneId: string) => api.delete(`agencies/${agencyId}/zones/${encodeURIComponent(zoneId)}`);

// ── The account of who runs the agency ───────────────────────

const profileSchema = z.object({
  user: z.object({ firstName: str, lastName: str, email: str, phone: str }),
});

export interface AgencyAccount {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export async function fetchAgencyAccount(): Promise<AgencyAccount> {
  const response = await api.get<{ data: unknown }>("partners/settings/profile");
  return profileSchema.parse(response.data).user;
}

/** The name only: the e-mail and the phone are how the account signs in, sent back as they are. */
export const saveAgencyAccount = (account: AgencyAccount) =>
  api.put("partners/settings/profile", { firstName: account.firstName, lastName: account.lastName, email: account.email, phone: account.phone || null });

export const changeAgencyPassword = (values: PasswordValues) =>
  api.put("partners/settings/security/password", { currentPassword: values.current, newPassword: values.next, newPassword_confirmation: values.confirmation });

export const AGENCY_PASSWORD_FIELDS: Record<string, keyof PasswordValues> = {
  currentPassword: "current",
  newPassword: "next",
  newPassword_confirmation: "confirmation",
};

const securitySchema = z.object({
  activeSessions: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).transform(String),
      device: z.string().nullish(),
      location: z.string().nullish(),
      lastActive: z.string().nullish(),
      isCurrent: z.boolean().nullish(),
    }),
  ),
  passwordLastChanged: z.string().nullish(),
});

export async function fetchAgencySecurity(): Promise<{ sessions: AccountSession[]; passwordChangedAt: string | null }> {
  const response = await api.get<{ data: unknown }>("partners/settings/security");
  const data = securitySchema.parse(response.data);
  return {
    sessions: data.activeSessions.map((session) => ({ id: session.id, device: session.device || "Appareil inconnu", location: session.location ?? null, lastActive: session.lastActive ?? null, current: Boolean(session.isCurrent) })),
    passwordChangedAt: data.passwordLastChanged ?? null,
  };
}

export const revokeAgencySession = (id: string) => apiRequest(`partners/settings/security/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
export const revokeOtherAgencySessions = () => apiRequest("partners/settings/security/sessions/others", { method: "DELETE" });
