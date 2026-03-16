// ── Conversation ──────────────────────────────────

export type ConversationType =
  | "general"
  | "pre_order"
  | "order_support"
  | "delivery_support"
  | "support_chat";

export type ConversationStatus = "open" | "closed" | "archived" | "blocked";

export interface ConversationStore {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_online: boolean;
}

export interface ConversationParticipant {
  id: string;
  type: "customer" | "seller" | "admin" | "courier" | "agency";
  role: string;
  name: string;
}

export interface MessagePreview {
  id: string;
  body: string;
  sender_type: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  store: ConversationStore | null;
  customer?: { id: string; name: string };
  order_id: string | null;
  last_message: MessagePreview | null;
  unread_count: number;
  updated_at: string;
  created_at: string;
  participants: ConversationParticipant[];
}

// ── Message ───────────────────────────────────────

export type MessageType = "text" | "product_card" | "image" | "system_event";
export type SenderType = "customer" | "seller" | "admin" | "courier" | "system";

export interface MessageAttachment {
  id: number;
  type: "image" | "file";
  url: string;
  thumb_url: string | null;
  name: string;
  size: number;
  mime_type: string;
}

export interface ProductCardMetadata {
  product_id: string;
  product_name: string;
  product_slug: string;
  price: number;
  compare_price: number | null;
  currency: string;
  thumbnail: string | null;
  store_name: string | null;
  category: string | null;
  rating_avg: number;
  in_stock: boolean;
}

export interface Message {
  id: string;
  sender_id: string | null;
  sender_type: SenderType;
  sender_name: string;
  body: string;
  message_type: MessageType;
  metadata: ProductCardMetadata | Record<string, unknown> | null;
  is_own: boolean;
  attachments: MessageAttachment[];
  is_flagged: boolean;
  created_at: string;
}

// ── Presence ──────────────────────────────────────

export type LastActiveStatus = "now" | "recently" | "today" | "long_ago" | "never";

export interface PresenceInfo {
  user_id: string;
  name: string;
  participant_type: string;
  is_online: boolean;
  last_active: LastActiveStatus;
}

// ── Broadcast Event Payloads ─────────────────────

export interface MessageCreatedPayload {
  message_id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string;
  sender_name: string;
  body_snippet: string;
  message_type: MessageType;
  has_attachments: boolean;
  has_metadata: boolean;
  created_at: string;
}

export interface MessageReadPayload {
  conversation_id: string;
  user_id: string;
  last_read_message_id: string;
  read_at: string;
}

export interface UserTypingPayload {
  conversation_id: string;
  user_id: string;
  user_name: string;
  participant_type: string;
}
