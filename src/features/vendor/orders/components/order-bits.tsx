import { Badge, StatusBadge, cn } from "@/design-system";
import { Store } from "lucide-react";

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "08 oct. 2026, 09:30", or a dash when the backend sent no usable date. */
export function formatOrderDateTime(iso: string | null): string {
  const date = parse(iso);
  return date ? DATE_TIME.format(date) : "—";
}

const DAY_TIME = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Compact form for table cells: the year only when it is not the current one. */
export function formatOrderDateShort(iso: string | null, now: Date = new Date()): string {
  const date = parse(iso);
  if (!date) return "—";
  return date.getFullYear() === now.getFullYear() ? DAY_TIME.format(date) : DATE_TIME.format(date);
}

/** What to call an order when the backend gave it no number. */
export function orderLabel(reference: string | null): string {
  return reference ?? "Sans numéro";
}

/**
 * Step of the COD Mixte flow (`Order::getCurrentCodStep`), worded for the
 * seller. An unknown step yields nothing rather than a guess.
 */
const COD_STEP_LABEL: Record<string, string> = {
  awaiting_vendor: "Votre confirmation est attendue",
  awaiting_negotiation: "Prix de livraison en discussion",
  awaiting_delivery_payment: "Frais de livraison à régler par le client",
  awaiting_pickup: "Ramassage par le coursier",
  awaiting_inspection: "Vérification du colis par le client",
  awaiting_product_payment: "Produit à régler par le client",
  awaiting_code: "Code de livraison attendu",
  completed: "Parcours terminé",
};

export function codStepLabel(step: string | null): string | null {
  return step ? (COD_STEP_LABEL[step] ?? null) : null;
}

export interface OrderPaymentProps {
  paymentStatus: string | null;
  codFlow: "mixte" | "legacy" | null;
  codStep: string | null;
  className?: string;
}

/**
 * Payment situation of an order: the status badge, then how the money is
 * collected when it is cash on delivery. Kept apart from the order status:
 * a shipped order can still be unpaid.
 */
export function OrderPayment({ paymentStatus, codFlow, codStep, className }: OrderPaymentProps) {
  const step = codFlow === "mixte" ? codStepLabel(codStep) : null;
  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <StatusBadge domain="orderPayment" code={paymentStatus} />
      {codFlow === "mixte" && (
        <span className="text-meta text-foreground-muted">
          Paiement en deux temps{step ? ` · ${step}` : ""}
        </span>
      )}
      {codFlow === "legacy" && <span className="text-meta text-foreground-muted">Espèces à la livraison</span>}
    </span>
  );
}

/** Marks a manual sale among marketplace orders. */
export function DirectSaleBadge() {
  return (
    <Badge tone="neutral" icon={Store}>
      Vente directe
    </Badge>
  );
}
