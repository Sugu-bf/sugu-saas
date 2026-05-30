/**
 * Maps the backend `paymentStatusCode` (a STATUS signal, not an error) to a
 * user-facing French label + a tone the UI can turn into a badge color.
 *
 * The backend (`SellerOrderService::resolvePaymentStatusCode`, B1 acheteur
 * parity) emits a closed set: `paid`, `partial`, `cod_pending`, `refunded`,
 * `failed`, `hold`, `pending`. `cod_pending` is the Trou n°2 code meaning
 * "cash on delivery, nothing prepaid" — it must NOT read as a generic
 * "payment pending". The raw code is never shown to the user.
 *
 * Distinct from `mapSuguErrorMessage` (which maps HTTP error messages).
 */

export type PaymentStatusTone = "neutral" | "warning" | "success" | "danger";

export interface PaymentStatusDisplay {
  label: string;
  tone: PaymentStatusTone;
}

const PAYMENT_STATUS_MAP: Record<string, PaymentStatusDisplay> = {
  cod_pending: { label: "Paiement à la livraison", tone: "warning" },
  paid: { label: "Payé", tone: "success" },
  partial: { label: "Partiellement payé", tone: "warning" },
  pending: { label: "En attente de paiement", tone: "warning" },
  refunded: { label: "Remboursé", tone: "neutral" },
  failed: { label: "Paiement échoué", tone: "danger" },
  hold: { label: "En attente de validation", tone: "neutral" },
};

/**
 * @param code - backend `paymentStatusCode`, possibly null/undefined.
 * @returns label + tone. Empty `label` means "render no badge" (null code).
 *          Unknown codes degrade to a safe generic label, never the raw code.
 */
export function mapPaymentStatusCode(
  code: string | null | undefined,
): PaymentStatusDisplay {
  if (!code) return { label: "", tone: "neutral" };
  return (
    PAYMENT_STATUS_MAP[code] ?? {
      label: "En attente de paiement",
      tone: "neutral",
    }
  );
}
