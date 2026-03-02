/**
 * Tickets Service
 * Handles: GET/POST /sellers/support/tickets — real API calls + transformers
 *
 * Endpoints:
 *   GET  /support/tickets                   → list (paginated)
 *   GET  /support/tickets/{id}              → detail
 *   GET  /support/tickets/{id}/messages     → messages
 *   POST /support/tickets                   → create
 *   POST /support/tickets/{id}/messages     → send message (multipart)
 *   POST /support/tickets/{id}/close        → close ticket
 */
import {
  vendorTicketsResponseSchema,
  ticketMessageSchema,
  type VendorTicketsResponse,
  type VendorTicket,
  type TicketMessage,
  type CreateTicketRequest,
} from "../schema";
import { api } from "@/lib/http/client";
import { initials } from "./_shared";

// ── Raw API Types ──────────────────────────────────────────

interface RawTicketListItem {
  id: string;
  ticket_number?: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  store_id?: string;
  customer_id?: string;
  last_message_at?: string | null;
  created_at?: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  messages_count?: number;
  customer?: { id?: string; name?: string; email?: string };
  store?: { id?: string; name?: string };
  assigned_admin?: { id?: string; name?: string } | null;
}

interface RawTicketDetail {
  id: string;
  ticket_number?: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  store_id?: string;
  customer_id?: string;
  assigned_admin_id?: string | null;
  last_message_at?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at?: string;
  customer?: { id?: string; name?: string; email?: string; phone_e164?: string };
  store?: { id?: string; name?: string; slug?: string };
  order?: unknown;
  assignedAdmin?: { id?: string; name?: string; email?: string } | null;
}

interface RawMessage {
  id: string;
  sender_type?: string;
  sender_name?: string;
  body?: string;
  attachments?: Array<{ id?: number; name?: string; url?: string; size?: number; mime?: string }>;
  created_at?: string;
}

interface RawPaginatedResponse {
  data: RawTicketListItem[];
  links?: Record<string, unknown>;
  meta?: {
    current_page?: number;
    from?: number;
    last_page?: number;
    per_page?: number;
    to?: number;
    total?: number;
  };
}

// ── Status / Priority Mappers ──────────────────────────────

function _mapStatus(backendStatus: string): "open" | "pending" | "resolved" {
  switch (backendStatus) {
    case "open":              return "open";
    case "pending_customer":  return "pending";
    case "pending_internal":  return "pending";
    case "escalated":         return "open";
    case "resolved":          return "resolved";
    case "closed":            return "resolved";
    default:                  return "open";
  }
}

function _mapStatusLabel(backendStatus: string): string {
  switch (backendStatus) {
    case "open":              return "Ouvert";
    case "pending_customer":  return "En attente";
    case "pending_internal":  return "En attente";
    case "escalated":         return "Escaladé";
    case "resolved":          return "Résolu";
    case "closed":            return "Fermé";
    default:                  return "Ouvert";
  }
}

function _mapPriority(backendPriority: string): "urgent" | "normal" | "low" {
  switch (backendPriority) {
    case "urgent":  return "urgent";
    case "high":    return "urgent";
    case "medium":  return "normal";
    case "low":     return "low";
    default:        return "normal";
  }
}

function _mapPriorityLabel(priority: "urgent" | "normal" | "low"): string {
  switch (priority) {
    case "urgent": return "Urgent";
    case "normal": return "Normal";
    case "low":    return "Bas";
  }
}

// ── Time Helpers ───────────────────────────────────────────

function _formatTimeAgo(isoDate: string): string {
  try {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffD = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1)  return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffH < 24)   return `il y a ${diffH}h`;
    if (diffD === 1)  return "1 jour";
    if (diffD < 30)   return `${diffD} jours`;
    return `${Math.floor(diffD / 30)} mois`;
  } catch {
    return "";
  }
}

function _formatTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// ── Transformers ───────────────────────────────────────────

function _transformTicketListItem(raw: RawTicketListItem): Record<string, unknown> {
  const status = _mapStatus(raw.status ?? "open");
  const priority = _mapPriority(raw.priority ?? "medium");
  const lastMessageAt = raw.last_message_at ?? raw.created_at ?? "";

  return {
    id: String(raw.id),
    reference: `#${raw.ticket_number ?? raw.id}`,
    subject: raw.subject ?? "",
    preview: (raw.description ?? "").slice(0, 100),
    status,
    statusLabel: _mapStatusLabel(raw.status ?? "open"),
    priority,
    priorityLabel: _mapPriorityLabel(priority),
    messageCount: raw.messages_count ?? 0,
    timeAgo: _formatTimeAgo(lastMessageAt),
    assignee: raw.assigned_admin?.name ?? "Non assigné",
    messages: [], // Messages loaded separately via useTicketMessages
  };
}

