"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Banknote,
  Bike,
  Check,
  Clock,
  Coins,
  Landmark,
  Map as MapIcon,
  MapPin,
  Navigation,
  Package,
  PenLine,
  Phone,
  Plus,
  Printer,
  Repeat,
  RotateCw,
  Star,
  StickyNote,
  Store,
  Truck,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DescriptionList,
  Dialog,
  DialogClose,
  DialogContent,
  ErrorState,
  FormField,
  Money,
  PageHeader,
  Skeleton,
  Textarea,
  cn,
  type DescriptionItem,
  type PageAction,
} from "@/design-system";
import {
  DeliveryActionDialogs,
  assignLabelOf,
  statusActionOf,
  statusActionsFor,
  type DeliveryIntent,
} from "@/features/agency/components/delivery-actions";
import { DeliveryPayment, DeliveryStatus } from "@/features/agency/components/delivery-bits";
import { DeliverySlip } from "@/features/agency/components/delivery-slip";
import { JourneyBanner, JourneyTimeline } from "@/features/agency/components/journey";
import { AgencyPage } from "@/features/agency/components/page";
import { CopyButton, Panel, WhatsAppLink } from "@/features/agency/components/panel";
import { vehicleLabel } from "@/features/agency/couriers/contract";
import { deliveryLabel, type DeliveryDetail } from "@/features/agency/deliveries/contract";
import { useDelivery, useDeliveryAction } from "@/features/agency/deliveries/hooks";
import { buildJourneyView } from "@/features/agency/deliveries/journey";
import { codMixteSummaryOf, paymentMethodLabel, priorityLabel } from "@/features/agency/deliveries/payment";
import { describeAgencyFailure } from "@/features/agency/errors";
import {
  formatCount,
  formatDayTime,
  formatLongDate,
  formatLongDateTime,
  formatRate,
  formatTime,
  mapsPointHref,
  mapsSearchHref,
  parseDate,
  relativeTime,
  telHref,
} from "@/features/agency/format";
import { useAgencyName } from "@/features/agency/session";

const LIST = "/agency/deliveries";

/** The one thing the delivery asks of the agency now, if any. */
function primaryIntentOf(delivery: DeliveryDetail): { label: string; icon: LucideIcon; intent: DeliveryIntent } | null {
  if (delivery.awaitingDecision) return { label: "Accepter la livraison", icon: Check, intent: { kind: "accept", delivery } };
  if (delivery.status === "delivery_failed" && delivery.canAssign) return { label: "Relancer la livraison", icon: RotateCw, intent: { kind: "assign", delivery } };
  if (delivery.canAssign && !delivery.courier) return { label: "Assigner un livreur", icon: UserPlus, intent: { kind: "assign", delivery } };
  for (const status of ["delivered", "in_transit"]) {
    const action = statusActionOf(status);
    if (action && delivery.nextStatuses.includes(status)) return { label: action.label, icon: action.icon, intent: { kind: "status", delivery, status } };
  }
  return null;
}

