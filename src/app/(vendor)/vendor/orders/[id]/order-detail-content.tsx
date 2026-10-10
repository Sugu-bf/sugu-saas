"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Copy,
  FileDown,
  Handshake,
  Link2,
  Mail,
  MessageCircle,
  Package,
  Phone,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DescriptionList,
  Money,
  PageHeader,
  Section,
  StatusBadge,
  type DescriptionItem,
} from "@/design-system";
import { env } from "@/lib/env";
import { downloadDeliverySlip, fetchInvoiceLink } from "@/features/vendor/orders/api";
import type { OrderActionKey, OrderDetail, OrderDetailItem, PickupCode } from "@/features/vendor/orders/contract";
import {
  DirectSaleBadge,
  OrderPayment,
  formatOrderDateTime,
  orderLabel,
} from "@/features/vendor/orders/components/order-bits";
import { OrderTrackingBanner, OrderTrackingSteps } from "@/features/vendor/orders/components/order-tracking";
import { describeFailure } from "@/features/vendor/orders/errors";
import { useConfirmHandoff, useOrderAction, usePickupCodes } from "@/features/vendor/orders/hooks";
import { buildTrackingView } from "@/features/vendor/orders/tracking";
import {
  TRANSITIONS,
  orderGuidance,
  primaryTransition,
  secondaryTransitions,
} from "@/features/vendor/orders/workflow";

/** Statuses during which a courier may come and collect the parcel. */
const HANDOFF_STATUSES = ["confirmed", "processing", "packed", "shipped"];

const DELIVERY_METHOD: Record<string, string> = {
  pickup: "Vente au comptoir",
  shipping: "Livraison par une agence",
};

