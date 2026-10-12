import type { FailureCode } from "./api";
import type { MissionAction, MissionScope } from "./contract";

// The words of the courier space: what a list is called, what a button says,
// why an action is held. One place, so that a card, a page and a dialog never
// name the same thing twice.

export const SCOPE_LABEL: Record<MissionScope, string> = {
  offered: "Disponibles",
  in_progress: "En cours",
  done: "Terminées",
};

/** The button of each action, as the courier says it. */
export const ACTION_LABEL: Record<MissionAction, string> = {
  accept: "Accepter",
  refuse: "Refuser la mission",
  confirm_collection: "Confirmer la collecte",
  start_transit: "Démarrer la livraison",
  mark_arrived: "Confirmer l'arrivée",
  mark_delivered: "J'ai livré le colis",
  signal_delay: "Signaler un retard",
  mark_failed: "Signaler un échec",
};

/** Said once the server has accepted the action. */
export const ACTION_DONE: Record<MissionAction, string> = {
  accept: "Mission acceptée.",
  refuse: "Mission refusée : elle est rendue à votre agence.",
  confirm_collection: "Collecte confirmée.",
  start_transit: "Livraison démarrée.",
  mark_arrived: "Arrivée confirmée.",
  mark_delivered: "Colis remis : la mission est terminée.",
  signal_delay: "Retard signalé à votre agence.",
  mark_failed: "Échec de livraison signalé.",
};

/** Why the next action is held, as `blocked_actions` codes it. */
const BLOCKED: Record<string, string> = {
  COLLECTION_PENDING: "Confirmez d'abord la collecte auprès de chaque boutique.",
  DELIVERY_FEE_UNPAID: "Le client n'a pas encore réglé les frais de livraison : la course ne peut pas démarrer.",
  FEES_UNPAID: "Le client n'a pas encore tout réglé : le colis ne peut pas être remis.",
  ALREADY_COLLECTED: "Vous avez déjà collecté un colis : la mission ne peut plus être refusée.",
};

export function blockedReason(code: string | undefined): string | null {
  if (!code) return null;
  return BLOCKED[code] ?? "Cette étape n'est pas possible pour le moment.";
}

export const FAILURE_LABEL: Record<FailureCode, string> = {
  NO_ANSWER: "Le client ne répond pas",
  WRONG_ADDRESS: "Adresse introuvable ou incorrecte",
  CLIENT_REFUSED: "Le client refuse le colis",
  OUT_OF_COVERAGE: "Adresse hors de ma zone",
  RESCHEDULED: "Le client demande un autre jour",
};

/** The reason of a failure, for a code this screen may not know. */
export function failureLabel(code: string | null): string | null {
  if (!code) return null;
  return (FAILURE_LABEL as Record<string, string>)[code] ?? null;
}
