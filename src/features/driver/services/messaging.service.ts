import { api } from "@/lib/http/client";
import type { Conversation, Message, PresenceInfo } from "@/lib/messaging/types";

// ── ID Validation ─────────
const ID_RE = /^[0-9a-z]{26}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function _validateId(id: string, label = "ID"): string {
  if (!ID_RE.test(id)) throw new Error(`Invalid ${label}: ${id}`);
  return id;
}

// ── Response Types ────────
interface PaginatedConversationsResponse {
  success: boolean;
  data: { data: Conversation[]; };
  meta: { has_more: boolean; next_cursor: string | null; };
}
interface SingleConversationResponse { success: boolean; data: Conversation; }
interface MessagesResponse { success: boolean; data: { messages: Message[]; has_more: boolean; }; }
interface SingleMessageResponse { success: boolean; data: Message; }
interface PresenceResponse { success: boolean; data: PresenceInfo[]; }
export interface RecommendedProduct { id: string; name: string; slug: string; price: number; compare_price: number | null; currency: string; thumbnail: string | null; in_stock: boolean; }
interface RecommendedProductsResponse { success: boolean; data: RecommendedProduct[]; }

// ── Conversations ────────
export async function getCourierConversations(params?: Record<string, string | number | boolean | undefined>) {
  const res = await api.get<PaginatedConversationsResponse>("courier/conversations", { params });
  return { data: res.data.data, has_more: res.meta?.has_more ?? false, next_cursor: res.meta?.next_cursor ?? null };
}

export async function getCourierConversation(id: string) {
  const res = await api.get<SingleConversationResponse>(`courier/conversations/${_validateId(id)}`);
  return res.data;
}

// ── Messages ────────
export async function getCourierMessages(convId: string, params?: Record<string, string | number | boolean | undefined>) {
  const res = await api.get<MessagesResponse>(`courier/conversations/${_validateId(convId)}/messages`, { params });
  return res.data;
}

export async function sendCourierMessage(convId: string, body: string, attachments?: File[]) {
  const id = _validateId(convId);
  if (attachments?.length) {
    const formData = new FormData();
    formData.append("body", body);
    attachments.forEach((f) => formData.append("attachments[]", f));
    let token = "";
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
      token = match ? decodeURIComponent(match[1]) : "";
    }
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const baseUrl = base.endsWith("/") ? base : `${base}/`;
    const res = await fetch(`${baseUrl}courier/conversations/${id}/messages`, {
      method: "POST", headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: formData,
    });
    if (!res.ok) throw new Error("Envoi échoué");
    return res.json() as Promise<SingleMessageResponse>;
  }
  return api.post<SingleMessageResponse>(`courier/conversations/${id}/messages`, { body });
}

export async function sendCourierProductCard(convId: string, productId: string, body?: string) {
  return api.post<SingleMessageResponse>(`courier/conversations/${_validateId(convId)}/product-card`, { product_id: productId, body });
}

// ── Actions ────────
export async function markCourierRead(convId: string, lastRead: string) {
  await api.post(`courier/conversations/${_validateId(convId)}/read`, { last_read_message_id: lastRead });
}

export async function sendCourierTyping(convId: string) {
  await api.post(`courier/conversations/${_validateId(convId)}/typing`);
}

export async function getCourierPresence(convId: string) {
  const res = await api.get<PresenceResponse>(`courier/conversations/${_validateId(convId)}/presence`);
  return res.data;
}

export async function reportCourierMessage(convId: string, msgId: string, reason: string) {
  return api.post(`courier/conversations/${_validateId(convId)}/messages/${msgId}/report`, { reason });
}

export async function closeConversation(convId: string) {
  await api.post(`courier/conversations/${_validateId(convId)}/close`);
}

export async function blockConversation(convId: string) {
  await api.post(`courier/conversations/${_validateId(convId)}/block`);
}

export async function getRecommendedProducts(convId: string) {
  const res = await api.get<RecommendedProductsResponse>(`conversations/${_validateId(convId)}/recommended-products`);
  return res.data;
}
