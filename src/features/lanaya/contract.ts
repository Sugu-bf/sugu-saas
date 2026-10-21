import { z } from "zod";
import { API_PROXY_PREFIX, apiFetch, apiRequest } from "@/lib/http/client";
import { ApiError } from "@/lib/http/api-error";

// ============================================================
// SUGU Lanaya — contrat du portail avec /api/v1/lanaya (Lot 1)
//
// Every call goes through the BFF relay. Every state arrives with its value
// and its server label: the portal does not invent business labels. Nothing
// here creates a right: the server decides on every request.
// ============================================================

const state = z.object({ value: z.string(), label: z.string() });
export type LanayaState = z.infer<typeof state>;

const text = z.string().nullable().optional().transform((v) => v ?? null);

const agreementSchema = z.object({
  id: z.string(),
  reference: z.string(),
  version: z.string(),
  status: state,
  in_force: z.boolean(),
  signed_at: text,
  valid_from: text,
  valid_until: text,
});

export const profileSchema = z.object({
  id: z.string(),
  public_code: z.string(),
  country_code: z.string(),
  city: z.string(),
  specialties: z.array(z.string()).catch([]),
  experience_band: text,
  structure_name: text,
  conflicts_declared: text,
  application_status: state,
  account_status: state,
  identity_status: state,
  quality_gate_state: state,
  editable: z.boolean(),
  can_work: z.boolean(),
  submitted_at: text,
  decided_at: text,
  decision_note: text,
  decision_reason: text,
  suspension_reason: text,
  agreement: agreementSchema.nullable().catch(null),
  created_at: text,
});
export type LanabagaProfile = z.infer<typeof profileSchema>;

export const documentSchema = z.object({
  id: z.string(),
  document_type: state,
  side: state,
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  review_status: state,
  rejection_reason: text,
  uploaded_at: text,
  reviewed_at: text,
});
export type LanabagaDocument = z.infer<typeof documentSchema>;

export const referenceSchema = z.object({
  id: z.string(),
  position: z.number(),
  full_name: z.string(),
  company: z.string(),
  phone: z.string(),
  relation: state,
  verification_status: state,
  verified_at: text,
});
export type LanabagaReference = z.infer<typeof referenceSchema>;

const consentSchema = z.object({ key: z.string(), version: z.string(), text: z.string(), given: z.boolean() });
export type LanayaConsent = z.infer<typeof consentSchema>;

const capacitySchema = z.object({ effective: z.number(), active: z.number(), available: z.number() });
export type LanayaCapacity = z.infer<typeof capacitySchema>;

const historySchema = z.object({ event: z.string(), to: text, by_sugu: z.boolean(), note: text, occurred_at: text });

const meSchema = z.object({
  profile: profileSchema.nullable(),
  countries: z.array(z.object({ code: z.string(), name: z.string() })).optional().default([]),
  consents: z.array(consentSchema).default([]),
  documents: z.array(documentSchema).optional().default([]),
  references: z.array(referenceSchema).optional().default([]),
  requirements: z
    .object({ documents: z.array(state), references: z.number() })
    .optional()
    .default({ documents: [], references: 0 }),
  capabilities: z.record(state).optional().default({}),
  capacity: capacitySchema.nullable().optional().default(null),
  history: z.array(historySchema).optional().default([]),
});
export type LanayaMe = z.infer<typeof meSchema>;

export const leadSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  email: text,
  city: z.string(),
  sector: text,
  declared_source: state,
  relation_to_lanabaga: text,
  status: state,
  last_activity_at: text,
  created_at: text,
});
export type LanayaLead = z.infer<typeof leadSchema>;

export const invitationSchema = z.object({
  id: z.string(),
  lead_id: text,
  company_name: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  message: text,
  status: state,
  expires_at: text,
  accepted_at: text,
  store: z.object({ id: z.string(), name: z.string(), slug: text, city: text }).nullable().catch(null),
  created_at: text,
  store_active: z.boolean().optional(),
});
export type LanayaInvitation = z.infer<typeof invitationSchema>;

