import { z } from "zod";
import { api, apiFetch, apiRequest } from "@/lib/http/client";
import { ApiError } from "@/lib/http/api-error";
import { downloadBlob, saveBlob } from "@/lib/http/download";
import type { AccountSession, PasswordValues } from "@/features/settings";

// ============================================================
// The seller's settings, as GET sellers/settings serves them,
// and the calls that change them. One reading of the answer;
// every screen works on the model below.
// ============================================================

const BASE = "sellers/settings";

const str = z.string().nullish().transform((value) => value ?? "");

const rawSchema = z.object({
  storeId: z.union([z.string(), z.number()]).transform(String),
  profile: z.object({
    firstName: str,
    lastName: str,
    email: str,
    emailVerified: z.boolean().optional().default(false),
    phone: str,
    timezone: str,
  }),
  identity: z.object({
    storeName: str,
    storeType: str,
    slug: str,
    description: str,
    logoUrl: z.string().nullish(),
    coverUrl: z.string().nullish(),
  }),
  contact: z.object({
    email: str,
    phone: str,
    address: z.object({ street: str, city: str }).partial().nullish(),
    socials: z.record(z.string(), z.string().nullish()).nullish(),
  }),
  legal: z
    .object({ businessName: str, legalStatus: str, taxId: str, rccm: str, ninea: str })
    .partial()
    .nullish(),
  security: z.object({ lastPasswordChange: z.string().nullish() }).partial().nullish(),
  notifications: z
    .object({
      effective: z.record(z.string(), z.record(z.string(), z.boolean())).nullish(),
      reachable: z.object({ email: z.boolean(), push: z.boolean(), whatsapp: z.boolean() }).partial().nullish(),
    })
    .partial()
    .nullish(),
  showSocialOnShop: z.boolean().nullish(),
});

export type SocialNetwork = "whatsapp" | "facebook" | "instagram" | "website";
export const SOCIAL_NETWORKS: SocialNetwork[] = ["whatsapp", "facebook", "instagram", "website"];

export interface VendorSettingsModel {
  storeId: string;
  owner: { firstName: string; lastName: string; loginEmail: string; loginPhone: string };
  shop: { name: string; category: string; slug: string; description: string; logoUrl: string | null; coverUrl: string | null };
  contact: { email: string; phone: string; street: string; city: string };
  socials: Record<SocialNetwork, string>;
  showSocialOnShop: boolean;
  legal: { businessName: string; legalStatus: string; taxId: string; rccm: string; ninea: string };
  timezone: string;
  passwordChangedAt: string | null;
  notifications: {
    effective: Record<string, Record<string, boolean>>;
    reachable: { email: boolean; push: boolean; whatsapp: boolean };
  };
}

export function parseVendorSettings(raw: unknown): VendorSettingsModel {
  const data = rawSchema.parse((raw as { data?: unknown })?.data ?? raw);
  const socials = data.contact.socials ?? {};
  return {
    storeId: data.storeId,
    owner: { firstName: data.profile.firstName, lastName: data.profile.lastName, loginEmail: data.profile.email, loginPhone: data.profile.phone },
    shop: {
      name: data.identity.storeName,
      category: data.identity.storeType === "other" ? "" : data.identity.storeType,
      slug: data.identity.slug,
      description: data.identity.description,
      logoUrl: data.identity.logoUrl ?? null,
      coverUrl: data.identity.coverUrl ?? null,
    },
    contact: { email: data.contact.email, phone: data.contact.phone, street: data.contact.address?.street ?? "", city: data.contact.address?.city ?? "" },
    socials: {
      whatsapp: socials.whatsapp ?? "",
      facebook: socials.facebook ?? "",
      instagram: socials.instagram ?? "",
      website: socials.website ?? "",
    },
    showSocialOnShop: data.showSocialOnShop ?? false,
    legal: {
      businessName: data.legal?.businessName ?? "",
      legalStatus: data.legal?.legalStatus ?? "",
      taxId: data.legal?.taxId ?? "",
      rccm: data.legal?.rccm ?? "",
      ninea: data.legal?.ninea ?? "",
    },
    timezone: data.profile.timezone || "Africa/Ouagadougou",
    passwordChangedAt: data.security?.lastPasswordChange ?? null,
    notifications: {
      effective: data.notifications?.effective ?? {},
      reachable: {
        email: data.notifications?.reachable?.email ?? true,
        push: data.notifications?.reachable?.push ?? false,
        whatsapp: data.notifications?.reachable?.whatsapp ?? false,
      },
    },
  };
}

