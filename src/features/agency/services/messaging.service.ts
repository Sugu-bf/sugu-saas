/**
 * Messaging Service — Agency Endpoints (READ-ONLY)
 * Handles: GET /agency/{agencyId}/conversations, messages
 * The agency supervisory view — no POST endpoints.
 */
import { api } from "@/lib/http/client";
import type { Conversation, Message } from "@/lib/messaging/types";

// ── ID Validation (prevent path injection) ─────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _validateId(id: string, label = "ID"): string {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid ${label}: ${id}`);
  }
  return id;
}

// ── Response Types ─────────────────────────────────────────

interface PaginatedConversationsResponse {
  success: boolean;
  data: Conversation[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
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

// ── Conversations ──────────────────────────────────────────

export async function getAgencyConversations(
  agencyId: string,
  params?: {
    status?: string;
    courier_id?: string;
    q?: string;
    per_page?: number;
    page?: number;
  },
): Promise<PaginatedConversationsResponse> {
  const id = _validateId(agencyId, "agency_id");
  return api.get<PaginatedConversationsResponse>(
    `agency/${id}/conversations`,
    {
      params: params as Record<string, string | number | boolean | undefined>,
    },
  );
}

export async function getAgencyConversation(
  agencyId: string,
  conversationId: string,
): Promise<SingleConversationResponse> {
  const aId = _validateId(agencyId, "agency_id");
  const cId = _validateId(conversationId, "conversation_id");
  return api.get<SingleConversationResponse>(
    `agency/${aId}/conversations/${cId}`,
  );
}

// ── Messages ───────────────────────────────────────────────

export async function getAgencyMessages(
  agencyId: string,
  conversationId: string,
  params?: { before_id?: string; limit?: number },
): Promise<MessagesResponse> {
  const aId = _validateId(agencyId, "agency_id");
  const cId = _validateId(conversationId, "conversation_id");
  return api.get<MessagesResponse>(
    `agency/${aId}/conversations/${cId}/messages`,
    {
      params: params as Record<string, string | number | boolean | undefined>,
    },
  );
}
