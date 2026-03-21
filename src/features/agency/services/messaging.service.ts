/**
 * Messaging Service — Agency Endpoints (READ-ONLY)
 * Handles: GET /agency/{agencyId}/conversations, messages
 * The agency supervisory view — no POST endpoints.
 */
import { api } from "@/lib/http/client";
import type { Conversation, Message } from "@/lib/messaging/types";

// ── ID Validation (prevent path injection) ─────────────────

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
    current_page: number;
    data: Conversation[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
  };
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

export interface AgencyConversationsResult {
  data: Conversation[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export async function getAgencyConversations(
  agencyId: string,
  params?: {
    status?: string;
    courier_id?: string;
    q?: string;
    per_page?: number;
    page?: number;
  },
): Promise<AgencyConversationsResult> {
  const id = _validateId(agencyId, "agency_id");
  const res = await api.get<PaginatedConversationsResponse>(
    `agency/${id}/conversations`,
    {
      params: params as Record<string, string | number | boolean | undefined>,
    },
  );
  // Laravel returns paginated shape: { data: { data: [...], total, ... } }
  const page = res.data;
  return {
    data: Array.isArray(page.data) ? page.data : [],
    total: page.total,
    last_page: page.last_page,
    current_page: page.current_page,
    per_page: page.per_page,
  };
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