const overviewSchema = z.object({
  profile: profileSchema,
  capacity: capacitySchema,
  counts: z.object({ sellers_introduced: z.number(), invitations_open: z.number(), leads_active: z.number(), actions_required: z.number() }),
  actions: z.array(z.object({ key: z.string(), count: z.number() })),
  sellers: z.array(invitationSchema),
  recent_leads: z.array(leadSchema),
  level: state,
  commissions: z.object({ available: z.boolean() }),
});
export type LanayaOverview = z.infer<typeof overviewSchema>;

const pageMeta = z.object({ total: z.number(), current_page: z.number(), last_page: z.number(), per_page: z.number().optional() });

const leadsPageSchema = z.object({
  items: z.array(leadSchema),
  meta: pageMeta,
  summary: z.object({ active: z.number(), converted: z.number(), total: z.number(), invitations_open: z.number() }),
  cities: z.array(z.string()),
});
export type LanayaLeadsPage = z.infer<typeof leadsPageSchema>;

const invitationsPageSchema = z.object({ items: z.array(invitationSchema), meta: pageMeta });
export type LanayaInvitationsPage = z.infer<typeof invitationsPageSchema>;

export const publicCardSchema = z.object({
  public_code: z.string(),
  name: text,
  city: z.string(),
  country_code: z.string(),
  specialties: z.array(z.string()).catch([]),
  account_active: z.boolean(),
  badge: z.null().catch(null),
});
export type LanabagaPublicCard = z.infer<typeof publicCardSchema>;

const previewSchema = z.object({
  lanabaga: publicCardSchema,
  company_name: z.string(),
  message: text,
  expires_at: z.string(),
  signed_in: z.boolean(),
  stores: z.array(z.object({ id: z.string(), name: z.string(), city: text })),
  self: z.boolean(),
  consent: z.object({ key: z.string(), version: z.string(), text: z.string() }),
});
export type InvitationPreview = z.infer<typeof previewSchema>;

const sellerLanayaSchema = z.object({
  stores: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      city: text,
      introduced_by: publicCardSchema.extend({ accepted_at: text }).nullable(),
      assignment: z.null().catch(null),
    }),
  ),
});
export type SellerLanaya = z.infer<typeof sellerLanayaSchema>;

type Envelope = { data?: unknown; message?: string };
const data = (response: unknown) => (response as Envelope)?.data;

// ── Lectures ─────────────────────────────────────────────────────────

export async function fetchMe(): Promise<LanayaMe> {
  return meSchema.parse(data(await apiRequest("lanaya/me")));
}

export async function fetchOverview(): Promise<LanayaOverview> {
  return overviewSchema.parse(data(await apiRequest("lanaya/me/overview")));
}

export interface LeadFilters {
  status?: string;
  city?: string;
  search?: string;
  period?: string;
  page?: number;
}

export async function fetchLeads(filters: LeadFilters): Promise<LanayaLeadsPage> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string | number>;
  return leadsPageSchema.parse(data(await apiRequest("lanaya/me/leads", { params })));
}

export async function fetchInvitations(status?: string): Promise<LanayaInvitationsPage> {
  return invitationsPageSchema.parse(data(await apiRequest("lanaya/me/invitations", { params: status ? { status } : undefined })));
}

export async function fetchSellers(): Promise<LanayaInvitationsPage> {
  return invitationsPageSchema.parse(data(await apiRequest("lanaya/me/sellers")));
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  return previewSchema.parse(data(await apiRequest(`lanaya/invitations/${encodeURIComponent(token)}`, { retries: 0 })));
}

export async function fetchSellerLanaya(): Promise<SellerLanaya> {
  return sellerLanayaSchema.parse(data(await apiRequest("sellers/lanaya")));
}

/** A document of one's own file, through the relay (never the API host). */
export const documentFileHref = (documentId: string): string => `${API_PROXY_PREFIX}lanaya/me/documents/${encodeURIComponent(documentId)}/file`;

// ── Écritures ────────────────────────────────────────────────────────