/** Digits of a phone number, for `wa.me` links. */
function whatsappNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function OrderDetailContent({ order }: { order: OrderDetail }) {
  const reference = orderLabel(order.reference);
  const action = useOrderAction();
  const [pending, setPending] = useState<OrderActionKey | null>(null);

  const pickup = usePickupCodes(order.id, HANDOFF_STATUSES.includes(order.status));
  const pickupCodes = pickup.data ?? [];

  const primary = primaryTransition(order);
  const secondary = secondaryTransitions(order);
  const tracking = buildTrackingView(order);
  // The backend tracking already says where the order stands and what comes
  // next. The guidance sentence is kept for a backend that does not send it.
  const guidance = order.tracking ? null : orderGuidance(order);
  const phone = order.customer.phone;

  async function run(key: OrderActionKey) {
    try {
      await action.mutateAsync({ id: order.id, action: key });
      toast.success(TRANSITIONS[key].done);
    } catch (error) {
      toast.error(describeFailure(error).message);
      // Keeps the dialog open; the order is refetched by the mutation.
      throw error;
    }
  }

  const [busyDocument, setBusyDocument] = useState<"slip" | "invoice" | "whatsapp" | null>(null);

  async function withDocument(kind: "slip" | "invoice" | "whatsapp", work: () => Promise<void>, failure: string) {
    setBusyDocument(kind);
    try {
      await work();
    } catch (error) {
      toast.error(`${failure} ${describeFailure(error).message}`);
    } finally {
      setBusyDocument(null);
    }
  }

  const downloadSlip = () =>
    withDocument("slip", () => downloadDeliverySlip(order.id, order.reference), "Bon de livraison indisponible.");

  const copyInvoiceLink = () =>
    withDocument(
      "invoice",
      async () => {
        const { url } = await fetchInvoiceLink(order.id, env.NEXT_PUBLIC_MARKETPLACE_URL);
        await navigator.clipboard.writeText(url);
        toast.success("Lien de la facture copié.");
      },
      "Facture indisponible.",
    );

  const sendInvoiceByWhatsapp = () =>
    withDocument(
      "whatsapp",
      async () => {
        if (!phone) return;
        // Opened before the request: a window opened after an await is blocked as a popup.
        const tab = window.open("", "_blank");
        try {
          const { url } = await fetchInvoiceLink(order.id, env.NEXT_PUBLIC_MARKETPLACE_URL);
          const text = encodeURIComponent(
            `Bonjour${order.customer.name ? ` ${order.customer.name}` : ""}, voici la facture de votre commande ${reference} : ${url}`,
          );
          const target = `https://wa.me/${whatsappNumber(phone)}?text=${text}`;
          if (tab) tab.location.href = target;
          else window.location.href = target;
        } catch (error) {
          tab?.close();
          throw error;
        }
      },
      "Facture indisponible.",
    );

  const itemTotal =
    order.amounts.itemsFrancs +
    (order.amounts.deliveryFrancs ?? 0) +
    (order.amounts.taxFrancs ?? 0) -
    (order.amounts.discountFrancs ?? 0);
  const sharedOrder = order.amounts.orderTotalFrancs !== null && order.amounts.orderTotalFrancs !== itemTotal;

  const pendingCopy = pending ? TRANSITIONS[pending] : null;

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={`Commande ${reference}`}
        breadcrumbs={[{ label: "Commandes", href: "/vendor/orders" }, { label: reference }]}
        description={`Passée le ${formatOrderDateTime(order.placedAt)}`}
        titleAddon={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="order" code={order.status} />
            <StatusBadge domain="orderPayment" code={order.paymentStatus} />
            {order.isDirect && <DirectSaleBadge />}
          </span>
        }
        primaryAction={
          primary
            ? {
                label: TRANSITIONS[primary].label,
                icon: TRANSITIONS[primary].icon,
                onSelect: () => setPending(primary),
                disabled: action.isPending,
              }
            : undefined
        }
      />

      {tracking && <OrderTrackingBanner view={tracking} />}

      {guidance && (
        <Alert tone={guidance.tone} title={guidance.title}>
          {guidance.body}
        </Alert>
      )}

      {/* One column on phones, ordered by priority; two columns from 1024px. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-4">
          <Card className="order-2 lg:order-none">
            <Section
              title="Articles"
              description={`${order.items.length} article${order.items.length > 1 ? "s" : ""} de votre boutique`}
            >
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    orderId={order.id}
                    item={item}
                    pickup={pickupCodes.find((code) => code.store_id === item.storeId)}
                  />
                ))}
              </ul>
            </Section>
          </Card>

          <Card className="order-3 lg:order-none">
            <Section title="Montants">
              <DescriptionList
                items={[
                  { label: "Articles", value: <Money francs={order.amounts.itemsFrancs} /> },
                  ...(order.amounts.deliveryFrancs
                    ? [{ label: "Livraison", value: <Money francs={order.amounts.deliveryFrancs} /> }]
                    : []),
                  ...(order.amounts.discountFrancs
                    ? [{ label: "Remise", value: <Money francs={-order.amounts.discountFrancs} /> }]
                    : []),
                  ...(order.amounts.taxFrancs ? [{ label: "Taxes", value: <Money francs={order.amounts.taxFrancs} /> }] : []),
                  {
                    label: order.amounts.orderTotalFrancs !== null ? "Total à payer par le client" : "Total de vos articles",
                    value: (
                      <Money
                        francs={order.amounts.orderTotalFrancs ?? order.amounts.vendorTotalFrancs}
                        className="text-section-title"
                      />
                    ),
                  },
                ]}
              />
              {sharedOrder && (
                <p className="text-meta text-foreground-muted">
                  Cette commande contient aussi des articles d&apos;autres boutiques : le total porte sur toute la
                  commande, la ligne « Articles » sur les vôtres.
                </p>
              )}
            </Section>
          </Card>

          <Card className="order-7 lg:order-none">
            <Section title="Suivi de la commande">
              {tracking ? (
                <OrderTrackingSteps view={tracking} />
              ) : (
                <p className="text-body text-foreground-muted">Aucun suivi n&apos;a été transmis pour cette commande.</p>
              )}
            </Section>
          </Card>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <Card className="order-1 lg:order-none">
            <Section title="Client">
              <p className="text-body font-medium text-foreground">{order.customer.name ?? "Client non renseigné"}</p>
              {(phone || order.customer.email) && (
                <ul className="flex flex-col gap-1 text-body text-foreground-muted">
                  {phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                      <span className="tabular-nums">{phone}</span>
                    </li>
                  )}
                  {order.customer.email && (
                    <li className="flex items-center gap-2">
                      <Mail className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                      <span className="break-all">{order.customer.email}</span>
                    </li>
                  )}
                </ul>
              )}
              {phone ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild icon={Phone}>
                    <a href={`tel:${phone}`}>Appeler</a>
                  </Button>
                  <Button asChild icon={MessageCircle}>
                    <a href={`https://wa.me/${whatsappNumber(phone)}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-meta text-foreground-muted">Aucun numéro de téléphone n&apos;est enregistré.</p>
              )}
            </Section>
          </Card>

          <Card className="order-4 lg:order-none">
            <Section title="Paiement">
              <OrderPayment
                paymentStatus={order.paymentStatus}
                codFlow={order.codMixte ? "mixte" : null}
                codStep={order.codMixte?.step ?? null}
              />
              {order.codMixte && (
                <DescriptionList
                  items={[
                    {
                      label: "Frais de livraison",
                      value: (
                        <FeeLine
                          francs={order.codMixte.deliveryFeeFrancs}
                          paid={order.codMixte.deliveryFeePaid}
                          paidAt={order.codMixte.deliveryFeePaidAt}
                        />
                      ),
                    },
                    {
                      label: "Produit",
                      value: (
                        <FeeLine
                          francs={order.codMixte.productFeeFrancs}
                          paid={order.codMixte.productFeePaid}
                          paidAt={order.codMixte.productFeePaidAt}
                        />
                      ),
                    },
                  ]}
                />
              )}
            </Section>
          </Card>

          <Card className="order-5 lg:order-none">
            <Section title="Livraison">
              <DeliveryFacts order={order} />
            </Section>
          </Card>

          {pickupCodes.length > 0 && (
            <Card className="order-6 lg:order-none">
              <Section
                title={pickupCodes.length > 1 ? "Codes de collecte" : "Code de collecte"}
                description="À communiquer au coursier lorsqu'il vient chercher le colis."
              >
                <ul className="flex flex-col gap-2">
                  {pickupCodes.map((code) => (
                    <PickupCodeRow key={code.store_id} code={code.pickup_code} />
                  ))}
                </ul>
              </Section>
            </Card>
          )}
          {pickup.isError && (
            <Alert
              tone="warning"
              title="Code de collecte indisponible"
              className="order-6 lg:order-none"
              actions={
                <Button size="compact" onClick={() => pickup.refetch()} loading={pickup.isFetching}>
                  Réessayer
                </Button>
              }
            >
              Le code de collecte n&apos;a pas pu être chargé.
            </Alert>
          )}

          <Card className="order-8 lg:order-none">
            <Section title="Documents">
              <div className="flex flex-col gap-2">
                <Button icon={FileDown} onClick={downloadSlip} loading={busyDocument === "slip"} disabled={busyDocument !== null}>
                  Bon de livraison (PDF)
                </Button>
                <Button icon={Link2} onClick={copyInvoiceLink} loading={busyDocument === "invoice"} disabled={busyDocument !== null}>
                  Copier le lien de la facture
                </Button>
                {phone && (
                  <Button
                    icon={MessageCircle}
                    onClick={sendInvoiceByWhatsapp}
                    loading={busyDocument === "whatsapp"}
                    disabled={busyDocument !== null}
                  >
                    Envoyer la facture par WhatsApp
                  </Button>
                )}
              </div>
            </Section>
          </Card>

          {(secondary.length > 0 || order.actions.cancel) && (
            <Card className="order-9 lg:order-none">
              <Section title="Autres actions">
                <div className="flex flex-col gap-2">
                  {secondary.map((key) => (
                    <Button
                      key={key}
                      icon={TRANSITIONS[key].icon}
                      onClick={() => setPending(key)}
                      disabled={action.isPending}
                    >
                      {TRANSITIONS[key].label}
                    </Button>
                  ))}
                  {order.actions.cancel && (
                    <Button
                      variant="destructive"
                      icon={TRANSITIONS.cancel.icon}
                      onClick={() => setPending("cancel")}
                      disabled={action.isPending}
                    >
                      {TRANSITIONS.cancel.label}
                    </Button>
                  )}
                </div>
              </Section>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pendingCopy?.question ?? ""}
        description={pendingCopy?.consequence ?? ""}
        confirmLabel={pendingCopy?.label ?? ""}
        confirmIcon={pendingCopy?.icon}
        cancelLabel={pending === "cancel" ? "Garder la commande" : "Annuler"}
        tone={pendingCopy?.tone}
        onConfirm={() => (pending ? run(pending) : undefined)}
      />
    </div>
  );
}

// ── Items and courier handoff ───────────────────────────────

function OrderItemRow({ orderId, item, pickup }: { orderId: string; item: OrderDetailItem; pickup: PickupCode | undefined }) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-subtle">
          {item.image ? (
            <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <Package className="size-5 text-foreground-subtle" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium break-words text-foreground">{item.name}</p>
          {item.variant && <p className="text-meta text-foreground-muted">{item.variant}</p>}
          <p className="text-meta text-foreground-muted tabular-nums">
            {item.quantity} × <Money francs={item.unitPriceFrancs} />
          </p>
        </div>
        <Money francs={item.lineTotalFrancs} className="text-body font-medium text-foreground" />
      </div>
      {pickup && <Handoff orderId={orderId} itemId={item.id} itemName={item.name} pickup={pickup} />}
    </li>
  );
}

/**
 * Handoff of one item to the courier. The seller can only confirm it after
 * the courier has confirmed the collection (server rule SUGU-HANDOFF-SEQUENCE).
 */
function Handoff({ orderId, itemId, itemName, pickup }: { orderId: string; itemId: string; itemName: string; pickup: PickupCode }) {
  const confirm = useConfirmHandoff(orderId);

  if (pickup.vendor_handoff_at) {
    return (
      <Badge tone="success" icon={CheckCircle2} className="self-start">
        Remise au coursier confirmée
      </Badge>
    );
  }

  if (pickup.status !== "collected") {
    return (
      <Badge tone="neutral" icon={Clock} className="self-start">
        En attente du coursier
      </Badge>
    );
  }

  return (
    <Button
      size="compact"
      icon={Handshake}
      className="self-start"
      loading={confirm.isPending}
      aria-label={`Confirmer la remise au coursier de ${itemName}`}
      onClick={() =>
        confirm.mutate(itemId, {
          onSuccess: () => toast.success("Remise au coursier confirmée."),
          onError: (error) => toast.error(describeFailure(error).message),
        })
      }
    >
      Confirmer la remise au coursier
    </Button>
  );
}

function PickupCodeRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-subtle px-3 py-2">
      <span className="font-mono text-kpi tracking-widest text-foreground">{code}</span>
      <Button
        size="compact"
        icon={copied ? CheckCircle2 : Copy}
        onClick={() =>
          navigator.clipboard.writeText(code).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            },
            () => toast.error("Copie impossible sur cet appareil."),
          )
        }
      >
        {copied ? "Copié" : "Copier"}
      </Button>
    </li>
  );
}

