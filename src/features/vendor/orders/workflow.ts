import { CheckCircle2, PackageCheck, Truck, XCircle, type LucideIcon } from "lucide-react";
import { codStepLabel } from "./components/order-bits";
import type { OrderActionKey, OrderDetail } from "./contract";

// ============================================================
// How each transition is presented. The label, the confirmation
// text and the success message all describe what the endpoint
// really does (SellerOrderService), nothing more.
// ============================================================

export interface TransitionCopy {
  label: string;
  icon: LucideIcon;
  /** Title of the confirmation dialog. */
  question: string;
  /** What the server will do. */
  consequence: string;
  done: string;
  tone: "default" | "danger";
}

export const TRANSITIONS: Record<OrderActionKey, TransitionCopy> = {
  confirm: {
    label: "Confirmer la commande",
    icon: CheckCircle2,
    question: "Confirmer cette commande ?",
    consequence:
      "Vous confirmez que les articles sont disponibles. La commande passe à « Confirmée » et le client en est informé.",
    done: "Commande confirmée.",
    tone: "default",
  },
  requestDelivery: {
    label: "Demander la livraison",
    icon: Truck,
    question: "Demander la livraison ?",
    consequence:
      "Une demande de livraison est ouverte pour cette commande, qui passe à « En préparation ». Préparez le colis pour le coursier.",
    done: "Demande de livraison envoyée.",
    tone: "default",
  },
  markShipped: {
    label: "Marquer comme expédiée",
    icon: Truck,
    question: "Marquer la commande comme expédiée ?",
    consequence: "À faire lorsque le colis a quitté votre boutique. La commande passe à « Expédiée » et le client en est informé.",
    done: "Commande marquée comme expédiée.",
    tone: "default",
  },
  markDelivered: {
    label: "Marquer comme livrée",
    icon: PackageCheck,
    question: "Marquer la commande comme livrée ?",
    consequence: "À faire lorsque le client a reçu ses articles. La commande passe à « Livrée ».",
    done: "Commande marquée comme livrée.",
    tone: "default",
  },
  cancel: {
    label: "Annuler la commande",
    icon: XCircle,
    question: "Annuler cette commande ?",
    consequence: "La commande passe à « Annulée » et le client en est informé. Cette action est définitive.",
    done: "Commande annulée.",
    tone: "danger",
  },
};

/** Forward transitions, in the order they are tried for the main button. */
const FORWARD: OrderActionKey[] = ["confirm", "requestDelivery", "markShipped", "markDelivered"];

/**
 * The one forward step to put forward, among those the server allows.
 * A confirmed order allows both "request delivery" and "mark shipped":
 * the request comes first unless a shipment already exists.
 */
export function primaryTransition(order: Pick<OrderDetail, "actions" | "delivery">): OrderActionKey | null {
  const allowed = FORWARD.filter((key) => order.actions[key]);
  if (allowed.includes("requestDelivery") && allowed.includes("markShipped")) {
    return order.delivery.shipmentStatus ? "markShipped" : "requestDelivery";
  }
  return allowed[0] ?? null;
}

/** The other allowed forward transitions, without the primary one. */
export function secondaryTransitions(order: Pick<OrderDetail, "actions" | "delivery">): OrderActionKey[] {
  const primary = primaryTransition(order);
  return FORWARD.filter((key) => order.actions[key] && key !== primary);
}

export interface Guidance {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  body: string;
}

/**
 * One sentence on where the order stands and who has to act. Built from the
 * status, the payment facts and the allowed actions; null when there is
 * nothing useful to add to the badges.
 */
export function orderGuidance(order: OrderDetail): Guidance | null {
  const { status, actions, codMixte } = order;

  // Closed orders: the badges say it all.
  if (["canceled", "delivered", "returned", "failed"].includes(status)) return null;

  if (actions.confirm) {
    return {
      tone: "info",
      title: "Cette commande attend votre confirmation",
      body: "Vérifiez que les articles sont disponibles, puis confirmez la commande.",
    };
  }

  const feesUnpaid = codMixte !== null && !(codMixte.deliveryFeePaid && codMixte.productFeePaid);

  if (status === "shipped" && !actions.markDelivered) {
    if (feesUnpaid) {
      const waiting = [
        codMixte.deliveryFeePaid ? null : "les frais de livraison",
        codMixte.productFeePaid ? null : "le produit",
      ].filter(Boolean);
      return {
        tone: "warning",
        title: "Expédiée, paiement du client en attente",
        body: `Le client doit encore régler ${waiting.join(" et ")}. La commande ne peut pas être déclarée livrée avant.`,
      };
    }
    if (!order.isDirect) {
      return {
        tone: "info",
        title: "Livraison en cours",
        body: "La commande passera à « Livrée » lorsque le client aura validé son code de livraison auprès du coursier. Vous n'avez rien à faire.",
      };
    }
  }

  if (codMixte !== null) {
    const step = codStepLabel(codMixte.step);
    if (step) return { tone: "info", title: "Paiement en deux temps", body: `${step}.` };
  }

  return null;
}
