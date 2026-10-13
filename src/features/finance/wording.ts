import { ArrowUpFromLine, Bike, Building2, CircleHelp, Scale, ShoppingBag, SlidersHorizontal, Smartphone, Undo2, type LucideIcon } from "lucide-react";
import type { Tone } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import { describeFailureWith, type Failure } from "@/lib/http/failure";
import type { FinanceProfile } from "./api";
import type { EntryKind, MethodKind, PayoutMethod, WalletEntry } from "./contract";

// ============================================================
// How money is worded. One place: a screen never names an
// entry, a method or a failure by itself.
// ============================================================

interface KindWording {
  /** Singular, as the title of an entry. */
  label: string;
  /** Plural, as a filter. */
  filter: string;
  icon: LucideIcon;
  tone: Tone | "brand";
}

const KINDS: Record<EntryKind, KindWording> = {
  sale: { label: "Vente", filter: "Ventes", icon: ShoppingBag, tone: "success" },
  delivery: { label: "Livraison", filter: "Livraisons", icon: Bike, tone: "success" },
  withdrawal: { label: "Retrait", filter: "Retraits", icon: ArrowUpFromLine, tone: "brand" },
  withdrawal_released: { label: "Retrait annulé", filter: "Retraits annulés", icon: Undo2, tone: "info" },
  dispute: { label: "Litige", filter: "Litiges", icon: Scale, tone: "danger" },
  adjustment: { label: "Ajustement", filter: "Ajustements", icon: SlidersHorizontal, tone: "info" },
};

/** A kind the server sent and this portal does not know: said as such, never passed off as another. */
const UNKNOWN_KIND: KindWording = { label: "Opération", filter: "Autres", icon: CircleHelp, tone: "neutral" };

export function kindWording(kind: string, profile: FinanceProfile): KindWording {
  const known = (KINDS as Record<string, KindWording | undefined>)[kind];
  if (!known) return UNKNOWN_KIND;
  // A courier is paid for missions: the word of their own screens.
  if (kind === "delivery" && profile === "courier") return { ...known, label: "Mission", filter: "Missions" };
  return known;
}

/** What an entry is called, and the number of what it refers to: "Vente" and "#SU-2026-000123". */
export function entryTitleParts(entry: Pick<WalletEntry, "kind" | "reference">, profile: FinanceProfile): { label: string; number: string | null } {
  const { label } = kindWording(entry.kind, profile);
  const number = entry.reference?.number;
  if (!number) return { label, number: null };
  return { label, number: entry.reference?.type === "order" || entry.reference?.type === "shipment" ? `#${number.replace(/^#/, "")}` : number };
}

/** "Vente #SU-2026-000123", "Retrait PO-AB12CD34", "Ajustement". */
export function entryTitle(entry: Pick<WalletEntry, "kind" | "reference">, profile: FinanceProfile): string {
  const { label, number } = entryTitleParts(entry, profile);
  return number ? `${label} ${number}` : label;
}

/** What an entry is, in a sentence, for its detail. */
export function entryExplanation(entry: Pick<WalletEntry, "kind">, profile: FinanceProfile): string {
  switch (entry.kind) {
    case "sale":
      return "Montant net d'une vente, crédité après la période de garantie.";
    case "delivery":
      return profile === "courier" ? "Votre part des frais de livraison de cette mission." : "La part de l'agence sur les frais de cette livraison.";
    case "withdrawal":
      return "Montant réservé pour une demande de retrait. Il quitte le solde dès la demande.";
    case "withdrawal_released":
      return "Montant d'une demande de retrait refusée ou annulée, restitué au solde.";
    case "dispute":
      return "Mouvement lié à un litige sur une commande.";
    case "adjustment":
      return "Correction enregistrée par SUGU sur ce portefeuille.";
    default:
      return "Mouvement enregistré sur ce portefeuille.";
  }
}

// ── Payout methods ──────────────────────────────────────────

export const METHOD_KIND_LABEL: Record<MethodKind, string> = { mobile_money: "Mobile money", bank: "Compte bancaire" };

/** `PayoutMethod` of a withdrawal: `mobile_money`, `bank`, `cash`. */
export function payoutMethodLabel(method: string | null): string {
  if (method === "mobile_money") return "Mobile money";
  if (method === "bank") return "Virement bancaire";
  if (method === "cash") return "Espèces";
  return "—";
}

export const methodIcon = (method: Pick<PayoutMethod, "kind">): LucideIcon => (method.kind === "bank" ? Building2 : Smartphone);

/**
 * Colour of the tile of a method. A tint of the palette, picked from the
 * operator so that two accounts are told apart at a glance — not a logo.
 */
export function methodTone(method: Pick<PayoutMethod, "kind" | "provider">): Tone | "brand" {
  if (method.kind === "bank") return "info";
  if (method.provider?.startsWith("orange")) return "brand";
  if (method.provider?.startsWith("moov")) return "info";
  if (method.provider?.startsWith("mtn")) return "warning";
  return "neutral";
}

// ── Failures ────────────────────────────────────────────────

const WORDING = {
  not_found: "Ce compte ou cette opération est introuvable.",
  forbidden: "Vous n'avez pas accès aux finances de ce compte.",
  conflict: "Un retrait est en cours sur ce compte. Réessayez une fois qu'il sera terminé.",
  refused: "Cette opération n'est pas possible pour le moment.",
  throttled: "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.",
} as const;

export function describeFinanceFailure(error: unknown): Failure {
  return describeFailureWith(error, WORDING);
}

/** The account may not read this money at all (a 403 on a read): the screen says so instead of an error to retry. */
export const isForbidden = (error: unknown) => error instanceof ApiError && error.status === 403;
