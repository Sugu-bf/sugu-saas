/**
 * Messaging Service — Seller Endpoints
 * Handles: GET/POST /seller/conversations, messages, actions
 */
import { api } from "@/lib/http/client";
import type {
  Conversation,
  Message,
  PresenceInfo,
} from "@/lib/messaging/types";

// ── ID Validation (S2 fix: prevent path injection) ─────────

// Accepts both UUID (with dashes) and ULID (26 alphanumeric chars) formats
const ID_RE = /^[0-9a-z]{26}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _validateId(id: string, label = "ID"): string {
  if (!ID_RE.test(id)) {
    throw new Error(`Invalid ${label}: ${id}`);
  }
  return id;
}

// ── Response Types ─────────────────────────────────────────

interface PaginatedConversationsResponse {
  success: boolean;
  data: {
    data: Conversation[];
    path: string;
    per_page: number;
    next_cursor: string | null;
    next_page_url: string | null;
    prev_cursor: string | null;
    prev_page_url: string | null;
  };
  meta: {
    has_more: boolean;
    next_cursor: string | null;
  };
}

interface SingleConversationResponse {
  success: boolean;
  data: Conversation;
}

interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    has_more: boolean;
  };
}

interface SingleMessageResponse {
  success: boolean;
  data: Message;
}

interface PresenceResponse {
  success: boolean;
  data: PresenceInfo[];
}

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  currency: string;
  thumbnail: string | null;
  in_stock: boolean;
}

interface RecommendedProductsResponse {
  success: boolean;
  data: RecommendedProduct[];
}

// ── Conversations ──────────────────────────────────────────

export async function getSellerConversations(params?: {
  status?: string;
  q?: string;
  per_page?: number;
  page?: number;
}): Promise<{ data: Conversation[]; has_more: boolean; next_cursor: string | null }> {
  const res = await api.get<PaginatedConversationsResponse>("seller/conversations", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
  return {
    data: res.data.data,
    has_more: res.meta?.has_more ?? false,
    next_cursor: res.meta?.next_cursor ?? null,
  };
}

export async function getSellerConversation(
  id: string,
): Promise<Conversation> {
  const res = await api.get<SingleConversationResponse>(`seller/conversations/${_validateId(id, "conversation_id")}`);
  return res.data;
}

// ── Messages ───────────────────────────────────────────────

export async function getSellerMessages(
  convId: string,
  params?: { before_id?: string; limit?: number },
): Promise<{ messages: Message[]; has_more: boolean }> {
  const id = _validateId(convId, "conversation_id");
  const res = await api.get<MessagesResponse>(
    `seller/conversations/${id}/messages`,
    {
      params: params as Record<string, string | number | boolean | undefined>,
    },
  );
  return res.data;
}

/**
 * Send a text message, optionally with file attachments.
 * Uses direct fetch for FormData because api.post() sets Content-Type: application/json.
 */
export async function sendSellerMessage(
  convId: string,
  body: string,
  attachments?: File[],
): Promise<SingleMessageResponse> {
  const id = _validateId(convId, "conversation_id");
  if (attachments?.length) {
    const formData = new FormData();
    formData.append("body", body);
    attachments.forEach((f) => formData.append("attachments[]", f));

    const token = _getToken();
    const baseUrl = _getBaseUrl();

    const res = await fetch(
      `${baseUrl}seller/conversations/${id}/messages`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Send failed" }));
      throw new Error(
        (err as Record<string, string>).message ?? "Envoi échoué",
      );
    }
    return res.json() as Promise<SingleMessageResponse>;
  }

  return api.post<SingleMessageResponse>(
    `seller/conversations/${id}/messages`,
    { body },
  );
}

export async function sendSellerProductCard(
  convId: string,
  productId: string,
  body?: string,
): Promise<SingleMessageResponse> {
  const id = _validateId(convId, "conversation_id");
  _validateId(productId, "product_id");
  return api.post<SingleMessageResponse>(
    `seller/conversations/${id}/product-card`,
    { product_id: productId, ...(body ? { body } : {}) },
  );
}

// ── Actions ────────────────────────────────────────────────

export async function markSellerRead(
  convId: string,
  lastReadMessageId: string,
): Promise<void> {
  const id = _validateId(convId, "conversation_id");
  await api.post(`seller/conversations/${id}/read`, {
    last_read_message_id: lastReadMessageId,
  });
}

export async function sendSellerTyping(convId: string): Promise<void> {
  await api.post(`seller/conversations/${_validateId(convId, "conversation_id")}/typing`);
}

export async function getSellerPresence(
  convId: string,
): Promise<PresenceInfo[]> {
  const res = await api.get<PresenceResponse>(
    `seller/conversations/${_validateId(convId, "conversation_id")}/presence`,
  );
  return res.data;
}

export async function reportSellerMessage(
  convId: string,
  msgId: string,
  reason: string,
): Promise<{ data: { report_id: string } }> {
  const id = _validateId(convId, "conversation_id");
  _validateId(msgId, "message_id");
  return api.post<{ data: { report_id: string } }>(
    `seller/conversations/${id}/messages/${msgId}/report`,
    { reason },
  );
}

export async function closeConversation(convId: string): Promise<void> {
  await api.post(`seller/conversations/${_validateId(convId, "conversation_id")}/close`);
}

export async function blockConversation(convId: string): Promise<void> {
  await api.post(`seller/conversations/${_validateId(convId, "conversation_id")}/block`);
}

export async function getRecommendedProducts(
  convId: string,
): Promise<RecommendedProduct[]> {
  const res = await api.get<RecommendedProductsResponse>(
    `conversations/${_validateId(convId, "conversation_id")}/recommended-products`,
  );
  return res.data;
}

// ── Internal helpers ───────────────────────────────────────

function _getToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function _getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return base.endsWith("/") ? base : `${base}/`;
}
