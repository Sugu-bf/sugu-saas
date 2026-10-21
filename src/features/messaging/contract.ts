import { z } from "zod";

// ============================================================
// Messaging — what Laravel answers the three pro profiles about a
// conversation (`seller/conversations*`, `courier/conversations*`,
// `agency/{id}/conversations*`).
//
// One shape for the three: the server already says who the other
// side is (`peer`), what the reader may do (`can`), how far the
// other side has read, and where an attachment is read (`path`,
// under the reader's own route, never a link to the storage).
// Nothing is computed here but what is display: a title, a preview.
// ============================================================

export type Profile = "vendor" | "courier" | "agency" | "lanabaga";

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));
const flag = z.boolean().nullish().transform((value) => value === true);

const canSchema = z
  .object({ send: flag, share_product: flag, close: flag, block: flag, report: flag })
  .nullish()
  .transform((can) => ({
    send: can?.send ?? false,
    shareProduct: can?.share_product ?? false,
    close: can?.close ?? false,
    block: can?.block ?? false,
    report: can?.report ?? false,
  }));

const lastMessageSchema = z
  .object({
    id: z.string(),
    body: z.string().nullish(),
    sender_type: z.string().nullish(),
    sender_id: text,
    message_type: z.string().nullish(),
    attachment_kind: z.enum(["image", "file"]).nullish().catch(null),
    is_hidden: flag,
    created_at: text,
  })
  .nullish();

const conversationSchema = z.object({
  id: z.string(),
  type: z.string().nullish(),
  status: z.string().nullish(),
  peer: z
    .object({ type: z.string(), id: text, name: text, avatar_url: text, is_online: z.boolean().nullish() })
    .nullish(),
  customer: z.object({ id: z.string(), name: text, phone: text, store_customer_id: text }).nullish(),
  store: z.object({ id: z.string(), name: text }).nullish(),
  courier: z.object({ id: z.string(), name: text }).nullish(),
  order_id: text,
  order_number: text,
  shipment_id: text,
  shipment: z.object({ id: z.string(), status: text, is_active: flag }).nullish(),
  last_message: lastMessageSchema,
  unread_count: z.coerce.number().int().nonnegative().nullish(),
  peer_last_read_message_id: text,
  can: canSchema,
  // What the server removes from a message here (phone, email, link).
  contact_policy: z.object({ masked: z.array(z.string()).catch([]) }).nullish().catch(null),
  updated_at: text,
  created_at: text,
});

export type PeerType = "customer" | "store" | "courier" | "lanabaga" | "unknown";

export interface Conversation {
  id: string;
  /** `ConversationType` of Laravel, as answered. */
  type: string;
  /** `open`, `closed`, `blocked` or `archived`. */
  status: string;
  /** Who the reader talks to (or, for an agency, who its courier talks to). */
  peer: { type: PeerType; id: string | null; name: string; avatarUrl: string | null; online: boolean | null };
  /** The courier an agency supervises; null for the other profiles. */
  courier: { id: string; name: string } | null;
  /** The buyer's record in the store, once they are a customer of it. */
  customerRecord: { id: string | null; phone: string | null } | null;
  orderId: string | null;
  orderNumber: string | null;
  shipmentId: string | null;
  shipment: { status: string | null; active: boolean } | null;
  lastMessage: {
    id: string;
    body: string;
    senderType: string;
    senderId: string | null;
    type: string;
    attachmentKind: "image" | "file" | null;
    hidden: boolean;
    at: string | null;
  } | null;
  unread: number;
  /** The furthest message the other side has read. */
  peerLastReadId: string | null;
  can: { send: boolean; shareProduct: boolean; close: boolean; block: boolean; report: boolean };
  /** What the server masks in a message of this conversation: `phone`, `email`, `link`. */
  contactPolicy: { masked: string[] };
  updatedAt: string | null;
}

const PEER_TYPES: PeerType[] = ["customer", "store", "courier", "lanabaga"];

