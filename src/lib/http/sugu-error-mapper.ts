/**
 * Maps backend errors to user-facing French messages.
 *
 * The Sugu backend prefixes business-rule errors in the `message` field as
 * `"SUGU-CODE: texte FR"` (HTTP 422 / 403) — see the backend source of truth
 * `docs/ERROR_CODES.md`. The technical prefix must NEVER reach the end user.
 *
 * Strategy:
 *  - Known SUGU codes → curated French message (single source for all dashboards).
 *  - Unknown SUGU codes → strip the prefix, show the backend French text.
 *  - No SUGU prefix → show the message as-is.
 *  - No usable message → generic fallback.
 *
 * Only the two codes that actually reach sugu-saas endpoints are mapped here
 * (mark-delivered / shipment status / bulk-status). The six confirm-stock
 * codes are not reachable from these dashboards. Add a code here the day a
 * screen starts hitting an endpoint that can emit it.
 */

/** Matches a leading `SUGU-XXX:` prefix, tolerant of optional whitespace after the colon. */
const SUGU_PREFIX_RE = /^(SUGU-[A-Z0-9-]+):\s*([\s\S]*)$/;

const GENERIC_FALLBACK = "Une erreur est survenue, veuillez réessayer.";

/** Curated FR messages for the SUGU codes reachable from sugu-saas. */
export const SUGU_MESSAGES: Record<string, string> = {
  "SUGU-COD-MIXTE-FEES-UNPAID":
    "Les frais de livraison et les frais produit doivent être réglés avant de marquer la commande comme livrée.",
  "SUGU-DELIVERY-CODE-NOT-VERIFIED":
    "La livraison ne peut pas être finalisée : le client n'a pas encore confirmé la réception avec son code de livraison.",
};

/** Extract a usable message string from any thrown value. */
function extractMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error.trim() || null;
  }
  if (error instanceof Error) {
    return error.message?.trim() || null;
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    return typeof msg === "string" ? msg.trim() || null : null;
  }
  return null;
}

/**
 * Turn any error into a clean French message safe to show to the user.
 *
 * @param error - an `ApiError`, a plain `Error`, a raw string, or anything.
 * @returns a user-facing FR message; never exposes a raw `SUGU-XXX:` prefix.
 */
export function mapSuguErrorMessage(error: unknown): string {
  const message = extractMessage(error);
  if (!message) return GENERIC_FALLBACK;

  const match = SUGU_PREFIX_RE.exec(message);
  if (!match) {
    // No SUGU prefix → backend message is already user-facing.
    return message;
  }

  const [, code, rawText] = match;
  const known = SUGU_MESSAGES[code];
  if (known) return known;

  // Unknown SUGU code → never leak the prefix; fall back to the backend text.
  const text = rawText.trim();
  return text || GENERIC_FALLBACK;
}