/** When the parcel is expected, as far as the delivery says. */
function Expected({ delivery }: { delivery: DeliveryDetail }) {
  const over = delivery.status === "delivered" || delivery.status === "delivery_failed";
  const eta = parseDate(delivery.eta);
  if (over || (!eta && !delivery.schedule)) return null;

  const sameDay = eta && eta.toDateString() === new Date().toDateString();
  const slot = delivery.schedule && [delivery.schedule.from, delivery.schedule.to].filter(Boolean).join(" – ");
  const value = eta ? (sameDay ? formatTime(delivery.eta) : formatDayTime(delivery.eta)) : [delivery.schedule?.date ? formatLongDate(delivery.schedule.date) : null, slot].filter(Boolean).join(", ");

  return (
    <div className="flex items-center gap-2.5">
      <Clock className={cn("size-5 shrink-0", delivery.late ? "text-danger-icon" : "text-foreground-subtle")} aria-hidden="true" />
      <div>
        <p className="text-meta text-foreground-muted">{delivery.late ? "Heure annoncée dépassée" : eta ? "Arrivée prévue" : "Créneau prévu"}</p>
        <p className={cn("text-section-title tabular-nums", delivery.late ? "text-danger-fg" : "text-foreground")}>{value}</p>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-foreground-muted">{children}</p>;
}

export function DeliveryDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const query = useDelivery(id);
  const agencyName = useAgencyName();
  const noteAction = useDeliveryAction();
  const [intent, setIntent] = useState<DeliveryIntent | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  if (query.isError) {
    const failure = describeAgencyFailure(query.error);
    return (
      <AgencyPage>
        <PageHeader title="Livraison" back={{ label: "Retour aux livraisons", href: LIST }} />
        <div className="rounded-panel border border-border bg-surface">
          <ErrorState
            title={failure.kind === "not_found" ? "Cette livraison est introuvable" : "La livraison n'a pas pu être chargée"}
            description={failure.message}
            onRetry={failure.kind === "not_found" ? undefined : () => query.refetch()}
            retrying={query.isFetching}
          />
        </div>
      </AgencyPage>
    );
  }

  if (!query.isSuccess) return <DeliveryDetailSkeleton />;

  const delivery = query.data;
  const name = deliveryLabel(delivery.reference);
  const view = buildJourneyView(delivery);
  const primary = primaryIntentOf(delivery);
  const cod = codMixteSummaryOf(delivery);
  const address = [delivery.recipient.address, delivery.addressLine2, delivery.zone?.name, delivery.recipient.city].filter(Boolean).join(", ");
  const { courier, position } = delivery;
  const closed = delivery.status === "delivered";

  const primaryStatus = primary?.intent.kind === "status" ? primary.intent.status : null;
  const secondaryActions: PageAction[] = [
    { label: "Imprimer le bon", icon: Printer, onSelect: () => window.print() },
    ...(delivery.recipient.phone ? [{ label: "Appeler le client", icon: Phone, href: telHref(delivery.recipient.phone) }] : []),
    ...(delivery.canReassign && courier ? [{ label: "Réassigner", icon: Repeat, onSelect: () => setIntent({ kind: "assign", delivery }) }] : []),
    ...(address ? [{ label: "Ouvrir la carte", icon: MapIcon, href: mapsSearchHref(address) }] : []),
  ];
  const moreActions: PageAction[] = [
    ...statusActionsFor(delivery)
      .filter(({ status }) => status !== primaryStatus)
      .map(({ status, action }) => ({
        label: action.label,
        icon: action.icon,
        tone: action.tone,
        onSelect: () => setIntent({ kind: "status", delivery, status }),
      })),
    ...(closed ? [] : [{ label: "Modifier le prix", icon: PenLine, onSelect: () => setIntent({ kind: "price", delivery }) }]),
    ...(delivery.awaitingDecision ? [{ label: "Refuser la livraison", icon: Ban, tone: "danger" as const, onSelect: () => setIntent({ kind: "refuse", delivery }) }] : []),
  ];

  const parcel: DescriptionItem[] = [
    {
      label: "N° de livraison",
      value: (
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold tabular-nums">{name}</span>
          {delivery.reference && <CopyButton value={delivery.reference} label="Copier le numéro de livraison" />}
        </span>
      ),
    },
    { label: "Origine", value: delivery.manual ? "Saisie par votre agence" : "Marketplace SUGU" },
    ...(delivery.pickup?.name ? [{ label: "Expéditeur", value: delivery.pickup.name }] : []),
    ...(delivery.items.length > 0 ? [{ label: "Contenu", value: delivery.items.map((item) => (item.quantity > 1 ? `${item.quantity} × ${item.name}` : item.name)).join(", ") }] : []),
    { label: "Quantité", value: `${formatCount(delivery.itemsCount)} article${delivery.itemsCount > 1 ? "s" : ""}` },
    { label: "Valeur des articles", value: <Money francs={delivery.goodsFrancs} /> },
    { label: "Priorité", value: priorityLabel(delivery.priority) },
  ];

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    const memo = note.trim();
    if (memo === "") {
      setNoteError("Écrivez la note avant de l'enregistrer.");
      return;
    }
    try {
      await noteAction.mutateAsync({ type: "note", id: delivery.id, memo });
      toast.success("Note ajoutée.");
      setNote("");
      setNoteOpen(false);
    } catch (error) {
      toast.error(describeAgencyFailure(error).message);
    }
  }

  return (
    <AgencyPage>
      <div className="flex flex-col gap-4 print:hidden">
        <PageHeader
          title={`Livraison ${name}`}
          back={{ label: "Retour aux livraisons", href: LIST }}
          titleAddon={
            <>
              <DeliveryStatus delivery={delivery} />
              {delivery.codMixte && (
                <Badge tone="warning" icon={Coins} title="Le client règle la livraison, puis les produits, en deux temps.">
                  COD mixte
                </Badge>
              )}
            </>
          }
          description={
            <>
              Créée le {formatLongDateTime(delivery.createdAt)}
              <span aria-hidden="true"> · </span>
              {delivery.manual ? "Par votre agence" : delivery.pickup?.name ? `Demande de ${delivery.pickup.name}` : "Demande de la marketplace"}
            </>
          }
          primaryAction={primary ? { label: primary.label, icon: primary.icon, onSelect: () => setIntent(primary.intent) } : undefined}
          secondaryActions={secondaryActions}
          moreActions={moreActions}
          stackActions
        />

        {delivery.refusalReason && (
          <Alert tone="danger" title="Livraison refusée par l'agence">
            {delivery.refusalReason}
          </Alert>
        )}

        {view && (
          <JourneyBanner
            view={view}
            aside={
              <>
                <Expected delivery={delivery} />
                {position && (
                  <Button asChild icon={Navigation}>
                    {/* The last point his phone sent, not a parcel followed live: said as what it is. */}
                    <a href={mapsPointHref(position.lat, position.lng)} target="_blank" rel="noreferrer">
                      Voir la dernière position
                    </a>
                  </Button>
                )}
              </>
            }
          />
        )}

        <div
          className={cn(
            "grid gap-4 [grid-template-areas:'client''address''courier''tracking''parcel''payment''notes']",
            "md:grid-cols-2 md:[grid-template-areas:'client_tracking''address_tracking''courier_payment''parcel_notes']",
            "xl:grid-cols-3 xl:[grid-template-areas:'parcel_client_tracking''address_payment_tracking''courier_notes_tracking']",
          )}
        >
          <Panel
            title="Client destinataire"
            icon={User}
            tone="info"
            className="[grid-area:client]"
            actions={
              delivery.recipient.phone && (
                <Button asChild size="compact">
                  <Link href={`${LIST}?q=${encodeURIComponent(delivery.recipient.phone)}`}>Ses livraisons</Link>
                </Button>
              )
            }
          >
            <div className="flex items-center gap-3">
              <Avatar name={delivery.recipient.name ?? "Client"} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-section-title text-foreground">{delivery.recipient.name ?? "Destinataire non renseigné"}</p>
                {delivery.recipient.phone && (
                  <p className="flex items-center gap-1 text-body text-foreground tabular-nums">
                    <a href={telHref(delivery.recipient.phone)} className="rounded-compact underline-offset-2 hover:underline">
                      {delivery.recipient.phone}
                    </a>
                    <CopyButton value={delivery.recipient.phone} label="Copier le téléphone du client" />
                  </p>
                )}
              </div>
            </div>
            {delivery.recipientRecord && (
              <DescriptionList
                className="mt-2 -mb-2"
                items={[
                  ...(delivery.recipientRecord.email
                    ? [
                        {
                          label: "E-mail",
                          value: (
                            <a href={`mailto:${delivery.recipientRecord.email}`} className="rounded-compact break-all underline-offset-2 hover:underline">
                              {delivery.recipientRecord.email}
                            </a>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: "Historique",
                    value: `${formatCount(delivery.recipientRecord.deliveriesCount)} livraison${delivery.recipientRecord.deliveriesCount > 1 ? "s" : ""} avec votre agence`,
                  },
                ]}
              />
            )}
          </Panel>

          <Panel
            title="Adresse de livraison"
            icon={MapPin}
            className="[grid-area:address]"
            actions={
              address && (
                <Button asChild size="compact">
                  <a href={mapsSearchHref(address)} target="_blank" rel="noreferrer">
                    Itinéraire
                  </a>
                </Button>
              )
            }
          >
            {address ? (
              <address className="text-body text-foreground not-italic">
                {delivery.zone && <span className="block font-semibold">{delivery.zone.name}</span>}
                <span className="block">{delivery.recipient.address}</span>
                {delivery.addressLine2 && <span className="block">{delivery.addressLine2}</span>}
                {delivery.recipient.city && <span className="block">{delivery.recipient.city}</span>}
              </address>
            ) : (
              <Empty>L&apos;adresse de livraison n&apos;est pas renseignée.</Empty>
            )}
            {delivery.directions && (
              <p className="mt-3 flex gap-2.5 rounded-control bg-surface-subtle p-3 text-body text-foreground">
                <Landmark className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                <span>
                  <span className="block text-meta font-medium text-foreground-muted">Point de repère</span>
                  {delivery.directions}
                </span>
              </p>
            )}
            {delivery.pickup && (delivery.pickup.address || delivery.pickup.name) && (
              <p className="mt-3 flex gap-2.5 border-t border-border pt-3 text-body text-foreground">
                <Store className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-meta font-medium text-foreground-muted">Collecte</span>
                  {delivery.pickup.name && <span className="block font-medium">{delivery.pickup.name}</span>}
                  {delivery.pickup.address && <span className="block">{delivery.pickup.address}</span>}
                  {delivery.pickup.phone && (
                    <a href={telHref(delivery.pickup.phone)} className="rounded-compact tabular-nums underline-offset-2 hover:underline">
                      {delivery.pickup.phone}
                    </a>
                  )}
                </span>
              </p>
            )}
          </Panel>

          <Panel
            title="Livreur assigné"
            icon={Bike}
            className="[grid-area:courier]"
            actions={
              (delivery.canReassign || (delivery.canAssign && !delivery.awaitingDecision)) && (
                <Button size="compact" icon={courier ? Repeat : UserPlus} onClick={() => setIntent({ kind: "assign", delivery })}>
                  {assignLabelOf(delivery)}
                </Button>
              )
            }
          >
            {courier ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={courier.name} size="lg" />
                  <div className="min-w-0">
                    <Link href={`/agency/drivers/${courier.id}`} className="block truncate rounded-compact text-section-title text-foreground underline-offset-2 hover:underline">
                      {courier.name}
                    </Link>
                    {courier.phone && (
                      <p className="flex items-center gap-1 text-body text-foreground tabular-nums">
                        <a href={telHref(courier.phone)} className="rounded-compact underline-offset-2 hover:underline">
                          {courier.phone}
                        </a>
                        <CopyButton value={courier.phone} label="Copier le téléphone du livreur" />
                        <WhatsAppLink phone={courier.phone} name={courier.name} />
                      </p>
                    )}
                  </div>
                </div>
                <ul aria-label="Le livreur en chiffres" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
                  <li className="flex min-w-0 items-start gap-2">
                    <Truck className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    <p className="min-w-0">
                      <span className="sr-only">Véhicule : </span>
                      <span className="block text-body font-medium whitespace-nowrap text-foreground">{vehicleLabel(courier.vehicleType) ?? "Non renseigné"}</span>
                      {courier.vehiclePlate && <span className="block text-meta whitespace-nowrap text-foreground-muted tabular-nums">{courier.vehiclePlate}</span>}
                    </p>
                  </li>
                  <li className="min-w-0">
                    <span className="block text-body font-medium whitespace-nowrap text-foreground tabular-nums">
                      {courier.totalDeliveries === null ? "Livraisons : —" : `${formatCount(courier.totalDeliveries)} livraison${courier.totalDeliveries > 1 ? "s" : ""}`}
                    </span>
                    <span className="block text-meta whitespace-nowrap text-foreground-muted tabular-nums">
                      {courier.successRate === null ? "Pas encore de taux" : `Réussite ${formatRate(courier.successRate)}`}
                    </span>
                  </li>
                  <li className="flex min-w-0 items-start gap-2">
                    <Star className="mt-0.5 size-4 shrink-0 text-warning-icon" aria-hidden="true" />
                    <p className="min-w-0">
                      <span className="sr-only">Note : </span>
                      <span className="block text-body font-medium text-foreground tabular-nums">{courier.rating === null ? "—" : String(courier.rating).replace(".", ",")}</span>
                      <span className="block text-meta whitespace-nowrap text-foreground-muted tabular-nums">
                        {courier.ratingCount ? `${formatCount(courier.ratingCount)} avis` : "Aucun avis"}
                      </span>
                    </p>
                  </li>
                </ul>
              </>
            ) : (
              <Empty>{delivery.awaitingDecision ? "Acceptez la livraison pour pouvoir lui assigner un livreur." : "Aucun livreur n'est encore assigné à cette livraison."}</Empty>
            )}
          </Panel>

          <Panel
            title="Suivi de livraison"
            icon={Clock}
            className="[grid-area:tracking]"
            actions={
              position && (
                <Button asChild size="compact">
                  <a href={mapsPointHref(position.lat, position.lng)} target="_blank" rel="noreferrer">
                    Voir sur la carte
                  </a>
                </Button>
              )
            }
          >
            {view ? (
              <JourneyTimeline
                view={view}
                currentNote={
                  position && (
                    <a
                      href={mapsPointHref(position.lat, position.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-control bg-success-bg px-3 py-2 text-body text-foreground hover:underline"
                    >
                      <MapPin className="size-4 shrink-0 text-success-icon" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        {position.distanceKm !== null ? `Le livreur est à ${String(position.distanceKm).replace(".", ",")} km du client` : "Dernière position connue du livreur"}
                        {relativeTime(position.recordedAt) && <span className="text-foreground-muted"> · {relativeTime(position.recordedAt)?.toLowerCase()}</span>}
                      </span>
                    </a>
                  )
                }
              />
            ) : (
              <Empty>Le suivi de cette livraison n&apos;est pas disponible.</Empty>
            )}
          </Panel>

          <Panel title="Informations du colis" icon={Package} className="[grid-area:parcel]">
            <DescriptionList items={parcel} className="-my-2" />
            {delivery.instructions && (
              <p className="mt-3 rounded-control bg-surface-subtle p-3 text-body text-foreground">
                <span className="block text-meta font-medium text-foreground-muted">Consigne pour le livreur</span>
                {delivery.instructions}
              </p>
            )}
          </Panel>

          <Panel
            title="Informations de paiement"
            icon={Banknote}
            tone="warning"
            className="[grid-area:payment]"
            actions={
              delivery.codMixte && (
                <Badge tone="warning" icon={Coins}>
                  COD mixte
                </Badge>
              )
            }
          >
            {cod ? (
              <DescriptionList
                className="-my-2"
                items={[
                  ...cod.lines.map((line) => ({
                    label: line.label,
                    value: (
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <Money francs={line.francs} />
                        <Badge tone={line.paid ? "success" : "warning"}>{line.paid ? "Payé" : "À régler"}</Badge>
                      </span>
                    ),
                  })),
                  { label: "Montant déjà payé", value: <Money francs={cod.paidFrancs} className="font-semibold text-success-fg" /> },
                  { label: "Reste à encaisser", value: <Money francs={cod.dueFrancs} className={cn("font-semibold", cod.dueFrancs > 0 && "text-danger-fg")} /> },
                  { label: "Statut", value: <DeliveryPayment delivery={delivery} /> },
                ]}
              />
            ) : (
              <DescriptionList
                className="-my-2"
                items={[
                  { label: "Prix de la livraison", value: <Money francs={delivery.feeFrancs} className="font-semibold" /> },
                  { label: "Valeur des articles", value: <Money francs={delivery.goodsFrancs} /> },
                  // The total of a marketplace order also holds the delivery its customer pays: said apart, not passed for goods.
                  ...(delivery.orderTotalFrancs !== delivery.goodsFrancs ? [{ label: "Total de la commande", value: <Money francs={delivery.orderTotalFrancs} /> }] : []),
                  ...(paymentMethodLabel(delivery.paymentMethod) ? [{ label: "Mode de paiement", value: paymentMethodLabel(delivery.paymentMethod) }] : []),
                  { label: "Statut", value: <DeliveryPayment delivery={delivery} /> },
                ]}
              />
            )}
            {cod && paymentMethodLabel(delivery.paymentMethod) && <p className="mt-3 text-meta text-foreground-muted">Mode de paiement : {paymentMethodLabel(delivery.paymentMethod)}</p>}
          </Panel>

          <Panel
            title="Notes internes"
            icon={StickyNote}
            tone="neutral"
            className="[grid-area:notes]"
            actions={
              <Button size="compact" icon={Plus} onClick={() => setNoteOpen(true)}>
                Ajouter une note
              </Button>
            }
          >
            {delivery.notes.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {delivery.notes.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5 rounded-control bg-surface-subtle p-3">
                    <Avatar name={entry.author} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-body font-medium text-foreground">{entry.author}</span>
                        <time dateTime={entry.at} className="text-meta text-foreground-muted tabular-nums">
                          {formatDayTime(entry.at)}
                        </time>
                      </p>
                      <p className="mt-0.5 text-body break-words whitespace-pre-line text-foreground">{entry.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Aucune note. Les notes ne sont vues que par votre agence et ses livreurs.</Empty>
            )}
          </Panel>
        </div>
      </div>

      <DeliverySlip delivery={delivery} agencyName={agencyName} />

      <DeliveryActionDialogs
        intent={intent}
        onClose={() => setIntent(null)}
        // A refused request is no longer one of the agency's deliveries: its page has nothing left to show.
        onDone={(done) => done.kind === "refuse" && router.push(LIST)}
      />

      <Dialog open={noteOpen} onOpenChange={(open) => !noteAction.isPending && setNoteOpen(open)}>
        <DialogContent
          size="sm"
          title="Ajouter une note"
          description={`Sur la livraison ${name}. Elle n'est pas montrée au client.`}
          footer={
            <>
              <DialogClose asChild>
                <Button disabled={noteAction.isPending}>Annuler</Button>
              </DialogClose>
              <Button type="submit" form="delivery-note-form" variant="primary" icon={Check} loading={noteAction.isPending}>
                Enregistrer la note
              </Button>
            </>
          }
        >
          <form id="delivery-note-form" onSubmit={submitNote} noValidate>
            <FormField label="Note" required error={noteError}>
              <Textarea
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setNoteError(null);
                }}
                placeholder="Le client préfère un appel avant le passage…"
              />
            </FormField>
          </form>
        </DialogContent>
      </Dialog>
    </AgencyPage>
  );
}

export function DeliveryDetailSkeleton() {
  return (
    <AgencyPage aria-busy>
      <p role="status" className="sr-only">
        Chargement de la livraison…
      </p>
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-control w-48 rounded-button" />
      </div>
      <Skeleton className="h-36 rounded-panel" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-52 rounded-panel" />
        ))}
      </div>
    </AgencyPage>
  );
}