function toConversation(raw: z.infer<typeof conversationSchema>): Conversation {
  const peerType = PEER_TYPES.find((type) => type === raw.peer?.type) ?? "unknown";
  const last = raw.last_message;

  return {
    id: raw.id,
    type: raw.type ?? "general",
    status: raw.status ?? "open",
    peer: {
      type: peerType,
      id: raw.peer?.id ?? null,
      name: raw.peer?.name ?? raw.customer?.name ?? raw.store?.name ?? "Correspondant",
      avatarUrl: raw.peer?.avatar_url ?? null,
      online: raw.peer?.is_online ?? null,
    },
    courier: raw.courier ? { id: raw.courier.id, name: raw.courier.name ?? "Coursier" } : null,
    customerRecord: raw.customer ? { id: raw.customer.store_customer_id, phone: raw.customer.phone } : null,
    orderId: raw.order_id,
    orderNumber: raw.order_number,
    shipmentId: raw.shipment_id,
    shipment: raw.shipment ? { status: raw.shipment.status, active: raw.shipment.is_active } : null,
    lastMessage: last
      ? {
          id: last.id,
          body: last.body ?? "",
          senderType: last.sender_type ?? "customer",
          senderId: last.sender_id,
          type: last.message_type ?? "text",
          attachmentKind: last.attachment_kind ?? null,
          hidden: last.is_hidden,
          at: last.created_at,
        }
      : null,
    unread: raw.unread_count ?? 0,
    peerLastReadId: raw.peer_last_read_message_id,
    can: raw.can,
    contactPolicy: { masked: raw.contact_policy?.masked ?? [] },
    updatedAt: raw.updated_at,
  };
}

export interface ConversationPage {
  rows: Conversation[];
  /** What to ask next: a cursor (seller, courier) or a page number (agency). Null at the end. */
  next: string | null;
  /** Counts of the whole list, when the server gives them (seller, courier). */
  counts: { all: number; unread: number } | null;
  total: number | null;
}

const count = z.coerce.number().int().nonnegative();

const pageSchema = z.object({
  data: z.array(z.unknown()),
  meta: z
    .object({
      has_more: z.boolean().nullish(),
      next_cursor: text,
      counts: z.object({ all: count, unread: count }).nullish(),
      current_page: count.nullish(),
      last_page: count.nullish(),
      total: count.nullish(),
    })
    .nullish(),
});

/** A row the portal cannot read is left out rather than breaking the list. */
export function parseConversationPage(payload: unknown): ConversationPage {
  const page = pageSchema.parse(payload);
  const rows: Conversation[] = [];
  for (const row of page.data) {
    const parsed = conversationSchema.safeParse(row);
    if (parsed.success) rows.push(toConversation(parsed.data));
  }

  const meta = page.meta;
  const byPage = meta?.current_page != null && meta.last_page != null;
  const next = byPage
    ? meta.current_page! < meta.last_page!
      ? String(meta.current_page! + 1)
      : null
    : meta?.has_more
      ? (meta.next_cursor ?? null)
      : null;

  return { rows, next, counts: meta?.counts ?? null, total: meta?.total ?? null };
}

export function parseConversation(payload: unknown): Conversation {
  return toConversation(z.object({ data: conversationSchema }).parse(payload).data);
}

// ── Messages ────────────────────────────────────────────────

const attachmentSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  type: z.enum(["image", "file"]).catch("file"),
  path: z.string(),
  name: text,
  size: z.coerce.number().nonnegative().catch(0),
  mime_type: text,
});

const messageSchema = z.object({
  id: z.string(),
  client_message_id: text,
  sender_id: text,
  sender_type: z.string().nullish(),
  sender_name: text,
  body: z.string().nullish(),
  message_type: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish().catch(null),
  product: z
    .object({ available: flag, name: text, price: z.coerce.number().nullish(), in_stock: flag })
    .nullish(),
  is_own: z.boolean().nullish(),
  attachments: z.array(attachmentSchema).nullish().catch([]),
  is_flagged: flag,
  created_at: z.string(),
});