function _transformMessage(raw: RawMessage): Record<string, unknown> {
  const senderType = raw.sender_type ?? "customer";
  const senderName = raw.sender_name ?? "Utilisateur";

  return {
    id: String(raw.id),
    senderName,
    senderRole: (senderType === "customer" || senderType === "seller") ? "vendor" : "support",
    senderInitials: initials(senderName),
    senderAvatarColor:
      senderType === "customer" || senderType === "seller"
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700",
    time: _formatTime(raw.created_at ?? ""),
    text: raw.body ?? "",
    attachment: raw.attachments?.[0]?.name ?? null,
  };
}

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch vendor support tickets (paginated, filterable).
 * Calculates counts client-side from a separate unfiltered request.
 */
export async function getVendorTickets(
  status?: string,
  page?: number,
  search?: string,
): Promise<VendorTicketsResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: page ?? 1,
    per_page: 50,
  };
  if (status && status !== "all") {
    // Map frontend status to backend status
    const statusMap: Record<string, string> = {
      open: "open",
      pending: "pending_customer",
      resolved: "resolved",
    };
    params.status = statusMap[status] ?? status;
  }
  if (search) {
    params.search = search;
  }

  // Fetch tickets from API
  const res = await api.get<RawPaginatedResponse>("sellers/support/tickets", { params });

  const rawTickets = res.data ?? [];
  const tickets = rawTickets.map((raw) => _transformTicketListItem(raw));

  // Calculate counts from loaded data
  // In a production scenario you'd want a dedicated /tickets/stats endpoint,
  // but the backend doesn't provide one. So we count from the loaded data.
  const allCount = res.meta?.total ?? tickets.length;
  const openCount = tickets.filter((t) => {
    const s = t.status as string;
    return s === "open";
  }).length;
  const resolvedCount = tickets.filter((t) => {
    const s = t.status as string;
    return s === "resolved";
  }).length;

  return vendorTicketsResponseSchema.parse({
    tickets,
    counts: {
      all: allCount,
      open: openCount,
      resolved: resolvedCount,
    },
  });
}

/**
 * Fetch a single ticket detail.
 */
export async function getTicketDetail(ticketId: string): Promise<VendorTicket> {
  const res = await api.get<{ ticket: RawTicketDetail }>(`sellers/support/tickets/${ticketId}`);
  const raw = res.ticket;

  const status = _mapStatus(raw.status ?? "open");
  const priority = _mapPriority(raw.priority ?? "medium");

  const ticket: Record<string, unknown> = {
    id: String(raw.id),
    reference: `#${raw.ticket_number ?? raw.id}`,
    subject: raw.subject ?? "",
    preview: (raw.description ?? "").slice(0, 100),
    status,
    statusLabel: _mapStatusLabel(raw.status ?? "open"),
    priority,
    priorityLabel: _mapPriorityLabel(priority),
    messageCount: 0,
    timeAgo: _formatTimeAgo(raw.last_message_at ?? raw.created_at ?? ""),
    assignee: raw.assignedAdmin?.name ?? "Non assigné",
    messages: [],
  };

  // Import schema at runtime to avoid circular deps
  const { vendorTicketSchema } = await import("../schema");
  return vendorTicketSchema.parse(ticket);
}

/**
 * Fetch messages for a ticket.
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const res = await api.get<{ messages: RawMessage[] }>(
    `sellers/support/tickets/${ticketId}/messages`,
  );

  const rawMessages = res.messages ?? [];
  return rawMessages.map((raw) => ticketMessageSchema.parse(_transformMessage(raw)));
}

/**
 * Create a new support ticket.
 */
export async function createTicket(
  data: CreateTicketRequest,
): Promise<{ message: string; ticket: { id: string; ticket_number: string; status: string } }> {
  return api.post<{
    message: string;
    ticket: { id: string; ticket_number: string; status: string };
  }>("sellers/support/tickets", data);
}

/**
 * Send a message/reply to a ticket.
 * Supports multipart/form-data for file attachments.
 */
export async function sendTicketMessage(
  ticketId: string,
  body: string,
  attachments?: File[],
): Promise<{ message: string; data: { id: string; body: string; created_at: string } }> {
  const hasFiles = attachments && attachments.length > 0;

  if (hasFiles) {
    // Use raw fetch for multipart/form-data
    const fd = new FormData();
    fd.append("body", body);
    attachments!.forEach((file) => {
      fd.append("attachments[]", file);
    });

    const { env } = await import("@/lib/env");
    const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
      ? env.NEXT_PUBLIC_API_BASE_URL
      : `${env.NEXT_PUBLIC_API_BASE_URL}/`;
    const url = new URL(`sellers/support/tickets/${ticketId}/messages`, baseUrl).toString();

    const tokenMatch = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
    const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, { method: "POST", headers, body: fd });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      const { ApiError } = await import("@/lib/http/api-error");
      throw new ApiError({
        message: errorJson.message ?? `HTTP ${response.status}`,
        status: response.status,
        code: errorJson.code ?? `HTTP_${response.status}`,
        errors: errorJson.errors,
      });
    }

    return response.json();
  }

  // No files — standard JSON
  return api.post<{
    message: string;
    data: { id: string; body: string; created_at: string };
  }>(`sellers/support/tickets/${ticketId}/messages`, { body });
}

/**
 * Close a ticket.
 */
export async function closeTicket(
  ticketId: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>(`sellers/support/tickets/${ticketId}/close`);
}
