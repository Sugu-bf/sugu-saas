import { describeFailure as describeOrderFailure, type Failure } from "@/features/vendor/orders/errors";

// What to tell the seller when a catalogue request fails. Same rules as for
// orders (a 4xx sentence written for the user is shown, a 5xx or a network
// failure gets a neutral one); only the sentences naming the object differ.

const CATALOGUE: Partial<Record<Failure["kind"], string>> = {
  not_found: "Ce produit est introuvable.",
  conflict: "Le produit a changé entre-temps. Actualisez la page avant de réessayer.",
  refused: "Cette action n'est pas possible sur ce produit.",
};

/** Sentences of the order domain that must not surface here. */
const ORDER_WORDED = /commande/i;

export function describeFailure(error: unknown): Failure {
  const failure = describeOrderFailure(error);
  const own = CATALOGUE[failure.kind];
  return own && ORDER_WORDED.test(failure.message) ? { ...failure, message: own } : failure;
}

export type { Failure };