export interface Attachment {
  id: string;
  kind: "image" | "file";
  /** API path, read through the BFF as the reader of the conversation. */
  path: string;
  name: string;
  size: number;
  mime: string | null;
}

export interface ProductCard {
  id: string;
  /** As it was when the card was sent. */
  name: string;
  thumbnail: string | null;
  category: string | null;
  sentPrice: number;
  /** As it is now; null when the server did not say. */
  current: { available: boolean; price: number | null; inStock: boolean } | null;
}

export interface Message {
  id: string;
  clientId: string | null;
  senderId: string | null;
  senderType: string;
  senderName: string;
  body: string;
  type: "text" | "product_card" | "system_event" | "image";
  product: ProductCard | null;
  attachments: Attachment[];
  /** Written by the reader. For an agency, which is nobody's side: written by its courier. */
  own: boolean;
  flagged: boolean;
  /** What the server masked in it (`phone`, `email`, `link`): told to its author. */
  masked: string[];
  at: string;
}

const MESSAGE_TYPES = ["text", "product_card", "system_event", "image"] as const;

const stringOf = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);
const numberOf = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

function toMessage(raw: z.infer<typeof messageSchema>): Message {
  const type = MESSAGE_TYPES.find((known) => known === raw.message_type) ?? "text";
  const meta = raw.metadata ?? {};
  const productId = stringOf(meta.product_id);

  return {
    id: raw.id,
    clientId: raw.client_message_id,
    senderId: raw.sender_id,
    senderType: raw.sender_type ?? "customer",
    senderName: raw.sender_name ?? "Inconnu",
    body: raw.body ?? "",
    type,
    product:
      type === "product_card" && productId
        ? {
            id: productId,
            name: stringOf(meta.product_name) ?? raw.product?.name ?? "Produit",
            thumbnail: stringOf(meta.thumbnail),
            category: stringOf(meta.category),
            sentPrice: numberOf(meta.price),
            current: raw.product
              ? { available: raw.product.available, price: raw.product.price ?? null, inStock: raw.product.in_stock }
              : null,
          }
        : null,
    masked: Array.isArray(meta.masked) ? meta.masked.filter((kind): kind is string => typeof kind === "string") : [],
    attachments: (raw.attachments ?? []).map((file) => ({
      id: file.id,
      kind: file.type,
      path: file.path,
      name: file.name ?? "Pièce jointe",
      size: file.size,
      mime: file.mime_type,
    })),
    own: raw.is_own ?? raw.sender_type === "courier",
    flagged: raw.is_flagged,
    at: raw.created_at,
  };
}

export interface MessagePage {
  /** Oldest first. */
  messages: Message[];
  hasMore: boolean;
  peerLastReadId: string | null;
}

const messagePageSchema = z.object({
  data: z.object({
    messages: z.array(z.unknown()),
    has_more: flag,
    peer_last_read_message_id: text,
  }),
});

export function parseMessagePage(payload: unknown): MessagePage {
  const { data } = messagePageSchema.parse(payload);
  const messages: Message[] = [];
  for (const row of data.messages) {
    const parsed = messageSchema.safeParse(row);
    if (parsed.success) messages.push(toMessage(parsed.data));
  }
  return { messages, hasMore: data.has_more, peerLastReadId: data.peer_last_read_message_id };
}

export function parseMessage(payload: unknown): Message {
  return toMessage(z.object({ data: messageSchema }).parse(payload).data);
}

// ── Presence ────────────────────────────────────────────────

export type LastActive = "now" | "recently" | "today" | "long_ago" | "never";

export interface Presence {
  online: boolean;
  lastActive: LastActive;
}

const presenceSchema = z.object({
  data: z.array(z.object({ is_online: flag, last_active: z.enum(["now", "recently", "today", "long_ago", "never"]).catch("never") })),
});

