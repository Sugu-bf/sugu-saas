import { ApiError } from "@/lib/http/api-error";
import { mapSuguErrorMessage } from "@/lib/http/sugu-error-mapper";

// ============================================================
// What to tell the seller when an order request fails.
//
// The backend refuses a transition with 400 (wrong status), 422
// (business rule, e.g. unpaid COD Mixte fees), 403, 404 or 409, each
// with a French sentence meant for the user. 5xx and network failures
// carry nothing usable: they get a neutral message, never the raw one.
// ============================================================

export type FailureKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "refused"
  | "server";

export interface Failure {
  kind: FailureKind;
  /** Safe to display. */
  message: string;
  /** Field errors of a 422, first message per field. */
  fields: Record<string, string>;
}

const NEUTRAL: Record<FailureKind, string> = {
  network: "Connexion impossible. Vérifiez votre réseau puis réessayez.",
  unauthorized: "Votre session a expiré. Reconnectez-vous.",
  forbidden: "Vous n'avez pas le droit d'effectuer cette action.",
  not_found: "Cette commande est introuvable.",
  conflict: "L'état de la commande a changé. Actualisez la page avant de réessayer.",
  validation: "Certaines informations sont incorrectes.",
  refused: "Cette action n'est pas possible dans l'état actuel de la commande.",
  server: "Le serveur a rencontré un problème. Réessayez dans un instant.",
};

function kindOf(status: number): FailureKind {
  if (status === 0) return "network";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status >= 500) return "server";
  return "refused";
}

/** Kinds whose backend sentence is written for the user and worth showing. */
const BACKEND_MESSAGE_KINDS: FailureKind[] = ["forbidden", "conflict", "validation", "refused"];

export function describeFailure(error: unknown): Failure {
  if (!(error instanceof ApiError)) {
    return { kind: "server", message: NEUTRAL.server, fields: {} };
  }

  const kind = kindOf(error.status);
  const fields: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.errors ?? {})) {
    if (messages[0]) fields[field] = messages[0];
  }

  const backendMessage = error.message && !/^HTTP \d+/.test(error.message) ? mapSuguErrorMessage(error) : null;
  const message = BACKEND_MESSAGE_KINDS.includes(kind) && backendMessage ? backendMessage : NEUTRAL[kind];

  return { kind, message, fields };
}
