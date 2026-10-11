import {
  BadgeCheck,
  CircleCheckBig,
  Hourglass,
  Inbox,
  MapPin,
  PackageCheck,
  PackageX,
  Truck,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/design-system";
import { formatDayTime } from "../format";
import { displayStatusOf, type DeliveryDetail, type JourneyStep } from "./contract";

// ============================================================
// Presentation of where a delivery stands. The steps, their
// order, which is done, current or upcoming and their dates all
// come from the backend (`journey`, AgencyShipmentService::
// journeyOf). This file only words them and chooses icons and
// tones: it adds no step and dates nothing.
// ============================================================

export interface JourneyStepView {
  key: string;
  title: string;
  /** One sentence about the step, for the timeline. */
  summary: string | null;
  icon: LucideIcon;
  status: JourneyStep["status"];
  tone: Tone;
  /** ISO timestamp for `<time>`; null when nothing was recorded or nothing happened yet. */
  dateTime: string | null;
  /** What to print for the date; null for a step that has not happened. */
  dateLabel: string | null;
}

export interface JourneyView {
  /** What the banner says of the delivery as a whole. */
  headline: string;
  summary: string;
  icon: LucideIcon;
  tone: Tone;
  steps: JourneyStepView[];
  /** The steps of the banner: the timeline without the agency's own decision. */
  milestones: JourneyStepView[];
}

/** Printed for a step known to be reached at a moment the backend did not record. */
export const UNDATED_LABEL = "Date non enregistrée";

type Source = Pick<DeliveryDetail, "status" | "awaitingDecision" | "late" | "manual" | "courier" | "pickup" | "journey">;

const HEADLINE: Record<string, { headline: string; summary: (delivery: Source) => string; icon: LucideIcon; tone: Tone }> = {
  to_accept: {
    headline: "Demande à accepter",
    summary: () => "Cette demande attend votre décision : acceptez-la pour lui assigner un livreur, ou refusez-la.",
    icon: Inbox,
    tone: "warning",
  },
  pending: {
    headline: "Livreur à assigner",
    summary: () => "Aucun livreur n'est encore chargé de cette course.",
    icon: UserPlus,
    tone: "warning",
  },
  awaiting_fee_payment: {
    headline: "Frais de livraison attendus",
    summary: () => "Le client doit régler les frais de livraison avant le départ du livreur.",
    icon: Hourglass,
    tone: "warning",
  },
  assigned: {
    headline: "Colis à ramasser",
    summary: (delivery) => `${delivery.courier?.name ?? "Le livreur"} doit collecter le colis${delivery.pickup?.name ? ` auprès de ${delivery.pickup.name}` : ""}.`,
    icon: UserCheck,
    tone: "info",
  },
  picked_up: {
    headline: "Colis collecté",
    summary: () => "Le livreur a le colis et se met en route vers le client.",
    icon: PackageCheck,
    tone: "success",
  },
  in_transit: {
    headline: "Colis en route",
    summary: () => "Le livreur est en cours de livraison.",
    icon: Truck,
    tone: "success",
  },
  arrived: {
    headline: "Livreur sur place",
    summary: () => "Le livreur est arrivé chez le client : la remise est en cours.",
    icon: MapPin,
    tone: "success",
  },
  delivered: {
    headline: "Colis livré",
    summary: () => "Le colis a été remis au client.",
    icon: CircleCheckBig,
    tone: "success",
  },
  delivery_failed: {
    headline: "Livraison échouée",
    summary: () => "La tentative n'a pas abouti. Relancez la course, ou confiez-la à un autre livreur.",
    icon: PackageX,
    tone: "danger",
  },
};

function wording(step: JourneyStep, delivery: Source): { title: string; summary: string | null; icon: LucideIcon } {
  const upcoming = step.status === "upcoming";
  switch (step.key) {
    case "received":
      return delivery.manual
        ? { title: "Course créée", summary: "Saisie par votre agence.", icon: Inbox }
        : { title: "Demande reçue", summary: delivery.pickup?.name ? `Demande de livraison de ${delivery.pickup.name}.` : "Demande de livraison reçue de la marketplace.", icon: Inbox };
    case "accepted":
      return { title: "Acceptée par l'agence", summary: upcoming ? "En attente de votre décision." : "Votre agence s'est engagée à livrer ce colis.", icon: BadgeCheck };
    case "assigned":
      return {
        title: "Livreur assigné",
        summary: upcoming ? "Aucun livreur pour le moment." : delivery.courier ? `Course confiée à ${delivery.courier.name}.` : null,
        icon: UserCheck,
      };
    case "picked_up":
      return {
        title: "Colis collecté",
        summary: upcoming ? "En attente de la collecte." : delivery.pickup?.name ? `Colis récupéré auprès de ${delivery.pickup.name}.` : "Colis récupéré chez l'expéditeur.",
        icon: PackageCheck,
      };
    case "in_transit":
      return {
        title: "En livraison",
        summary: upcoming ? "Le livreur n'est pas encore parti." : delivery.status === "arrived" ? "Le livreur est arrivé chez le client." : "Le colis est en route vers le client.",
        icon: Truck,
      };
    case "delivered":
      return { title: "Livrée", summary: upcoming ? "En attente de la remise au client." : "Colis remis au client.", icon: CircleCheckBig };
    case "delivery_failed":
      return { title: "Livraison échouée", summary: "La tentative de livraison n'a pas abouti.", icon: PackageX };
    default:
      return { title: step.key, summary: null, icon: Inbox };
  }
}

function toneOf(step: JourneyStep, viewTone: Tone): Tone {
  if (step.status === "upcoming") return "neutral";
  if (step.key === "delivery_failed") return "danger";
  return step.status === "current" ? viewTone : "success";
}

/**
 * What the page shows of a delivery's way. Null when the backend sent no
 * journey: the page then draws no progress rather than inventing one.
 */
export function buildJourneyView(delivery: Source): JourneyView | null {
  const { journey } = delivery;
  if (!journey || journey.steps.length === 0) return null;

  const state = HEADLINE[displayStatusOf(delivery)] ?? HEADLINE.pending;
  // A delivery past its promised time is a warning, whatever its step — unless it is over.
  const tone: Tone = delivery.late && journey.state === "in_progress" ? "warning" : state.tone;

  const steps = journey.steps.map((step): JourneyStepView => {
    const words = wording(step, delivery);
    const reached = step.status !== "upcoming";
    // A timestamp that does not parse is not a date: it is shown as not recorded.
    const dated = reached && step.at !== null && !Number.isNaN(new Date(step.at).getTime());
    return {
      key: step.key,
      title: words.title,
      summary: words.summary,
      icon: words.icon,
      status: step.status,
      tone: toneOf(step, tone),
      dateTime: dated ? step.at : null,
      dateLabel: !reached ? null : dated ? formatDayTime(step.at) : UNDATED_LABEL,
    };
  });

  return {
    headline: state.headline,
    summary: state.summary(delivery),
    icon: state.icon,
    tone,
    steps,
    milestones: steps.filter((step) => step.key !== "accepted"),
  };
}