// ── Payment and delivery facts ──────────────────────────────

function FeeLine({ francs, paid, paidAt }: { francs: OrderDetail["amounts"]["itemsFrancs"] | null; paid: boolean; paidAt: string | null }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <Money francs={francs} />
      <Badge tone={paid ? "success" : "warning"} icon={paid ? CheckCircle2 : Clock}>
        {paid ? "Réglé" : "À régler"}
      </Badge>
      {paid && paidAt && <span className="text-meta text-foreground-muted tabular-nums">{formatOrderDateTime(paidAt)}</span>}
    </span>
  );
}

/** Only what the backend stored is listed; an absent fact has no row. */
function DeliveryFacts({ order }: { order: OrderDetail }) {
  const { delivery } = order;
  const items: DescriptionItem[] = [];

  if (delivery.method && DELIVERY_METHOD[delivery.method]) {
    items.push({ label: "Mode", value: DELIVERY_METHOD[delivery.method] });
  }
  if (delivery.partnerName) items.push({ label: "Agence", value: delivery.partnerName });
  if (delivery.shipmentStatus) {
    items.push({ label: "Suivi", value: <StatusBadge domain="delivery" code={delivery.shipmentStatus} /> });
  }
  if (delivery.courier?.name) {
    items.push({
      label: "Coursier",
      value: delivery.courier.phone ? (
        <a href={`tel:${delivery.courier.phone}`} className="underline underline-offset-2">
          {delivery.courier.name} · <span className="tabular-nums">{delivery.courier.phone}</span>
        </a>
      ) : (
        delivery.courier.name
      ),
    });
  }
  if (delivery.address) {
    items.push({
      label: "Adresse",
      value: (
        <address className="not-italic">
          {delivery.address.fullName && <span className="block">{delivery.address.fullName}</span>}
          {delivery.address.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {delivery.address.phone && <span className="block tabular-nums">{delivery.address.phone}</span>}
        </address>
      ),
    });
  }
  if (delivery.note) items.push({ label: "Note", value: delivery.note });

  if (items.length === 0) {
    return (
      <p className="text-body text-foreground-muted">
        Aucune information de livraison n&apos;est enregistrée pour cette commande.
      </p>
    );
  }

  return (
    <>
      <DescriptionList items={items} />
      {!delivery.address && delivery.method !== "pickup" && (
        <p className="text-meta text-foreground-muted">Aucune adresse de livraison n&apos;est enregistrée.</p>
      )}
    </>
  );
}
