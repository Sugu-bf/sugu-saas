import type { Message } from "./contract";

// ============================================================
// The thread as it is shown: what the server holds, then what has
// left this screen and is not confirmed yet.
//
// Three rules, kept here so they can be tested without a screen:
//   1. a message exists once, whatever brought it (a page, the
//      answer to a send, a refetch after an event);
//   2. the order is the server's (time, then identifier), and a
//      message waiting for its confirmation stays last;
//   3. a waiting message disappears the moment the server answers
//      one carrying its client identifier, even if the answer to
//      the send itself never came back.
// ============================================================

export type PendingState = "sending" | "failed";

export interface PendingMessage {
  /** UUID sent with the message; the same on every retry. */
  clientId: string;
  kind: "message" | "product";
  body: string;
  files: File[];
  productId: string | null;
  productName: string | null;
  state: PendingState;
  /** Why the last attempt failed, in words for the user. */
  error: string | null;
  /** False when sending again cannot succeed (refused by a rule). */
  retryable: boolean;
  createdAt: string;
}

/** Server messages of every loaded page, once each, oldest first. */
export function mergeMessages(pages: Message[][]): Message[] {
  const byId = new Map<string, Message>();
  for (const page of pages) {
    for (const message of page) byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.at < b.at ? -1 : 1));
}

/** What is still waiting: nothing the server already answered. */
export function stillPending(pending: PendingMessage[], confirmed: Message[]): PendingMessage[] {
  const known = new Set(confirmed.map((message) => message.clientId).filter((id): id is string => id !== null));
  return pending.filter((message) => !known.has(message.clientId));
}

/** A new identifier for a message about to be sent. */
export function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Old browsers, or a page served without TLS: same format, from getRandomValues.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * State of a message of the reader, as far as the server tells it.
 * "Delivered" does not exist: nothing reports that a device received it.
 */
export type SentState = "sent" | "read";

export function sentStateOf(message: Message, peerLastReadId: string | null): SentState {
  // Identifiers are ULIDs: they order as the messages were written.
  return peerLastReadId !== null && message.id <= peerLastReadId ? "read" : "sent";
}
