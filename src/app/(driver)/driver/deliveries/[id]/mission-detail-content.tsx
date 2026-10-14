"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, CircleAlert, Clock, ListChecks, MessageCircle, MessageSquareMore, MessageSquareText, MoreHorizontal, Navigation, Phone, Store, ThumbsDown, TriangleAlert } from "lucide-react";
import { Alert, Button, Card, DropdownMenu, DropdownMenuItem, ErrorState, IconButton, Skeleton, cn, formatMoneyFromCents, iconTileClass } from "@/design-system";
import { CanonicalTimeline } from "@/components/ui/canonical-timeline";
import { formatDayTime, formatTime, telHref, whatsappHref } from "@/features/agency/format";
import { ActionBar, DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { useMissionActions } from "@/features/driver/components/mission-actions";
import { MissionJourney, MissionStatus, Place, addressLine } from "@/features/driver/components/mission-bits";
import { MissionMap, directionsHref, nextStopOf } from "@/features/driver/components/mission-map";
import { describeDriverFailure } from "@/features/driver/errors";
import { useStartCourierConversation } from "@/features/messaging/hooks";
import { can, collectionOf, missionLabel, type MissionAction, type MissionDetail } from "@/features/driver/missions/contract";
import { useMission } from "@/features/driver/missions/hooks";
import { ACTION_LABEL, blockedReason, failureLabel } from "@/features/driver/missions/wording";

// The page of a mission, after its mock-up: where it stands, the map of the
// two places when the server knows where they are, what to collect and what
// to be paid, and at the foot the one thing to do now.

/** The step the courier is asked for now, in the order of the trip. */
const PRIMARY_ORDER: MissionAction[] = ["accept", "confirm_collection", "start_transit", "mark_arrived", "mark_delivered"];

export function primaryActionOf(mission: Pick<MissionDetail, "actions">): MissionAction | null {
  return PRIMARY_ORDER.find((action) => can(mission, action)) ?? null;
}

export function MissionDetailContent({ id }: { id: string }) {
  const { data: mission, isLoading, isError, error, refetch, isFetching } = useMission(id);
  const back = { label: "Retour aux missions", href: "/driver/deliveries" };

  if (isLoading) {
    return (
      <DriverPage aria-busy>
        <p role="status" className="sr-only">
          Chargement de la mission…
        </p>
        <Skeleton className="h-11 w-2/3" />
        <Skeleton className="h-16 rounded-panel" />
        <Skeleton className="h-56 rounded-panel" />
        <Skeleton className="h-48 rounded-panel" />
      </DriverPage>
    );
  }

  if (isError || !mission) {
    const failure = describeDriverFailure(error);
    return (
      <DriverPage>
        <ScreenHeader title="Mission" back={back} />
        <Card flush>
          <ErrorState
            title={failure.kind === "not_found" ? "Mission introuvable" : "Impossible de charger la mission"}
            description={failure.message}
            onRetry={failure.kind === "not_found" ? undefined : () => refetch()}
            retrying={isFetching}
          />
        </Card>
      </DriverPage>
    );
  }

  return <MissionPage mission={mission} />;
}

function MissionPage({ mission }: { mission: MissionDetail }) {
  const actions = useMissionActions(mission);
  const primary = primaryActionOf(mission);
  const blocked = (Object.entries(mission.blocked) as [MissionAction, string][])[0];
  const collection = collectionOf(mission);
  const next = nextStopOf(mission);
  const over = mission.stage === "delivered" || mission.stage === "failed";
  const secondary = (["signal_delay", "mark_failed", "refuse"] as const).filter((action) => can(mission, action));

  return (
    <DriverPage>
      <ScreenHeader
        title={missionLabel(mission.reference)}
        back={{ label: "Retour aux missions", href: "/driver/deliveries" }}
        actions={
          secondary.length > 0 && (
            <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="Plus d'actions" />}>
              {can(mission, "signal_delay") && (
                <DropdownMenuItem icon={Clock} onSelect={() => actions.perform("signal_delay")}>
                  {ACTION_LABEL.signal_delay}
                </DropdownMenuItem>
              )}
              {can(mission, "mark_failed") && (
                <DropdownMenuItem icon={TriangleAlert} tone="danger" onSelect={() => actions.perform("mark_failed")}>
                  {ACTION_LABEL.mark_failed}
                </DropdownMenuItem>
              )}
              {can(mission, "refuse") && (
                <DropdownMenuItem icon={ThumbsDown} tone="danger" onSelect={() => actions.perform("refuse")}>
                  {ACTION_LABEL.refuse}
                </DropdownMenuItem>
              )}
            </DropdownMenu>
          )
        }
      >
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-label font-normal text-foreground-muted md:justify-start">
          <MissionStatus mission={mission} />
          {mission.acceptedAt && <span>Acceptée à {formatTime(mission.acceptedAt)}</span>}
        </p>
      </ScreenHeader>

      <MissionJourney mission={mission} />

      {mission.stage === "failed" && (
        <Alert tone="danger" title="Livraison en échec">
          {[failureLabel(mission.failure?.code ?? null), mission.failure?.reason].filter((part, index, all) => part && all.indexOf(part) === index).join(" : ") || "Aucun motif n'a été enregistré."}
          {mission.failure?.at && <span className="block text-meta">Signalé le {formatDayTime(mission.failure.at)}.</span>}
        </Alert>
      )}
      {blocked && <Alert tone="warning" title={blockedReason(blocked[1]) ?? ""} />}
      {mission.stage === "awaiting_fee_payment" && <Alert tone="warning" title="Le client doit régler les frais de livraison avant que la mission ne démarre." />}

      <MissionMap mission={mission} />

      <Card className="flex flex-col gap-4">
        <h2 className="text-section-title text-foreground">Informations</h2>
        <div className="flex flex-col gap-3">
          <Place kind="pickup" name={mission.pickup.name} detail={mission.pickup.address ?? "Adresse non renseignée"} time={mission.pickedAt ? formatTime(mission.pickedAt) : null} />
          <Place kind="dropoff" name={mission.recipient.name} detail={addressLine(mission)} time={mission.deliveredAt ? formatTime(mission.deliveredAt) : null} />
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-control", iconTileClass.neutral)}>
              <Banknote className="size-[1.125rem]" aria-hidden="true" />
            </span>
            <p className="flex min-w-0 flex-col">
              {collection.amount !== null && <span className="text-body font-semibold text-foreground tabular-nums">{formatMoneyFromCents(collection.amount)}</span>}
              <span className={cn("text-label font-normal", collection.amount !== null ? "text-foreground-muted" : "text-foreground")}>{collection.label}</span>
            </p>
          </div>
        </div>

        {mission.recipient.note && (
          <p className="flex items-start gap-2 rounded-control bg-surface-subtle p-3 text-body text-foreground">
            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <span className="sr-only">Consigne du client : </span>
              {mission.recipient.note}
            </span>
          </p>
        )}

        {next.address && !over && (
          <Button asChild icon={Navigation} className="w-full">
            <a href={directionsHref(next.address)} target="_blank" rel="noreferrer">
              {next.kind === "pickup" ? "Itinéraire vers la boutique" : "Itinéraire vers le client"}
            </a>
          </Button>
        )}
      </Card>

      {mission.codMixte && <CodMixteCard mission={mission} />}

      {mission.pickups.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-section-title text-foreground">Colis à collecter</h2>
          <ul className="flex flex-col divide-y divide-border">
            {mission.pickups.map((pickup) => (
              <li key={pickup.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0">
                    <span className="block text-body font-medium text-foreground">{pickup.name ?? "Point de collecte"}</span>
                    {pickup.address && <span className="block text-label font-normal text-foreground-muted">{pickup.address}</span>}
                  </p>
                  <span className={cn("shrink-0 text-label", pickup.collected ? "text-success-fg" : "text-warning-fg")}>
                    {pickup.collected ? (pickup.collectedAt ? `Collecté à ${formatTime(pickup.collectedAt)}` : "Collecté") : "À collecter"}
                  </span>
                </div>
                {pickup.products.map((item) => (
                  <p key={item.id} className="flex justify-between gap-3 text-label font-normal text-foreground">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {item.name}
                      {item.variant && <span className="text-foreground-muted"> · {item.variant}</span>}
                    </span>
                    <span className="shrink-0 text-foreground-muted tabular-nums">× {item.quantity}</span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {mission.timeline.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-section-title text-foreground">Suivi de la commande</h2>
          <CanonicalTimeline steps={mission.timeline} storeNames={Object.fromEntries(mission.pickups.filter((pickup) => pickup.storeId && pickup.name).map((pickup) => [pickup.storeId, pickup.name]))} />
        </Card>
      )}

      {!over && primary && (
        <Button asChild variant="quiet" icon={ListChecks} className="self-center">
          <Link href={`/driver/deliveries/${mission.id}/update`}>Toutes les étapes de la mission</Link>
        </Button>
      )}

      {!over && (
        <ActionBar>
          <ContactMenu mission={mission} />
          {primary ? (
            <Button variant="primary" loading={actions.busy === primary} onClick={() => actions.perform(primary)} className="h-touch min-w-0 flex-[1.4] md:flex-none">
              {ACTION_LABEL[primary]}
            </Button>
          ) : (
            <Button asChild icon={ListChecks} className="h-touch flex-[1.4] md:flex-none">
              <Link href={`/driver/deliveries/${mission.id}/update`}>Voir les étapes</Link>
            </Button>
          )}
        </ActionBar>
      )}
      {actions.dialogs}
    </DriverPage>
  );
}

/**
 * Who the courier can reach about this mission: the customer by phone or
 * WhatsApp when a number is known, the customer and each boutique through
 * the messaging of the portal (the server opens the conversation, or refuses).
 */
function ContactMenu({ mission }: { mission: MissionDetail }) {
  const router = useRouter();
  const start = useStartCourierConversation();
  const phone = mission.recipient.phone;

  const write = async (target: "courier_customer" | "courier_store", storeId?: string) => {
    try {
      const conversation = await start.mutateAsync({ shipmentId: mission.id, target, storeId });
      router.push(`/driver/messages/${conversation.id}`);
    } catch (error) {
      toast.error(describeDriverFailure(error).message);
    }
  };

  return (
    <DropdownMenu
      align="start"
      trigger={
        <Button icon={Phone} loading={start.isPending} className="h-touch flex-1 md:flex-none">
          Contacter
        </Button>
      }
    >
      {phone && (
        <>
          <DropdownMenuItem asChild>
            <a href={telHref(phone)}>
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Appeler {mission.recipient.name ?? "le client"}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`sms:${phone.replace(/[^\d+]/g, "")}`}>
              <MessageSquareMore className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Envoyer un SMS</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={whatsappHref(phone)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">WhatsApp du client</span>
            </a>
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem icon={MessageSquareText} onSelect={() => void write("courier_customer")}>
        Écrire au client
      </DropdownMenuItem>
      {mission.pickups
        .filter((pickup) => pickup.storeId)
        .map((pickup) => (
          <DropdownMenuItem key={pickup.id} icon={Store} onSelect={() => void write("courier_store", pickup.storeId!)}>
            Écrire à {pickup.name ?? "la boutique"}
          </DropdownMenuItem>
        ))}
    </DropdownMenu>
  );
}

/** The two payments of a COD Mixte: both by mobile money, neither in cash. */
function CodMixteCard({ mission }: { mission: MissionDetail }) {
  const cod = mission.codMixte!;
  const lines = [
    { label: "Frais de livraison", amount: cod.deliveryFeeAmount, paid: cod.deliveryFeePaid, at: cod.deliveryFeePaidAt },
    { label: "Produits", amount: cod.productFeeAmount, paid: cod.productFeePaid, at: cod.productFeePaidAt },
  ];
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-section-title text-foreground">Paiement COD Mixte</h2>
        <p className="text-label font-normal text-foreground-muted">Le client règle par mobile money, en deux fois. Vous n&apos;encaissez rien en espèces.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {lines.map((line) => (
          <li key={line.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0">
              <span className="block text-body text-foreground">{line.label}</span>
              <span className={cn("flex items-center gap-1 text-label font-normal", line.paid ? "text-success-fg" : "text-warning-fg")}>
                {!line.paid && <CircleAlert className="size-3.5" aria-hidden="true" />}
                {line.paid ? (line.at ? `Payé le ${formatDayTime(line.at)}` : "Payé") : "En attente du client"}
              </span>
            </span>
            <span className="shrink-0 text-body font-medium text-foreground tabular-nums">{formatMoneyFromCents(line.amount)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
