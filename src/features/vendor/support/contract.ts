import { z } from "zod";
import type { Attachment } from "@/features/messaging/contract";
import type { FileLimits } from "@/features/messaging/contract";

// ============================================================
// Support tickets of a seller — what `sellers/support/tickets*`
// answers (`SellerTicketController`).
//
// Six statuses exist in Laravel (`TicketStatus`) and are kept apart:
// a resolved ticket still takes a reply (which reopens it) and can be
// closed; a closed one takes nothing. What the seller may do is read
// from `can`, never guessed from the status.
// No deadline and no agent: the server does not give them to a seller.
// ============================================================

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));
const flag = z.boolean().nullish().transform((value) => value === true);
const count = z.coerce.number().int().nonnegative().catch(0);

/** `App\Enums\Support\TicketStatus`. */
export const TICKET_STATUSES = ["open", "pending_customer", "pending_internal", "escalated", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** `App\Enums\Support\TicketCategory`, in the order the form lists them. */
export const TICKET_CATEGORIES = [
  { value: "order", label: "Commande" },
  { value: "payment", label: "Paiement" },
  { value: "delivery", label: "Livraison" },
  { value: "refund", label: "Remboursement" },
  { value: "product", label: "Produit" },
  { value: "account", label: "Compte" },
  { value: "vendor", label: "Boutique" },
  { value: "other", label: "Autre" },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(TICKET_CATEGORIES.map((category) => [category.value, category.label]));
export const categoryLabel = (code: string | null): string => (code ? (CATEGORY_LABEL[code] ?? "Autre") : "Non renseignée");

/** `App\Enums\Support\TicketPriority`. Set by the support team; shown, never edited here. */
const PRIORITY_LABEL: Record<string, string> = { low: "Basse", medium: "Normale", high: "Haute", urgent: "Urgente" };
export const priorityLabel = (code: string | null): string | null => (code ? (PRIORITY_LABEL[code] ?? null) : null);

/** The groups a list can be narrowed to. Each one names real statuses, sent as they are. */
export const TICKET_FILTERS = [
  { value: "all", label: "Tous les statuts", short: "Tous", statuses: [] },
  { value: "active", label: "Ouverts", short: "Ouverts", statuses: ["open", "pending_customer", "pending_internal", "escalated"] },
  { value: "done", label: "Résolus et fermés", short: "Résolus", statuses: ["resolved", "closed"] },
] as const satisfies readonly { value: string; label: string; short: string; statuses: readonly TicketStatus[] }[];
export type TicketFilter = (typeof TICKET_FILTERS)[number]["value"];

export const SUBJECT_MAX = 255;
export const DESCRIPTION_MAX = 5000;
export const REPLY_MAX = 5000;

/** `TicketMessage::attachmentRules(5120)`, three files at most. */
export const REPLY_FILE_LIMITS: FileLimits = {
  files: 3,
  fileBytes: 5 * 1024 * 1024,
  extensions: ["jpeg", "jpg", "png", "gif", "webp", "pdf", "txt", "csv", "zip", "doc", "docx", "xls", "xlsx"],
};

const ticketSchema = z.object({
  id: z.string(),
  ticket_number: z.string(),
  subject: z.string(),
  // Kept as answered: a status the portal does not know is shown as unknown.
  status: z.string(),
  priority: text,
  category: text,
  store: z.object({ id: z.string(), name: text }).nullish(),
  customer: z.object({ id: z.string(), name: text }).nullish(),
  is_requester: flag,
  can: z.object({ reply: flag, close: flag }).nullish(),
  last_message_at: text,
  created_at: text,
  description: text.optional(),
  order: z.object({ id: z.string(), number: text }).nullish(),
});

export interface Ticket {
  id: string;
  number: string;
  subject: string;
  status: string;
  priority: string | null;
  category: string | null;
  storeName: string | null;
  /** Who opened it, when it is not the seller (a buyer who wrote about the store). */
  openedBy: string | null;
  isRequester: boolean;
  can: { reply: boolean; close: boolean };
  lastActivityAt: string | null;
  createdAt: string | null;
  order: { id: string; number: string | null } | null;
}

function toTicket(raw: z.infer<typeof ticketSchema>): Ticket {
  return {
    id: raw.id,
    number: raw.ticket_number,
    subject: raw.subject,
    status: raw.status,
    priority: raw.priority,
    category: raw.category,
    storeName: raw.store?.name ?? null,
    openedBy: raw.is_requester ? null : (raw.customer?.name ?? null),
    isRequester: raw.is_requester,
    can: { reply: raw.can?.reply ?? false, close: raw.can?.close ?? false },
    lastActivityAt: raw.last_message_at ?? raw.created_at,
    createdAt: raw.created_at,
    order: raw.order ? { id: raw.order.id, number: raw.order.number } : null,
  };
}

export interface TicketCounts {
  all: number;
  byStatus: Record<string, number>;
}

export interface TicketPage {
  rows: Ticket[];
  page: number;
  lastPage: number;
  total: number;
  counts: TicketCounts;
}

const pageSchema = z.object({
  data: z.array(z.unknown()),
  current_page: count.optional(),
  last_page: count.optional(),
  total: count.optional(),
  counts: z.record(z.string(), count).nullish(),
});

export function parseTicketPage(payload: unknown): TicketPage {
  const page = pageSchema.parse(payload);
  const rows: Ticket[] = [];
  for (const row of page.data) {
    const parsed = ticketSchema.safeParse(row);
    if (parsed.success) rows.push(toTicket(parsed.data));
  }
  const { all = 0, ...byStatus } = page.counts ?? {};
  return { rows, page: page.current_page || 1, lastPage: page.last_page || 1, total: page.total ?? rows.length, counts: { all, byStatus } };
}

/** Tickets of a filter, from the counts of the whole list. */
export function countOf(counts: TicketCounts | undefined, filter: TicketFilter): number | undefined {
  if (!counts) return undefined;
  const group = TICKET_FILTERS.find((candidate) => candidate.value === filter)!;
  return group.statuses.length === 0 ? counts.all : group.statuses.reduce((sum, status) => sum + (counts.byStatus[status] ?? 0), 0);
}

export const parseTicket = (payload: unknown): Ticket => toTicket(z.object({ ticket: ticketSchema }).parse(payload).ticket);

export const parseCreatedTicket = (payload: unknown): { id: string; number: string; duplicate: boolean } => {
  const created = z.object({ ticket: z.object({ id: z.string(), ticket_number: z.string() }), duplicate: flag }).parse(payload);
  return { id: created.ticket.id, number: created.ticket.ticket_number, duplicate: created.duplicate };
};

const replySchema = z.object({
  id: z.string(),
  client_message_id: text,
  sender_type: z.string(),
  sender_name: text,
  is_own: flag,
  body: z.string().nullish(),
  attachments: z
    .array(z.object({ id: z.union([z.number(), z.string()]).transform(String), name: text, path: z.string(), size: z.coerce.number().nonnegative().catch(0), mime: text }))
    .nullish()
    .catch([]),
  created_at: z.string(),
});

export interface TicketReply {
  id: string;
  /** `customer` (who opened it), `seller` or `admin` (the support team). */
  senderType: string;
  senderName: string;
  own: boolean;
  body: string;
  attachments: Attachment[];
  at: string;
}

function toReply(raw: z.infer<typeof replySchema>): TicketReply {
  return {
    id: raw.id,
    senderType: raw.sender_type,
    senderName: raw.sender_name ?? "Inconnu",
    own: raw.is_own,
    body: raw.body ?? "",
    attachments: (raw.attachments ?? []).map((file) => ({
      id: file.id,
      kind: file.mime?.startsWith("image/") ? "image" : "file",
      path: file.path,
      name: file.name ?? "Pièce jointe",
      size: file.size,
      mime: file.mime,
    })),
    at: raw.created_at,
  };
}

export interface ReplyPage {
  /** Oldest first. */
  replies: TicketReply[];
  hasMore: boolean;
}

export function parseReplyPage(payload: unknown): ReplyPage {
  const page = z.object({ messages: z.array(z.unknown()), has_more: flag }).parse(payload);
  const replies: TicketReply[] = [];
  for (const row of page.messages) {
    const parsed = replySchema.safeParse(row);
    if (parsed.success) replies.push(toReply(parsed.data));
  }
  return { replies, hasMore: page.has_more };
}

export const parseReply = (payload: unknown): TicketReply => toReply(z.object({ data: replySchema }).parse(payload).data);

// ── The form of a new ticket ────────────────────────────────

export interface NewTicket {
  subject: string;
  category: string;
  description: string;
}

/** What the form refuses before asking the server, field by field. */
export function validateNewTicket(values: NewTicket): Partial<Record<keyof NewTicket, string>> {
  const errors: Partial<Record<keyof NewTicket, string>> = {};
  const subject = values.subject.trim();
  const description = values.description.trim();

  if (subject === "") errors.subject = "Indiquez le sujet de votre demande.";
  else if (subject.length > SUBJECT_MAX) errors.subject = `${SUBJECT_MAX} caractères au plus.`;

  if (!TICKET_CATEGORIES.some((category) => category.value === values.category)) errors.category = "Choisissez une catégorie.";

  if (description === "") errors.description = "Décrivez votre demande.";
  else if (description.length > DESCRIPTION_MAX) errors.description = `${DESCRIPTION_MAX} caractères au plus.`;

  return errors;
}
