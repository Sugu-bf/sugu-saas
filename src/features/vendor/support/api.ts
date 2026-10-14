import { api } from "@/lib/http/client";
import { TICKET_FILTERS, parseCreatedTicket, parseReply, parseReplyPage, parseTicket, parseTicketPage, type NewTicket, type TicketFilter } from "./contract";

// ============================================================
// Support tickets — HTTP calls, all through the BFF. Laravel checks
// that the ticket is tied to one of the seller's stores.
// ============================================================

const BASE = "sellers/support/tickets";
const ID = /^[0-9A-Za-z-]{1,64}$/;

function segment(id: string): string {
  if (!ID.test(id)) throw new Error("Identifiant invalide.");
  return id;
}

export const TICKET_PAGE_SIZE = 15;
export const REPLY_PAGE_SIZE = 30;

export interface TicketQuery {
  filter: TicketFilter;
  search: string;
  page: number;
}

export async function fetchTickets(query: TicketQuery) {
  const params: Record<string, string | number> = { per_page: TICKET_PAGE_SIZE, page: query.page };
  const statuses = TICKET_FILTERS.find((filter) => filter.value === query.filter)?.statuses ?? [];
  if (statuses.length > 0) params.status = statuses.join(",");
  if (query.search.trim()) params.search = query.search.trim();
  return parseTicketPage(await api.get<unknown>(BASE, { params }));
}

export const fetchTicket = async (id: string) => parseTicket(await api.get<unknown>(`${BASE}/${segment(id)}`, { retries: 0 }));

export async function fetchReplies(id: string, beforeId: string | null) {
  const params: Record<string, string | number> = { limit: REPLY_PAGE_SIZE };
  if (beforeId) params.before_id = beforeId;
  return parseReplyPage(await api.get<unknown>(`${BASE}/${segment(id)}/messages`, { params }));
}

/** The server answers the ticket it already holds when the same request comes twice. */
export async function createTicket(values: NewTicket, storeId: string) {
  return parseCreatedTicket(
    await api.post<unknown>(BASE, { subject: values.subject.trim(), description: values.description.trim(), category: values.category, store_id: storeId }),
  );
}

export interface OutgoingReply {
  /** UUID of this reply: sending it again writes nothing more. */
  clientId: string;
  body: string;
  files: File[];
}

export async function sendReply(id: string, reply: OutgoingReply) {
  const form = new FormData();
  form.append("client_message_id", reply.clientId);
  form.append("body", reply.body);
  for (const file of reply.files) form.append("attachments[]", file, file.name);
  return parseReply(await api.post<unknown>(`${BASE}/${segment(id)}/messages`, form, { timeout: reply.files.length > 0 ? 90_000 : 20_000 }));
}

export const closeTicket = (id: string) => api.post<unknown>(`${BASE}/${segment(id)}/close`);
