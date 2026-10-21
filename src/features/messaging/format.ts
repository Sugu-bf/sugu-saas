import type { Conversation, LastActive, Message, Presence, Profile } from "./contract";

// ============================================================
// Words and dates of messaging. Every date is shown in the reader's
// own time zone; `now` is a parameter so that a test can fix it.
// ============================================================

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const SHORT_DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const SHORT_DAY_YEAR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const LONG_DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const LONG_DAY_YEAR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function dateOf(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const daysBetween = (date: Date, now: Date) => Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

export const formatClock = (iso: string | null | undefined): string => {
  const date = dateOf(iso);
  return date ? TIME.format(date) : "";
};

/** Date of a list row: the time today, « Hier », then the day. */
export function formatListDate(iso: string | null | undefined, now: Date = new Date()): string {
  const date = dateOf(iso);
  if (!date) return "";
  const days = daysBetween(date, now);
  if (days <= 0) return TIME.format(date);
  if (days === 1) return "Hier";
  return date.getFullYear() === now.getFullYear() ? SHORT_DAY.format(date) : SHORT_DAY_YEAR.format(date);
}

/** Heading of a day in a thread. */
export function formatDayHeading(iso: string, now: Date = new Date()): string {
  const date = dateOf(iso);
  if (!date) return "";
  const days = daysBetween(date, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  const text = date.getFullYear() === now.getFullYear() ? LONG_DAY.format(date) : LONG_DAY_YEAR.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const dayKey = (iso: string): string => {
  const date = dateOf(iso);
  return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : iso;
};

export function formatFullDate(iso: string | null | undefined): string {
  const date = dateOf(iso);
  return date ? `${SHORT_DAY_YEAR.format(date)} à ${TIME.format(date)}` : "";
}

/** « Il y a 2 h », then the day. */
export function formatSince(iso: string | null | undefined, now: Date = new Date()): string {
  const date = dateOf(iso);
  if (!date) return "";
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 24 * 60 && daysBetween(date, now) <= 0) return `Il y a ${Math.floor(minutes / 60)} h`;
  return formatListDate(iso, now);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

const PEER_WORD = { customer: "Client", store: "Boutique", courier: "Coursier", lanabaga: "Lanabaga", unknown: "Conversation" } as const;

/** What a conversation is called in a list and at the top of a thread. */
export function titleOf(conversation: Conversation, profile: Profile): string {
  const word = PEER_WORD[conversation.peer.type];
  if (profile === "vendor") return conversation.peer.type === "courier" || conversation.peer.type === "lanabaga" ? `${word} · ${conversation.peer.name}` : conversation.peer.name;
  // A courier and an agency think in deliveries: the order number names the exchange.
  if (conversation.orderNumber) return profile === "agency" ? conversation.orderNumber : `${word} – ${conversation.orderNumber}`;
  return conversation.peer.name;
}

/** Title of an open thread: the agency reads « Client – SU-… » too. */
export function threadTitleOf(conversation: Conversation, profile: Profile): string {
  if (profile === "agency" && conversation.orderNumber) return `${PEER_WORD[conversation.peer.type]} – ${conversation.orderNumber}`;
  return titleOf(conversation, profile);
}

/** Second line of an agency row: who the courier talks to, and which courier. */
export function agencyRowDetail(conversation: Conversation): string {
  const word = PEER_WORD[conversation.peer.type];
  return conversation.courier ? `${word} · ${conversation.courier.name}` : `${word} · ${conversation.peer.name}`;
}

/** Preview of the last message, as a list row shows it. */
export function previewOf(conversation: Conversation, profile: Profile): { text: string; kind: "text" | "image" | "file" | "product" | "none" } {
  const last = conversation.lastMessage;
  if (!last) return { text: "Aucun message", kind: "none" };
  if (last.hidden) return { text: "Message masqué par la modération", kind: "none" };

  const mine = profile === "vendor" ? last.senderType === "seller" : profile === "courier" ? last.senderType === "courier" : profile === "lanabaga" ? last.senderType === "lanabaga" : false;
  const prefix = mine ? "Vous : " : "";

  if (last.type === "product_card") return { text: `${prefix}${last.body || "Produit partagé"}`, kind: "product" };
  if (last.body.trim() !== "") return { text: `${prefix}${last.body}`, kind: "text" };
  if (last.attachmentKind === "image") return { text: `${prefix}Photo`, kind: "image" };
  if (last.attachmentKind === "file") return { text: `${prefix}Pièce jointe`, kind: "file" };
  return { text: "Message", kind: "text" };
}

const LAST_ACTIVE: Record<LastActive, string> = {
  now: "En ligne",
  recently: "Actif il y a moins d'une heure",
  today: "Actif aujourd'hui",
  long_ago: "Hors ligne",
  never: "Hors ligne",
};

/**
 * Presence as Laravel knows it: someone is "online" when one of their
 * requests reached the server in the last five minutes. Said as such, and
 * said nothing at all when the server did not answer.
 */
export function presenceLabel(presence: Presence | null | undefined): { text: string; online: boolean } | null {
  if (!presence) return null;
  return presence.online ? { text: "En ligne", online: true } : { text: LAST_ACTIVE[presence.lastActive], online: false };
}

const STATUS_NOTICE: Record<string, string> = {
  closed: "Cette conversation est fermée. Aucun message ne peut y être envoyé.",
  blocked: "Cette conversation est bloquée. Aucun message ne peut y être envoyé.",
};

/** Why nothing can be written, when the server says so. */
export const closedNotice = (conversation: Conversation): string | null => (conversation.can.send ? null : (STATUS_NOTICE[conversation.status] ?? "Vous ne pouvez pas écrire dans cette conversation."));

/** Who wrote a message, for a screen reader and for the agency, which reads both sides. */
export function senderLabel(message: Message): string {
  if (message.senderType === "system") return "Système";
  return message.senderName;
}
