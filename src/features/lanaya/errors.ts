import { ApiError } from "@/lib/http/api-error";
import { describeFailureWith, type Failure } from "@/lib/http/failure";

export type { Failure } from "@/lib/http/failure";

// What to tell a Lanabaga, a candidate or a seller when a Lanaya request
// fails. The backend writes its refusals for the user ("SUGU-LANAYA-…: …");
// the code prefix is removed by the mapper and never shown.

const WORDING = {
  not_found: "Cet élément est introuvable, ou ne vous appartient pas.",
  conflict: "La situation a changé entre-temps. Actualisez la page avant de réessayer.",
  refused: "Cette action n'est pas possible dans l'état actuel de votre dossier.",
  forbidden: "Cette action ne vous est pas ouverte pour le moment.",
} as const;

export function describeLanayaFailure(error: unknown): Failure {
  // The private disk of the documents is down: say that, not "the server".
  if (error instanceof ApiError && error.code === "SUGU-LANAYA-STORAGE-UNAVAILABLE") {
    return { kind: "server", message: "Le dépôt de pièces est momentanément indisponible. Réessayez plus tard.", fields: {} };
  }
  return describeFailureWith(error, WORDING);
}
