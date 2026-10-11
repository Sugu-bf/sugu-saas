import { describeFailureWith, type Failure } from "@/lib/http/failure";
import { mapSuguCodeToMessage } from "@/lib/http/sugu-error-mapper";

export type { Failure } from "@/lib/http/failure";

// What to tell the agency when one of its requests fails. The sentences of
// the backend are shown when it wrote them for the user; a bare SUGU code is
// mapped to its sentence and never shown (see sugu-error-mapper).

const WORDING = {
  not_found: "Cet élément est introuvable, ou n'appartient pas à votre agence.",
  conflict: "L'état de la livraison a changé. Actualisez la page avant de réessayer.",
  refused: "Cette action n'est pas possible dans l'état actuel de la livraison.",
  forbidden: "Cette action est réservée au responsable de l'agence.",
} as const;

export function describeAgencyFailure(error: unknown): Failure {
  return describeFailureWith(error, WORDING);
}

/** The sentence of a refusal listed by a bulk change: its `reason` is a code, not a text. */
export function describeRejection(reason: string): string {
  return mapSuguCodeToMessage(reason);
}
