import type { NewDeliveryRequest } from "./api";

// ============================================================
// A delivery the agency enters itself (`POST agencies/{id}/shipments`,
// StoreAgencyShipmentRequest). The form state, its steps, what each
// step requires and the request it becomes. Amounts are typed and
// posted in FRANCS: the endpoint converts them.
// ============================================================

export type NewDeliveryPriority = "urgent" | "normal" | "low";

export interface NewDeliveryForm {
  vendorName: string;
  itemsCount: string;
  orderTotal: string;
  paymentStatus: "paid" | "pending";
  paymentMethod: string;
  orderNotes: string;
  pickupAddress: string;
  pickupPhone: string;
  deliveryAddress: string;
  deliveryInstructions: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  /** User id of the courier, or `""` to assign later. */
  courierUserId: string;
  priority: NewDeliveryPriority;
  shippingAmount: string;
  deliveryDate: string;
  timeFrom: string;
  timeTo: string;
}

export const EMPTY_NEW_DELIVERY: NewDeliveryForm = {
  vendorName: "",
  itemsCount: "1",
  orderTotal: "",
  paymentStatus: "pending",
  paymentMethod: "cash",
  orderNotes: "",
  pickupAddress: "",
  pickupPhone: "",
  deliveryAddress: "",
  deliveryInstructions: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  courierUserId: "",
  priority: "normal",
  shippingAmount: "",
  deliveryDate: "",
  timeFrom: "",
  timeTo: "",
};

export const NEW_DELIVERY_STEPS = [
  { id: "parcel", label: "Colis" },
  { id: "addresses", label: "Adresses" },
  { id: "courier", label: "Livreur et options" },
  { id: "summary", label: "Récapitulatif" },
] as const;

export type NewDeliveryStepId = (typeof NEW_DELIVERY_STEPS)[number]["id"];
export type NewDeliveryField = keyof NewDeliveryForm;

/** Label and control id of each field, for the error summary. */
export const NEW_DELIVERY_FIELDS: Record<NewDeliveryField, { label: string; id: string; step: NewDeliveryStepId }> = {
  vendorName: { label: "Expéditeur", id: "delivery-vendor-name", step: "parcel" },
  itemsCount: { label: "Nombre d'articles", id: "delivery-items-count", step: "parcel" },
  orderTotal: { label: "Valeur des articles", id: "delivery-order-total", step: "parcel" },
  paymentStatus: { label: "Paiement de la commande", id: "delivery-payment-status", step: "parcel" },
  paymentMethod: { label: "Mode de paiement", id: "delivery-payment-method", step: "parcel" },
  orderNotes: { label: "Consigne pour le livreur", id: "delivery-order-notes", step: "parcel" },
  pickupAddress: { label: "Adresse de collecte", id: "delivery-pickup-address", step: "addresses" },
  pickupPhone: { label: "Téléphone de l'expéditeur", id: "delivery-pickup-phone", step: "addresses" },
  deliveryAddress: { label: "Adresse de livraison", id: "delivery-address", step: "addresses" },
  deliveryInstructions: { label: "Point de repère", id: "delivery-instructions", step: "addresses" },
  clientName: { label: "Nom du destinataire", id: "delivery-client-name", step: "addresses" },
  clientPhone: { label: "Téléphone du destinataire", id: "delivery-client-phone", step: "addresses" },
  clientEmail: { label: "E-mail du destinataire", id: "delivery-client-email", step: "addresses" },
  courierUserId: { label: "Livreur", id: "delivery-courier", step: "courier" },
  priority: { label: "Priorité", id: "delivery-priority", step: "courier" },
  shippingAmount: { label: "Prix de la livraison", id: "delivery-shipping-amount", step: "courier" },
  deliveryDate: { label: "Date de livraison", id: "delivery-date", step: "courier" },
  timeFrom: { label: "Début du créneau", id: "delivery-time-from", step: "courier" },
  timeTo: { label: "Fin du créneau", id: "delivery-time-to", step: "courier" },
};

/** Fields of the API, as a 422 names them, to the fields of the form. */
export const NEW_DELIVERY_SERVER_FIELD: Record<string, NewDeliveryField> = {
  vendor_name: "vendorName",
  items_count: "itemsCount",
  order_total: "orderTotal",
  payment_status: "paymentStatus",
  payment_method: "paymentMethod",
  order_notes: "orderNotes",
  pickup_address: "pickupAddress",
  pickup_phone: "pickupPhone",
  delivery_address: "deliveryAddress",
  delivery_instructions: "deliveryInstructions",
  client_name: "clientName",
  client_phone: "clientPhone",
  client_email: "clientEmail",
  courier_id: "courierUserId",
  priority: "priority",
  shipping_amount: "shippingAmount",
  delivery_date: "deliveryDate",
  time_slot_from: "timeFrom",
  time_slot_to: "timeTo",
};

