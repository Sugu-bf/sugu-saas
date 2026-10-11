import { asFrancs, type MoneyFrancs } from "@/design-system";
import type { DeliveryRow } from "./contract";

// What a delivery says about money, as the agency reads it. Only what the
// backend states is turned into amounts: for COD Mixte the two fees and
// whether each is paid; for the rest, the price of the delivery, the value
// of the goods and the payment status of the order. No "amount to collect"
// is computed where the backend does not say who pays what.

export interface CodMixteSummary {
  lines: { label: string; francs: MoneyFrancs; paid: boolean }[];
  totalFrancs: MoneyFrancs;
  paidFrancs: MoneyFrancs;
  /** What the courier still has to collect from the customer. */
  dueFrancs: MoneyFrancs;
}

export function codMixteSummaryOf(delivery: Pick<DeliveryRow, "codMixte">): CodMixteSummary | null {
  const cod = delivery.codMixte;
  if (!cod) return null;
  const lines = [
    { label: "Frais de livraison", francs: cod.deliveryFeeFrancs, paid: cod.deliveryFeePaid },
    { label: "Produits", francs: cod.productFeeFrancs, paid: cod.productFeePaid },
  ];
  const sum = (entries: typeof lines) => asFrancs(entries.reduce((total, line) => total + line.francs, 0));
  return {
    lines,
    totalFrancs: sum(lines),
    paidFrancs: sum(lines.filter((line) => line.paid)),
    dueFrancs: sum(lines.filter((line) => !line.paid)),
  };
}

/** `payment_method` as the order stores it. An unknown one is shown as it is. */
const METHOD_LABEL: Record<string, string> = {
  cash: "Espèces",
  cod: "Espèces à la livraison",
  mobile_money: "Mobile Money",
  orange_money: "Orange Money",
  moov_money: "Moov Money",
  wave: "Wave",
  card: "Carte bancaire",
  bank_transfer: "Virement",
  wallet: "Portefeuille SUGU",
};

export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null;
  return METHOD_LABEL[method.toLowerCase()] ?? method;
}

/** `DeliveryOrder.priority`: 30 and under is urgent, over 100 is low. */
export function priorityLabel(priority: number): "Urgente" | "Normale" | "Basse" {
  if (priority <= 30) return "Urgente";
  return priority > 100 ? "Basse" : "Normale";
}
