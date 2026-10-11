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
 * Only the codes that actually reach sugu-saas endpoints are mapped here
 * (mark-delivered / shipment status / bulk-status, and the agency shipment
 * actions). The six confirm-stock codes are not reachable from these
 * dashboards. Add a code here the day a screen starts hitting an endpoint
 * that can emit it.
 *
 * The agency shipment endpoints answer some refusals with the BARE code as
 * their whole message (`"SUGU-AGENCY-NOT-ACCEPTED"`, no sentence): it is
 * mapped like a prefix, and never shown.
 */

/** Matches a leading `SUGU-XXX:` prefix, tolerant of optional whitespace after the colon. */
const SUGU_PREFIX_RE = /^(SUGU-[A-Z0-9-]+):\s*([\s\S]*)$/;

/** A message that is a code and nothing else. */
const SUGU_BARE_RE = /^SUGU-[A-Z0-9-]+$/;

const GENERIC_FALLBACK = "Une erreur est survenue, veuillez réessayer.";

/** Curated FR messages for the SUGU codes reachable from sugu-saas. */
export const SUGU_MESSAGES: Record<string, string> = {
  "SUGU-COD-MIXTE-FEES-UNPAID":
    "Les frais de livraison et les frais produit doivent être réglés avant de marquer la commande comme livrée.",
  "SUGU-DELIVERY-CODE-NOT-VERIFIED":
    "La livraison ne peut pas être finalisée : le client n'a pas encore confirmé la réception avec son code de livraison.",
  // Agency shipments (AgencyShipmentService).
  "SUGU-AGENCY-NOT-ACCEPTED": "Acceptez d'abord cette livraison : un livreur ne peut lui être assigné qu'ensuite.",
  "SUGU-AGENCY-ALREADY-PROCESSED": "Cette livraison a déjà été acceptée ou refusée.",
  "SUGU-ASSIGN-INVALID-STATUS": "Cette livraison est déjà collectée, en route ou terminée : son livreur ne peut plus être choisi.",
  "SUGU-REASSIGN-TOO-LATE": "Le livreur ne peut plus être changé : la collecte est en cours ou terminée.",
  "SUGU-STATUS-TRANSITION-INVALID": "Ce changement de statut n'est pas possible depuis l'état actuel de la livraison.",
  "SUGU-PRICE-LOCKED": "Le prix ne peut plus être modifié : la livraison est déjà payée.",
  "SUGU-PRICE-CEILING-EXCEEDED": "Ce montant dépasse de trop le prix annoncé au client.",
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

  // The code alone: its sentence if it is known, never the code itself.
  if (SUGU_BARE_RE.test(message)) return SUGU_MESSAGES[message] ?? GENERIC_FALLBACK;

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

/**
 * Maps a BARE SUGU code to a curated French message.
 *
 * Distinct from `mapSuguErrorMessage`: the agency bulk-status endpoint is the
 * only place that exposes SUGU codes in a structured field
 * (`rejected[].reason`) — a plain code with no `": texte"` suffix. Feeding such
 * a code to `mapSuguErrorMessage` would leak it verbatim (the prefix regex
 * needs a colon), so this is the entry point for machine-readable codes.
 *
 * Unknown codes degrade to the generic fallback; the raw code is never shown.
 */
export function mapSuguCodeToMessage(code: string | null | undefined): string {
  if (!code) return GENERIC_FALLBACK;
  return SUGU_MESSAGES[code.trim()] ?? GENERIC_FALLBACK;
}
