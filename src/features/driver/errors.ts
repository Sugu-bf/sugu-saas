import { ApiError } from "@/lib/http/api-error";
import { describeFailureWith, type Failure } from "@/lib/http/failure";

export type { Failure } from "@/lib/http/failure";

// What to tell the courier when one of their requests fails. The sentences
// of the backend are shown when it wrote them for the user.

const WORDING = {
  not_found: "Cette mission est introuvable, ou n'est plus la vôtre.",
  conflict: "L'état de la mission a changé. Actualisez avant de réessayer.",
  refused: "Cette action n'est pas possible dans l'état actuel de la mission.",
} as const;

export function describeDriverFailure(error: unknown): Failure {
  return describeFailureWith(error, WORDING);
}

/**
 * The server refused because the courier cannot work (`courier.operational`):
 * documents not approved yet, or account suspended. A business refusal, not
 * an expired session: the courier is shown their file, not the sign-in page.
 */
export function isNotOperational(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && (error.code === "COURIER_KYC_PENDING" || error.code === "COURIER_NOT_ACTIVE" || error.code === "COURIER_PROFILE_NOT_FOUND");
}
