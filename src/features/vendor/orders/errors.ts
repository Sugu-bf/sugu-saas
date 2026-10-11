import { describeFailureWith, type Failure } from "@/lib/http/failure";

// ============================================================
// What to tell the seller when an order request fails.
//
// The backend refuses a transition with 400 (wrong status), 422
// (business rule, e.g. unpaid COD Mixte fees), 403, 404 or 409, each
// with a French sentence meant for the user. 5xx and network failures
// carry nothing usable: they get a neutral message, never the raw one.
// ============================================================

export type { Failure, FailureKind } from "@/lib/http/failure";

/** The neutral messages, worded for an order. */
const WORDING = {
  not_found: "Cette commande est introuvable.",
  conflict: "L'état de la commande a changé. Actualisez la page avant de réessayer.",
  refused: "Cette action n'est pas possible dans l'état actuel de la commande.",
} as const;

export function describeFailure(error: unknown): Failure {
  return describeFailureWith(error, WORDING);
}
