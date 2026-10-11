import {
  AlertTriangle,
  Archive,
  Ban,
  Banknote,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock,
  Coffee,
  EyeOff,
  FileSearch,
  Globe,
  Hourglass,
  Inbox,
  Loader,
  MapPin,
  MessageSquareWarning,
  Package,
  PackageCheck,
  PackageOpen,
  PackageX,
  PencilLine,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Undo2,
  UserCheck,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import { defineStatusRegistry } from "./registry";

/* ============================================================
   Codes mirror the backend enums in ../sugu (source noted on each
   registry). Three separate axes are kept apart on purpose:
   order lifecycle, payment, logistics. An order can be `shipped`
   while its payment is still `cod_pending`.
   ============================================================ */

/** `App\Enums\Orders\OrderStatus` */
export const orderStatus = defineStatusRegistry({
  domain: "order",
  statuses: {
    pending: { label: "En attente", tone: "warning", icon: Clock, description: "Commande reçue, à confirmer." },
    awaiting_payment: { label: "Paiement attendu", tone: "warning", icon: Hourglass },
    confirmed: { label: "Confirmée", tone: "info", icon: CheckCircle2 },
    processing: { label: "En préparation", tone: "info", icon: PackageOpen },
    packed: { label: "Emballée", tone: "info", icon: Package },
    shipped: { label: "Expédiée", tone: "info", icon: Truck },
    delivered: { label: "Livrée", tone: "success", icon: PackageCheck },
    canceled: { label: "Annulée", tone: "neutral", icon: Ban },
    returned: { label: "Retournée", tone: "warning", icon: Undo2 },
    failed: { label: "Échouée", tone: "danger", icon: AlertTriangle },
  },
  // British spelling used by some projections (OrderTimelineProjection).
  aliases: { cancelled: "canceled" },
});

/** `App\Enums\Payments\PaymentStatus` — one payment transaction. */
export const paymentStatus = defineStatusRegistry({
  domain: "payment",
  statuses: {
    pending: { label: "En attente", tone: "warning", icon: Clock, description: "Créé, pas encore encaissé." },
    authorized: { label: "Autorisé", tone: "info", icon: ShieldCheck, description: "Autorisé, pas encore capturé." },
    captured: { label: "Encaissé", tone: "success", icon: CheckCircle2 },
    failed: { label: "Échoué", tone: "danger", icon: XCircle },
    canceled: { label: "Annulé", tone: "neutral", icon: Ban },
    partially_refunded: { label: "Remboursé en partie", tone: "warning", icon: Undo2 },
    refunded: { label: "Remboursé", tone: "neutral", icon: Undo2 },
  },
  aliases: { cancelled: "canceled" },
});

/**
 * `paymentStatusCode` of a seller order
 * (`SellerOrderService::resolvePaymentStatusCode`): the payment situation of
 * the whole order, COD included. Distinct from a transaction status.
 */
export const orderPaymentStatus = defineStatusRegistry({
  domain: "order-payment",
  statuses: {
    paid: { label: "Payée", tone: "success", icon: CheckCircle2 },
    partial: {
      label: "Payée en partie",
      tone: "warning",
      icon: CircleDashed,
      description: "COD Mixte : un seul des deux frais est réglé.",
    },
    cod_pending: {
      label: "Paiement à la livraison",
      tone: "info",
      icon: Banknote,
      description: "Montant à collecter à la remise du colis.",
    },
    pending: { label: "Paiement attendu", tone: "warning", icon: Clock },
    hold: { label: "En vérification", tone: "warning", icon: ShieldAlert },
    refunded: { label: "Remboursée", tone: "neutral", icon: Undo2 },
    failed: { label: "Paiement échoué", tone: "danger", icon: XCircle },
  },
});

/**
 * `App\Enums\Shipments\ShipmentStatus` — shared by agency and courier.
 * Aliases are the courier projection of `CourierDeliveryService::mapStatus`.
 */
export const deliveryStatus = defineStatusRegistry({
  domain: "delivery",
  statuses: {
    pending: { label: "À prendre en charge", tone: "warning", icon: Clock, description: "Aucun coursier n'a encore accepté la livraison." },
    awaiting_fee_payment: {
      label: "Frais de livraison attendus",
      tone: "warning",
      icon: Hourglass,
      description: "COD Mixte : le client doit régler les frais de livraison.",
    },
    assigned: { label: "Ramassage à faire", tone: "info", icon: UserCheck, description: "Un coursier est assigné." },
    picked_up: { label: "Colis collecté", tone: "info", icon: Package },
    in_transit: { label: "En route", tone: "info", icon: Truck },
    arrived: { label: "Arrivé chez le client", tone: "info", icon: MapPin },
    delivery_failed: { label: "Échec de livraison", tone: "danger", icon: PackageX },
    delivered: { label: "Livrée", tone: "success", icon: PackageCheck },
  },
  aliases: {
    to_accept: "pending",
    pickup: "assigned",
    en_route: "in_transit",
    failed: "delivery_failed",
  },
});

/**
 * The same shipment as the AGENCY works on it: what it has to do next.
 * `to_accept` is not a status of the enum: it is a request the agency has
 * not decided on yet (`awaiting_decision` in the agency endpoints).
 */
export const agencyDeliveryStatus = defineStatusRegistry({
  domain: "agency-delivery",
  statuses: {
    to_accept: { label: "À accepter", tone: "warning", icon: Inbox, description: "Demande reçue : à accepter ou à refuser." },
    pending: { label: "À assigner", tone: "warning", icon: UserPlus, description: "Aucun livreur n'est encore assigné." },
    awaiting_fee_payment: {
      label: "Frais attendus",
      tone: "warning",
      icon: Hourglass,
      description: "COD Mixte : le client doit régler les frais de livraison.",
    },
    assigned: { label: "À ramasser", tone: "warning", icon: Package, description: "Le livreur doit collecter le colis." },
    picked_up: { label: "Colis collecté", tone: "info", icon: PackageCheck },
    in_transit: { label: "En livraison", tone: "info", icon: Truck },
    arrived: { label: "Chez le client", tone: "info", icon: MapPin },
    delivery_failed: { label: "Échec", tone: "danger", icon: CircleAlert, description: "La tentative de livraison a échoué." },
    delivered: { label: "Livrée", tone: "success", icon: CheckCircle2 },
  },
});

/** Whether the money of a delivery is in: `OrderPaymentStatus`, in the short words of a delivery list. */
export const deliveryPaymentStatus = defineStatusRegistry({
  domain: "delivery-payment",
  statuses: {
    paid: { label: "Payé", tone: "success", icon: Banknote },
    partial: { label: "Payé en partie", tone: "warning", icon: CircleDashed, description: "COD Mixte : un seul des deux frais est réglé." },
    cod_pending: { label: "À encaisser", tone: "warning", icon: Banknote, description: "Montant à collecter à la remise du colis." },
    pending: { label: "En attente", tone: "warning", icon: Clock, description: "Le paiement de la commande n'est pas encore reçu." },
    hold: { label: "En vérification", tone: "warning", icon: ShieldAlert },
    refunded: { label: "Remboursé", tone: "neutral", icon: Undo2 },
    failed: { label: "Non payé", tone: "danger", icon: XCircle },
  },
});

/** `App\Enums\Products\ProductStatus` (integer-backed: 0–6). */
export const productStatus = defineStatusRegistry({
  domain: "product",
  statuses: {
    draft: { label: "Brouillon", tone: "neutral", icon: PencilLine },
    submitted: { label: "En validation", tone: "warning", icon: Clock, description: "Soumis, en attente de modération." },
    active: { label: "En ligne", tone: "success", icon: Globe, description: "Approuvé et visible par les acheteurs." },
    rejected: { label: "Rejeté", tone: "danger", icon: XCircle },
    archived: { label: "Archivé", tone: "neutral", icon: Archive },
    changes_requested: { label: "À corriger", tone: "warning", icon: MessageSquareWarning, description: "Corrections demandées par la modération avant la mise en ligne." },
    suspended: { label: "Suspendu", tone: "danger", icon: Ban },
  },
  aliases: {
    "0": "draft",
    "1": "submitted",
    "2": "active",
    "3": "rejected",
    "4": "archived",
    "5": "changes_requested",
    "6": "suspended",
  },
});

/** Stock level derived by the backend (`in_stock` / `low_stock` / `out_of_stock`). Not a product status. */
export const stockStatus = defineStatusRegistry({
  domain: "stock",
  statuses: {
    in_stock: { label: "En stock", tone: "success", icon: CheckCircle2 },
    low_stock: { label: "Stock faible", tone: "warning", icon: AlertTriangle },
    out_of_stock: { label: "Rupture", tone: "danger", icon: PackageX },
  },
});

/** `App\Enums\Payouts\PayoutStatus` — labels and tones follow the enum's own `label()` / `color()`. */
export const payoutStatus = defineStatusRegistry({
  domain: "payout",
  statuses: {
    pending: { label: "En attente", tone: "warning", icon: Clock },
    approved: { label: "Approuvé", tone: "info", icon: ShieldCheck },
    processing: { label: "En cours", tone: "info", icon: Loader },
    paid: { label: "Payé", tone: "success", icon: CheckCircle2 },
    failed: { label: "Échoué", tone: "danger", icon: AlertTriangle },
    rejected: { label: "Rejeté", tone: "danger", icon: XCircle },
    canceled: { label: "Annulé", tone: "neutral", icon: Ban },
  },
  aliases: { cancelled: "canceled" },
});

/** `App\Enums\KycDocumentStatus` (integer-backed: 0–2) — one uploaded document. */
export const kycDocumentStatus = defineStatusRegistry({
  domain: "kyc-document",
  statuses: {
    pending: { label: "En vérification", tone: "warning", icon: FileSearch },
    approved: { label: "Approuvé", tone: "success", icon: CheckCircle2 },
    rejected: { label: "Rejeté", tone: "danger", icon: XCircle },
  },
  aliases: { "0": "pending", "1": "approved", "2": "rejected" },
});

/** `App\Enums\VerificationRequestStatus` (integer-backed: 0–3) — the KYC request as a whole. */
export const kycRequestStatus = defineStatusRegistry({
  domain: "kyc-request",
  statuses: {
    pending: { label: "En vérification", tone: "warning", icon: FileSearch },
    approved: { label: "Approuvée", tone: "success", icon: ShieldCheck },
    rejected: { label: "Rejetée", tone: "danger", icon: XCircle },
    needs_more_info: { label: "Infos requises", tone: "info", icon: MessageSquareWarning },
  },
  aliases: { "0": "pending", "1": "approved", "2": "rejected", "3": "needs_more_info" },
});

/** `App\Enums\Delivery\CourierStatus` (integer-backed: 1–4) — the courier account. */
export const courierStatus = defineStatusRegistry({
  domain: "courier",
  statuses: {
    active: { label: "Actif", tone: "success", icon: UserCheck },
    suspended: { label: "Suspendu", tone: "danger", icon: Ban },
    inactive: { label: "Inactif", tone: "neutral", icon: UserX },
    pending_kyc: { label: "KYC en attente", tone: "warning", icon: FileSearch },
  },
  aliases: { "1": "active", "2": "suspended", "3": "inactive", "4": "pending_kyc" },
});

/**
 * What a courier is doing, as `AgencyCourierOverviewService` reads it from
 * his account, his verification and the shipments he carries.
 */
export const courierActivity = defineStatusRegistry({
  domain: "courier-activity",
  statuses: {
    on_delivery: { label: "En livraison", tone: "info", icon: Truck, description: "Au moins une livraison en cours." },
    available: { label: "Disponible", tone: "success", icon: CheckCircle2, description: "En attente d'une course." },
    paused: { label: "En pause", tone: "neutral", icon: Coffee, description: "Compte mis en pause : aucune course ne lui est proposée." },
    to_verify: { label: "À vérifier", tone: "warning", icon: CircleAlert, description: "Pièces justificatives à vérifier." },
    suspended: { label: "Suspendu", tone: "danger", icon: Ban },
  },
});

/** `App\Domain\SuguBox\Enums\InboundStatus` — stock received at the warehouse. */
export const suguBoxInboundStatus = defineStatusRegistry({
  domain: "sugu-box-inbound",
  statuses: {
    pending: { label: "En attente", tone: "warning", icon: Clock },
    in_progress: { label: "Réception en cours", tone: "info", icon: ScanLine },
    completed: { label: "Réceptionné", tone: "success", icon: PackageCheck },
    cancelled: { label: "Annulé", tone: "neutral", icon: Ban },
  },
});

/** `App\Domain\SuguBox\Enums\OutboundStatus` — order prepared by the warehouse. */
export const suguBoxOutboundStatus = defineStatusRegistry({
  domain: "sugu-box-outbound",
  statuses: {
    pending: { label: "En attente", tone: "warning", icon: Clock },
    picking: { label: "Prélèvement", tone: "info", icon: ScanLine },
    packed: { label: "Emballé", tone: "info", icon: Package },
    shipped: { label: "Expédié", tone: "success", icon: Truck },
    cancelled: { label: "Annulé", tone: "neutral", icon: Ban },
  },
});

/** `App\Domain\SuguBox\Enums\ListingStatus` */
export const suguBoxListingStatus = defineStatusRegistry({
  domain: "sugu-box-listing",
  statuses: {
    draft: { label: "Brouillon", tone: "neutral", icon: PencilLine },
    published: { label: "Publiée", tone: "success", icon: Globe },
    unpublished: { label: "Dépubliée", tone: "neutral", icon: EyeOff },
    out_of_stock: { label: "Rupture", tone: "danger", icon: PackageX },
  },
});

export const statusRegistries = {
  order: orderStatus,
  payment: paymentStatus,
  orderPayment: orderPaymentStatus,
  delivery: deliveryStatus,
  agencyDelivery: agencyDeliveryStatus,
  deliveryPayment: deliveryPaymentStatus,
  product: productStatus,
  stock: stockStatus,
  payout: payoutStatus,
  kycDocument: kycDocumentStatus,
  kycRequest: kycRequestStatus,
  courier: courierStatus,
  courierActivity,
  suguBoxInbound: suguBoxInboundStatus,
  suguBoxOutbound: suguBoxOutboundStatus,
  suguBoxListing: suguBoxListingStatus,
} as const;

export type StatusDomain = keyof typeof statusRegistries;