/** Presence of the other side; null when the server names nobody. */
export function parsePresence(payload: unknown): Presence | null {
  const first = presenceSchema.parse(payload).data[0];
  return first ? { online: first.is_online, lastActive: first.last_active } : null;
}

// ── Products a store may share ──────────────────────────────

export interface ShareableProduct {
  id: string;
  name: string;
  price: number;
  thumbnail: string | null;
  inStock: boolean;
}

const productsSchema = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string(), price: z.coerce.number().catch(0), thumbnail: text, in_stock: flag })),
});

export function parseShareableProducts(payload: unknown): ShareableProduct[] {
  return productsSchema.parse(payload).data.map((row) => ({ id: row.id, name: row.name, price: row.price, thumbnail: row.thumbnail, inStock: row.in_stock }));
}

// ── Broadcast payloads (`message.created`, `message.read`, `user.typing`) ──

const createdEventSchema = z.object({
  message_id: z.string(),
  client_message_id: text,
  conversation_id: z.string(),
  sender_id: text,
  sender_name: text,
  body_snippet: z.string().nullish(),
});
const readEventSchema = z.object({ conversation_id: z.string(), user_id: z.string(), last_read_message_id: z.string() });
const typingEventSchema = z.object({ conversation_id: z.string(), user_id: z.string(), user_name: text });

export type CreatedEvent = { messageId: string; clientId: string | null; conversationId: string; senderId: string | null; senderName: string | null };
export type ReadEvent = { conversationId: string; userId: string; lastReadId: string };
export type TypingEvent = { conversationId: string; userId: string; userName: string | null };

/** An event the portal cannot read is ignored: what comes from the socket is never trusted as is. */
export function parseCreatedEvent(payload: unknown): CreatedEvent | null {
  const parsed = createdEventSchema.safeParse(payload);
  if (!parsed.success) return null;
  const event = parsed.data;
  return { messageId: event.message_id, clientId: event.client_message_id, conversationId: event.conversation_id, senderId: event.sender_id, senderName: event.sender_name };
}

export function parseReadEvent(payload: unknown): ReadEvent | null {
  const parsed = readEventSchema.safeParse(payload);
  return parsed.success ? { conversationId: parsed.data.conversation_id, userId: parsed.data.user_id, lastReadId: parsed.data.last_read_message_id } : null;
}

export function parseTypingEvent(payload: unknown): TypingEvent | null {
  const parsed = typingEventSchema.safeParse(payload);
  return parsed.success ? { conversationId: parsed.data.conversation_id, userId: parsed.data.user_id, userName: parsed.data.user_name } : null;
}

// ── What a file must be to be sent (`sendMessage` validation of Laravel) ──

export const MESSAGE_LIMITS = {
  bodyLength: 5000,
  files: 5,
  fileBytes: 10 * 1024 * 1024,
  extensions: ["jpeg", "jpg", "png", "gif", "webp", "pdf", "doc", "docx"],
  imageExtensions: ["jpeg", "jpg", "png", "gif", "webp"],
} as const;

export interface FileLimits {
  files: number;
  fileBytes: number;
  extensions: readonly string[];
}

export const extensionOf = (name: string): string => (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "");

/**
 * Why a file cannot be added, or null. The server checks again, on the
 * content as well: this only spares a round trip for what is plainly refused.
 */
export function fileRefusal(file: { name: string; size: number }, already: number, limits: FileLimits = MESSAGE_LIMITS): string | null {
  if (already >= limits.files) return `${limits.files} fichiers au plus par message.`;
  if (!limits.extensions.includes(extensionOf(file.name))) return `« ${file.name} » : ce type de fichier n'est pas accepté.`;
  if (file.size > limits.fileBytes) return `« ${file.name} » dépasse ${Math.round(limits.fileBytes / (1024 * 1024))} Mo.`;
  if (file.size === 0) return `« ${file.name} » est vide.`;
  return null;
}
