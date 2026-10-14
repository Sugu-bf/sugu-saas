import { api, apiUrl } from "@/lib/http/client";
import {
  parseConversation,
  parseConversationPage,
  parseMessage,
  parseMessagePage,
  parsePresence,
  parseShareableProducts,
  type Profile,
} from "./contract";

// ============================================================
// Messaging — HTTP calls, all through the BFF.
//
// A scope says who is reading: Laravel resolves the store or the
// courier from the session, and checks the agency of the address.
// A conversation of someone else answers 404, whatever the door.
// ============================================================

export type MessagingScope =
  | { profile: "vendor"; storeId: string | null }
  | { profile: "courier"; userId: string | null }
  | { profile: "agency"; agencyId: string | null };

const ID = /^[0-9A-Za-z-]{1,64}$/;

/** An identifier goes into a path: anything that is not one is refused before the request. */
function segment(id: string): string {
  if (!ID.test(id)) throw new Error("Identifiant invalide.");
  return id;
}

export function basePath(scope: MessagingScope): string | null {
  if (scope.profile === "vendor") return "seller/conversations";
  if (scope.profile === "courier") return "courier/conversations";
  return scope.agencyId ? `agency/${segment(scope.agencyId)}/conversations` : null;
}

/** The private channel of the reader, as `routes/channels.php` names it. */
export function channelOf(scope: MessagingScope): string | null {
  if (scope.profile === "vendor") return scope.storeId ? `messaging.store.${scope.storeId}` : null;
  if (scope.profile === "courier") return scope.userId ? `messaging.courier.${scope.userId}` : null;
  return scope.agencyId ? `messaging.agency.${scope.agencyId}` : null;
}

export const routeOf = (profile: Profile): string => ({ vendor: "/vendor/messages", courier: "/driver/messages", agency: "/agency/messages" })[profile];

/** A key that changes with the reader: two accounts never share a cache entry. */
export const scopeKey = (scope: MessagingScope): string =>
  scope.profile === "vendor" ? `vendor:${scope.storeId ?? ""}` : scope.profile === "courier" ? `courier:${scope.userId ?? ""}` : `agency:${scope.agencyId ?? ""}`;

function base(scope: MessagingScope): string {
  const path = basePath(scope);
  if (!path) throw new Error("Espace de messagerie indisponible.");
  return path;
}

export const PAGE_SIZE = 20;
export const MESSAGE_PAGE_SIZE = 30;

export interface ConversationFilters {
  search: string;
  unreadOnly: boolean;
  /** Agency only: the courier whose conversations are read. */
  courierId: string | null;
}

/**
 * One page of the list. `next` is what the previous page answered: a cursor
 * for a seller or a courier, a page number for an agency. Never a number
 * made up on this side.
 */
export async function fetchConversations(scope: MessagingScope, filters: ConversationFilters, next: string | null) {
  const params: Record<string, string | number> = { per_page: PAGE_SIZE };
  if (filters.search.trim()) params.q = filters.search.trim();

  if (scope.profile === "agency") {
    if (filters.courierId) params.courier_id = filters.courierId;
    if (next) params.page = next;
  } else {
    if (filters.unreadOnly) params.unread = 1;
    if (next) params.cursor = next;
  }

  return parseConversationPage(await api.get<unknown>(base(scope), { params }));
}

/** Counts of the whole list (all, unread), read from a page of one row. Null when the server gives none (agency). */
export const fetchConversationCounts = async (scope: MessagingScope) => parseConversationPage(await api.get<unknown>(base(scope), { params: { per_page: 1 } })).counts;

export const fetchConversation = async (scope: MessagingScope, id: string) => parseConversation(await api.get<unknown>(`${base(scope)}/${segment(id)}`, { retries: 0 }));

/** A page of messages, oldest first, ending just before `beforeId`. */
export async function fetchMessages(scope: MessagingScope, id: string, beforeId: string | null) {
  const params: Record<string, string | number> = { limit: MESSAGE_PAGE_SIZE };
  if (beforeId) params.before_id = beforeId;
  return parseMessagePage(await api.get<unknown>(`${base(scope)}/${segment(id)}/messages`, { params }));
}