/** `DeliveryOrder.priority`: 30 and under is urgent, over 100 is low. */
export const PRIORITY_VALUE: Record<NewDeliveryPriority, number> = { urgent: 20, normal: 100, low: 150 };

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Espèces" },
  { value: "orange_money", label: "Orange Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "card", label: "Carte bancaire" },
];

/** A typed amount or count: digits with spaces, a comma or a dot for decimals. Null when it is not a number. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[\s  ]/g, "").replace(",", ".");
  if (cleaned === "" || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (phone: string) => phone.replace(/\D/g, "");

/**
 * What stops the form, field by field. With a step, only the fields of that
 * step are checked: a step is left once it is right, the rest waits its turn.
 */
export function validateNewDelivery(form: NewDeliveryForm, step?: NewDeliveryStepId): Partial<Record<NewDeliveryField, string>> {
  const errors: Partial<Record<NewDeliveryField, string>> = {};
  const required = (field: NewDeliveryField, message: string, max: number) => {
    const value = (form[field] as string).trim();
    if (value === "") errors[field] = message;
    else if (value.length > max) errors[field] = `${max} caractères au plus.`;
  };

  required("vendorName", "Indiquez qui envoie le colis.", 255);
  const items = parseAmount(form.itemsCount);
  if (items === null || !Number.isInteger(items) || items < 1) errors.itemsCount = "Indiquez un nombre d'articles, au moins 1.";
  const total = parseAmount(form.orderTotal);
  if (form.orderTotal.trim() === "") errors.orderTotal = "Indiquez la valeur des articles ; 0 si le colis n'a pas de valeur marchande.";
  else if (total === null) errors.orderTotal = "Saisissez un montant en chiffres.";
  if (form.orderNotes.length > 2000) errors.orderNotes = "2 000 caractères au plus.";

  required("pickupAddress", "Indiquez où collecter le colis.", 500);
  if (form.pickupPhone.trim() !== "" && digits(form.pickupPhone).length < 8) errors.pickupPhone = "Ce numéro est trop court.";
  required("deliveryAddress", "Indiquez où livrer le colis.", 500);
  if (form.deliveryInstructions.length > 2000) errors.deliveryInstructions = "2 000 caractères au plus.";
  required("clientName", "Indiquez le nom du destinataire.", 255);
  if (form.clientPhone.trim() === "") errors.clientPhone = "Indiquez un numéro où joindre le destinataire.";
  else if (digits(form.clientPhone).length < 8) errors.clientPhone = "Ce numéro est trop court.";
  if (form.clientEmail.trim() !== "" && !EMAIL.test(form.clientEmail.trim())) errors.clientEmail = "Cette adresse e-mail n'est pas valide.";

  if (form.shippingAmount.trim() !== "" && parseAmount(form.shippingAmount) === null) errors.shippingAmount = "Saisissez un montant en chiffres.";
  if (form.timeFrom !== "" && !TIME.test(form.timeFrom)) errors.timeFrom = "Heure au format 14:00.";
  if (form.timeTo !== "" && !TIME.test(form.timeTo)) errors.timeTo = "Heure au format 16:00.";
  if ((form.timeFrom !== "" || form.timeTo !== "") && form.deliveryDate === "") errors.deliveryDate = "Un créneau demande une date de livraison.";
  if (!errors.timeFrom && !errors.timeTo && form.timeFrom !== "" && form.timeTo !== "" && form.timeTo <= form.timeFrom) {
    errors.timeTo = "La fin du créneau doit suivre son début.";
  }

  if (!step) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([field]) => NEW_DELIVERY_FIELDS[field as NewDeliveryField].step === step));
}

/** The request the form becomes. Call it on a form `validateNewDelivery` accepts. */
export function newDeliveryRequest(form: NewDeliveryForm): NewDeliveryRequest {
  const optional = (value: string) => value.trim() || undefined;
  return {
    vendor_name: form.vendorName.trim(),
    items_count: parseAmount(form.itemsCount) ?? 1,
    order_total: parseAmount(form.orderTotal) ?? 0,
    payment_status: form.paymentStatus,
    payment_method: form.paymentMethod || undefined,
    order_notes: optional(form.orderNotes),
    pickup_address: form.pickupAddress.trim(),
    pickup_phone: optional(form.pickupPhone),
    delivery_address: form.deliveryAddress.trim(),
    delivery_instructions: optional(form.deliveryInstructions),
    client_name: form.clientName.trim(),
    client_phone: form.clientPhone.trim(),
    client_email: optional(form.clientEmail),
    courier_id: form.courierUserId || undefined,
    priority: PRIORITY_VALUE[form.priority],
    shipping_amount: form.shippingAmount.trim() === "" ? undefined : (parseAmount(form.shippingAmount) ?? undefined),
    delivery_date: form.deliveryDate || undefined,
    time_slot_from: form.timeFrom || undefined,
    time_slot_to: form.timeTo || undefined,
  };
}