export async function fetchVendorSettings(): Promise<VendorSettingsModel> {
  return parseVendorSettings(await api.get<unknown>(BASE));
}

// ── Profile ──────────────────────────────────────────────────

export interface StoreCategoryOption {
  id: string;
  name: string;
}

export async function fetchStoreCategories(): Promise<StoreCategoryOption[]> {
  const response = await api.get<{ data?: Array<{ id: string | number; name: string }> }>(`${BASE}/categories`);
  return (response.data ?? []).map((category) => ({ id: String(category.id), name: category.name }));
}

export const saveIdentity = (shop: { name: string; slug: string; description: string; category: string }) =>
  api.put(`${BASE}/identity`, { storeName: shop.name, slug: shop.slug, description: shop.description, storeType: shop.category || undefined });

export const saveContact = (contact: { email: string; phone: string; street: string; city: string }, socials: Record<SocialNetwork, string>) =>
  api.put(`${BASE}/contact`, {
    email: contact.email,
    phone: contact.phone,
    address: { street: contact.street, city: contact.city },
    socials: Object.fromEntries(Object.entries(socials).map(([network, value]) => [network, value.trim()])),
  });

export const saveOwner = (owner: { firstName: string; lastName: string }) => api.put(`${BASE}/profile`, { firstName: owner.firstName, lastName: owner.lastName });

export const saveTimezone = (timezone: string) => api.put(`${BASE}/profile`, { timezone });

export const saveShowSocial = (show: boolean) => api.put(`${BASE}/business-hours`, { showSocialOnShop: show });

/** Sends a picture; resolves with the address the server kept. */
export async function uploadStorePicture(kind: "logo" | "cover", file: File): Promise<string> {
  const form = new FormData();
  form.append(kind, file);
  let response: Response;
  try {
    response = await apiFetch(`${BASE}/upload-${kind}`, { method: "POST", body: form });
  } catch {
    throw new ApiError({ message: "La connexion a été interrompue. Réessayez.", status: 0, code: "NETWORK" });
  }
  const body = (await response.json().catch(() => ({}))) as { url?: string; message?: string; errors?: Record<string, string[]> };
  if (!response.ok || !body.url) {
    const fieldMessage = body.errors?.[kind]?.[0];
    const message =
      response.status === 422
        ? fieldMessage ?? "Cette image n'est pas acceptée (JPG, PNG ou WebP)."
        : response.status === 429
          ? "Trop d'envois en peu de temps. Patientez une minute."
          : "L'image n'a pas pu être enregistrée. Réessayez.";
    throw new ApiError({ message, status: response.status || 0, errors: body.errors });
  }
  return body.url;
}

// ── Legal ────────────────────────────────────────────────────

export const saveLegal = (legal: VendorSettingsModel["legal"]) =>
  api.put(`${BASE}/legal`, {
    businessName: legal.businessName || null,
    legalStatus: legal.legalStatus || null,
    taxId: legal.taxId || null,
    rccm: legal.rccm || null,
    ninea: legal.ninea || null,
  });

// ── Notifications ────────────────────────────────────────────