export interface ApplicationInput {
  country_code?: string;
  city?: string;
  specialties?: string[];
  experience_band?: string | null;
  structure_name?: string | null;
  conflicts_declared?: string | null;
  references?: { full_name: string; company: string; phone: string; relation: string }[];
}

export async function startApplication(input: ApplicationInput): Promise<LanabagaProfile> {
  return profileSchema.parse(data(await apiRequest("lanaya/me/application", { method: "POST", body: input })));
}

export async function saveApplication(input: ApplicationInput): Promise<void> {
  await apiRequest("lanaya/me/application", { method: "PUT", body: input });
}

export async function submitApplication(consents: Record<string, boolean>): Promise<LanabagaProfile> {
  return profileSchema.parse(data(await apiRequest("lanaya/me/application/submit", { method: "POST", body: { consents } })));
}

export async function withdrawApplication(): Promise<void> {
  await apiRequest("lanaya/me/application/withdraw", { method: "POST" });
}

export const ACCEPTED_FILES = ".pdf,.jpg,.jpeg,.png";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function fileRefusal(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return "Le fichier dépasse 5 Mo.";
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return "Formats acceptés : PDF, JPG ou PNG.";
  return null;
}

export async function uploadDocument(type: string, file: File): Promise<LanabagaDocument> {
  const body = new FormData();
  body.set("document_type", type);
  body.set("file", file);
  const response = await apiFetch("lanaya/me/documents", { method: "POST", body });
  const json = (await response.json().catch(() => ({}))) as Envelope & { error_code?: string; errors?: Record<string, string[]> };
  if (!response.ok) {
    throw new ApiError({ message: json.message ?? `HTTP ${response.status}`, status: response.status, code: json.error_code ?? `HTTP_${response.status}`, errors: json.errors });
  }
  return documentSchema.parse(json.data);
}

export interface LeadInput {
  company_name: string;
  contact_name: string;
  phone: string;
  email?: string | null;
  city: string;
  sector?: string | null;
  declared_source: string;
  relation_to_lanabaga?: string | null;
  contact_permission: boolean;
}

export async function createLead(input: LeadInput): Promise<LanayaLead> {
  return leadSchema.parse(data(await apiRequest("lanaya/me/leads", { method: "POST", body: input })));
}

export async function updateLead(id: string, input: Partial<LeadInput> & { status?: string }): Promise<LanayaLead> {
  return leadSchema.parse(data(await apiRequest(`lanaya/me/leads/${encodeURIComponent(id)}`, { method: "PUT", body: input })));
}

export interface InvitationInput {
  lead_id?: string | null;
  company_name: string;
  contact_name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
}

export async function createInvitation(input: InvitationInput, idempotencyKey: string): Promise<{ invitation: LanayaInvitation; link: string | null }> {
  const raw = data(await apiRequest("lanaya/me/invitations", { method: "POST", body: input, headers: { "Idempotency-Key": idempotencyKey } }));
  return z.object({ invitation: invitationSchema, link: z.string().nullable() }).parse(raw);
}

export async function revokeInvitation(id: string): Promise<void> {
  await apiRequest(`lanaya/me/invitations/${encodeURIComponent(id)}/revoke`, { method: "POST" });
}

export async function acceptInvitation(token: string, storeId: string): Promise<void> {
  await apiRequest(`lanaya/invitations/${encodeURIComponent(token)}/accept`, { method: "POST", body: { store_id: storeId, consent: true } });
}

export async function declineInvitation(token: string): Promise<void> {
  await apiRequest(`lanaya/invitations/${encodeURIComponent(token)}/decline`, { method: "POST" });
}

/** The fixed SUGU text of an invitation, completed by the personal note (no link, no phone: the server removes them). */
export function invitationShareText(companyName: string, link: string, note?: string | null): string {
  const lines = [`Bonjour, je vous présente SUGU pour ${companyName}.`];
  if (note) lines.push(note);
  lines.push(`Ouvrez l'invitation officielle de SUGU : ${link}`);
  return lines.join("\n\n");
}
