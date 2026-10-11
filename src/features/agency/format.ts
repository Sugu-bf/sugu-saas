// Dates, durations and links, as the agency screens print them.
// Nothing here knows about a delivery: it only formats what it is given.

export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // A day without an hour ("2026-03-05") is that day here, not midnight in Greenwich.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const DAY_YEAR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const LONG = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const TODAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

/** "08:24", or a dash when the backend sent no usable date. */
export function formatTime(iso: string | null | undefined): string {
  const date = parseDate(iso);
  return date ? TIME.format(date) : "—";
}

/** "24 mars" (the year only when it is not the current one), or a dash. */
export function formatDay(iso: string | null | undefined, now: Date = new Date()): string {
  const date = parseDate(iso);
  if (!date) return "—";
  return date.getFullYear() === now.getFullYear() ? DAY.format(date) : DAY_YEAR.format(date);
}

/** "24 mars, 10:30": a moment in a list or a timeline. */
export function formatDayTime(iso: string | null | undefined, now: Date = new Date()): string {
  const date = parseDate(iso);
  if (!date) return "—";
  return `${formatDay(iso, now)}, ${TIME.format(date)}`;
}

/** "24 mars 2025 à 10:24": the date of a record, spelled out. */
export function formatLongDateTime(iso: string | null | undefined): string {
  const date = parseDate(iso);
  return date ? `${LONG.format(date)} à ${TIME.format(date)}` : "—";
}

/** "12 janvier 2023". */
export function formatLongDate(iso: string | null | undefined): string {
  const date = parseDate(iso);
  return date ? LONG.format(date) : "—";
}

/** "Lun. 24 mars 2025": the day a board is about. */
export function formatToday(now: Date = new Date()): string {
  const text = TODAY.format(now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Il y a 5 min", "Il y a 2 h", "Il y a 3 j", then the date. Null without a usable date. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string | null {
  const date = parseDate(iso);
  if (!date) return null;
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;
  return formatDay(iso, now);
}

/** "28 min", "1 h 05". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes - hours * 60);
  return `${hours} h ${String(rest).padStart(2, "0")}`;
}

/** "Depuis 2 ans", "Depuis 5 mois": how long ago a date was, in the largest unit. */
export function since(iso: string | null | undefined, now: Date = new Date()): string | null {
  const date = parseDate(iso);
  if (!date) return null;
  const months = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth() - (now.getDate() < date.getDate() ? 1 : 0);
  if (months < 1) return "Depuis moins d'un mois";
  if (months < 12) return `Depuis ${months} mois`;
  const years = Math.floor(months / 12);
  return `Depuis ${years} an${years > 1 ? "s" : ""}`;
}

const INTEGER = new Intl.NumberFormat("fr-FR");
const RATE = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export const formatCount = (value: number): string => INTEGER.format(value);

/** "97 %", "96,5 %". */
export const formatRate = (value: number): string => `${RATE.format(value)} %`;

/**
 * « Moussa K. »: the first name and the initial of the last, for a column
 * with no room for a whole name. A single name is left as it is.
 */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

// ── Links ───────────────────────────────────────────────────

const digits = (phone: string) => phone.replace(/[^\d+]/g, "");

export const telHref = (phone: string): string => `tel:${digits(phone)}`;

/** WhatsApp chat with this number; it wants the international form without the plus. */
export const whatsappHref = (phone: string): string => `https://wa.me/${digits(phone).replace(/^\+/, "")}`;

/** A map search for an address, in the map application of the device. */
export const mapsSearchHref = (query: string): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** A map opened on a point. */
export const mapsPointHref = (lat: number, lng: number): string => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