/** The events the platform notifies a seller of, and by which channels (sugu SellerSettingsService::NOTIFIED_EVENTS). */
export const VENDOR_EVENTS = [
  { key: "new_order", label: "Nouvelle commande", description: "Une commande arrive et attend votre confirmation.", channels: ["email", "push", "whatsapp"] },
  { key: "order_shipped", label: "Commande expédiée", description: "Le colis a quitté votre boutique.", channels: ["push", "whatsapp"] },
  { key: "order_delivered", label: "Commande livrée", description: "Le client a reçu sa commande.", channels: ["email", "push", "whatsapp"] },
  { key: "order_cancelled", label: "Commande annulée", description: "Le client ou la plateforme a annulé une commande.", channels: ["email", "push", "whatsapp"] },
  { key: "low_stock", label: "Stock bas", description: "Un produit passe sous son seuil d'alerte (dans votre espace Pro).", channels: ["app"] },
] as const;

export type VendorChannel = "email" | "push" | "whatsapp" | "app";
export type NotificationMatrix = Record<string, Partial<Record<VendorChannel, boolean>>>;

export function saveNotifications(matrix: NotificationMatrix) {
  const eventPreferences = VENDOR_EVENTS.map(({ key }) => {
    const row = matrix[key] ?? {};
    // "app" (low stock in the pro space) is on while any channel of the event is.
    const all = row.app;
    return {
      event: key,
      sms: false,
      email: all ?? row.email ?? false,
      push: all ?? row.push ?? false,
      whatsapp: all ?? row.whatsapp ?? false,
    };
  });
  // The event matrix is the whole truth: the channel switches stay on
  // (they block every event of a channel and are not shown any more).
  return api.put(`${BASE}/notifications`, { channels: { sms: false, email: true, push: true, whatsapp: true }, eventPreferences });
}

// ── Security ─────────────────────────────────────────────────

export const changeVendorPassword = (values: PasswordValues) =>
  api.put(`${BASE}/security/password`, { current_password: values.current, password: values.next, password_confirmation: values.confirmation });

export const VENDOR_PASSWORD_FIELDS: Record<string, keyof PasswordValues> = {
  current_password: "current",
  password: "next",
  password_confirmation: "confirmation",
};

const sessionSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  device: z.string().nullish(),
  location: z.string().nullish(),
  time: z.string().nullish(),
  current: z.boolean().nullish(),
});

export async function fetchVendorSessions(): Promise<AccountSession[]> {
  const response = await api.get<{ data?: unknown[] }>(`${BASE}/security/sessions`);
  return z
    .array(sessionSchema)
    .parse(response.data ?? [])
    .map((session) => ({ id: session.id, device: session.device || "Appareil inconnu", location: session.location ?? null, lastActive: session.time ?? null, current: Boolean(session.current) }));
}

export const revokeVendorSession = (id: string) => api.delete(`${BASE}/security/sessions/${encodeURIComponent(id)}`);
export const revokeOtherVendorSessions = () => api.delete(`${BASE}/security/sessions/others`);

// ── Closing ──────────────────────────────────────────────────

export const VENDOR_DELETION_CHECK = `${BASE}/account/deletion-check`;
export const deleteVendorAccount = (password: string) => apiRequest(`${BASE}/account/delete`, { method: "POST", body: { password } });

// ── Invoices issued to buyers ────────────────────────────────

const invoiceSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  invoice_number: z.string(),
  status: z.string(),
  status_label: z.string().nullish(),
  /** Francs (the controller divides the centimes). */
  total_amount: z.number(),
  issued_at: z.string().nullish(),
  created_at: z.string(),
  order_number: z.string().nullish(),
  customer_name: z.string().nullish(),
});

export type VendorInvoice = z.infer<typeof invoiceSchema>;

export async function fetchRecentInvoices(perPage = 5): Promise<{ invoices: VendorInvoice[]; total: number }> {
  const response = await api.get<{ data?: unknown[]; meta?: { total?: number } }>("sellers/invoices", { params: { perPage } });
  const invoices = z.array(invoiceSchema).parse(response.data ?? []);
  return { invoices, total: response.meta?.total ?? invoices.length };
}

export async function downloadInvoice(invoice: VendorInvoice) {
  const blob = await downloadBlob(`sellers/invoices/${encodeURIComponent(invoice.id)}/download`, { method: "GET" });
  saveBlob(blob, `${invoice.invoice_number || "facture"}.pdf`);
}