export interface OutgoingMessage {
  /** UUID named once for the message: a replay carries the same one and writes nothing more. */
  clientId: string;
  body: string;
  files: File[];
}

export async function sendMessage(scope: MessagingScope, id: string, message: OutgoingMessage) {
  const form = new FormData();
  form.append("client_message_id", message.clientId);
  if (message.body) form.append("body", message.body);
  for (const file of message.files) form.append("attachments[]", file, file.name);
  // A file takes longer than a sentence to leave a phone.
  return parseMessage(await api.post<unknown>(`${base(scope)}/${segment(id)}/messages`, form, { timeout: message.files.length > 0 ? 90_000 : 20_000 }));
}

export async function sendProductCard(scope: MessagingScope, id: string, card: { clientId: string; productId: string }) {
  return parseMessage(await api.post<unknown>(`${base(scope)}/${segment(id)}/product-card`, { product_id: card.productId, client_message_id: card.clientId }));
}

export const markRead = (scope: MessagingScope, id: string, lastReadId: string) =>
  api.post<unknown>(`${base(scope)}/${segment(id)}/read`, { last_read_message_id: lastReadId });

export const closeConversation = (scope: MessagingScope, id: string) => api.post<unknown>(`${base(scope)}/${segment(id)}/close`);

export const blockConversation = (scope: MessagingScope, id: string, reason: string | null) =>
  api.post<unknown>(`${base(scope)}/${segment(id)}/block`, reason ? { reason_code: reason } : {});

export const REPORT_REASONS = [
  { value: "spam", label: "Message indésirable" },
  { value: "harassment", label: "Harcèlement ou menace" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "fraud", label: "Tentative de fraude" },
  { value: "other", label: "Autre raison" },
] as const;

export const reportMessage = (scope: MessagingScope, id: string, messageId: string, report: { reason: string; note: string }) =>
  api.post<unknown>(`${base(scope)}/${segment(id)}/messages/${segment(messageId)}/report`, {
    reason_code: report.reason,
    ...(report.note.trim() ? { note: report.note.trim() } : {}),
  });

/** Best effort: a typing signal that does not leave is not worth an error. */
export const sendTyping = (scope: MessagingScope, id: string) => api.post<unknown>(`${base(scope)}/${segment(id)}/typing`).catch(() => undefined);

export const fetchPresence = async (scope: MessagingScope, id: string) => parsePresence(await api.get<unknown>(`${base(scope)}/${segment(id)}/presence`, { retries: 0 }));

/** Products of the store of the conversation that are on sale: what a seller may share. */
export async function fetchShareableProducts(conversationId: string, search: string) {
  const params: Record<string, string | number> = { limit: 20 };
  if (search.trim()) params.q = search.trim();
  return parseShareableProducts(await api.get<unknown>(`conversations/${segment(conversationId)}/recommended-products`, { params }));
}

/**
 * Where the browser reads an attachment: the portal's own relay, which adds
 * the session. Only a path the API answered under one of the messaging or
 * support routes is turned into an address.
 */
export function attachmentHref(path: string): string | null {
  const clean = path.replace(/^\/+/, "");
  const known = /^(seller\/conversations|courier\/conversations|agency\/[0-9A-Za-z]+\/conversations|sellers\/support\/tickets)\/[0-9A-Za-z/_-]+\/attachments\/\d+$/;
  return known.test(clean) ? apiUrl(clean) : null;
}

/**
 * A courier opens (or finds again) the conversation with the buyer or the
 * store of a mission. The server checks that the mission is theirs, and
 * that the store takes part in it.
 */
export async function startCourierConversation(start: { shipmentId: string; target: "courier_customer" | "courier_store"; storeId?: string }) {
  const body: Record<string, string> = { shipment_id: start.shipmentId, target: start.target };
  if (start.storeId) body.store_id = start.storeId;
  return parseConversation(await api.post<unknown>("courier/conversations/start", body));
}
