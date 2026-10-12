import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Clock, MapPin, Route, Store, type LucideIcon } from "lucide-react";
import { Button, Card, StatusBadge, cn, formatMoneyFromCents, iconTileClass } from "@/design-system";
import { formatDuration, formatTime } from "@/features/agency/format";
import { JOURNEY, collectionOf, journeyOf, type Mission } from "../missions/contract";

// The pieces every courier screen shows of a mission: where it stands, where
// the parcel is taken, where it goes, what is to be paid at the door.

export function MissionStatus({ mission, className }: { mission: Pick<Mission, "stage">; className?: string }) {
  return <StatusBadge domain="courierMission" code={mission.stage} className={className} />;
}

/** A place of the mission: the boutique (green) or the recipient (red), as the two ends of the trip. */
export function Place({ kind, name, detail, time }: { kind: "pickup" | "dropoff"; name: string | null; detail: ReactNode; time?: string | null }) {
  const Icon: LucideIcon = kind === "pickup" ? Store : MapPin;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-control", iconTileClass[kind === "pickup" ? "success" : "danger"])}>
        <Icon className="size-[1.125rem]" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="sr-only">{kind === "pickup" ? "Collecte : " : "Livraison : "}</span>
        <span className="truncate text-body font-medium text-foreground">{name ?? (kind === "pickup" ? "Point de collecte" : "Destinataire non renseigné")}</span>
        <span className="truncate text-label font-normal text-foreground-muted">{detail}</span>
      </span>
      {time && <span className="shrink-0 text-body text-foreground-muted tabular-nums">{time}</span>}
    </div>
  );
}

/** Where the parcel goes, on one line: « Secteur 22, Ouagadougou ». */
export function addressLine(mission: Pick<Mission, "recipient">): string {
  const { address, city } = mission.recipient;
  const parts = [address, city].filter((part, index, all): part is string => Boolean(part) && all.indexOf(part) === index);
  return parts.length > 0 ? parts.join(", ") : "Adresse non renseignée";
}

/** Under the boutique: when the parcel was collected, else where the boutique is. */
export function pickupLine(mission: Pick<Mission, "pickup" | "pickedAt">): string {
  if (mission.pickedAt) return `Collecté à ${formatTime(mission.pickedAt)}`;
  return mission.pickup.address ?? "Adresse non renseignée";
}

/**
 * What the courier takes at the door, and what the trip is, when the server
 * knows it. A distance or a duration nobody measured is not written.
 */
export function MissionMoney({ mission, className }: { mission: Pick<Mission, "paymentMode" | "cashToCollect" | "codMixte" | "orderTotal" | "distanceKm" | "durationMin">; className?: string }) {
  const { amount, label } = collectionOf(mission);
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-1", className)}>
      <p className="flex min-w-0 flex-col">
        {amount !== null && <span className="text-section-title font-semibold text-foreground tabular-nums">{formatMoneyFromCents(amount)}</span>}
        <span className={cn("text-label font-normal", amount !== null ? "text-foreground-muted" : "text-foreground")}>{label}</span>
      </p>
      {(mission.distanceKm !== null || mission.durationMin !== null) && (
        <p className="flex shrink-0 items-center gap-3 text-label font-normal text-foreground-muted tabular-nums">
          {mission.distanceKm !== null && (
            <span className="inline-flex items-center gap-1">
              <Route className="size-4 text-foreground-subtle" aria-hidden="true" />
              {mission.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km
            </span>
          )}
          {mission.durationMin !== null && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4 text-foreground-subtle" aria-hidden="true" />
              {formatDuration(mission.durationMin)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * A mission in a list: its number, where it stands, the two ends of the
 * trip, what is to be collected, and the one thing to do now.
 */
export function MissionCard({ mission, action, headingLevel = 3 }: { mission: Mission; action: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  return (
    <Card data-mission={mission.id} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Heading className="min-w-0 text-section-title text-foreground tabular-nums [overflow-wrap:anywhere]">
          {/* A mission that is free in the agency has no page yet: it is not the courier's own. */}
          {mission.mine ? (
            <Link href={`/driver/deliveries/${mission.id}`} className="rounded-compact underline-offset-2 hover:underline">
              {mission.reference ?? "Mission"}
            </Link>
          ) : (
            (mission.reference ?? "Mission")
          )}
        </Heading>
        <MissionStatus mission={mission} className="shrink-0" />
      </div>
      <div className="flex flex-col gap-2.5">
        <Place kind="pickup" name={mission.pickup.name} detail={pickupLine(mission)} />
        <Place kind="dropoff" name={mission.recipient.name} detail={addressLine(mission)} />
      </div>
      <MissionMoney mission={mission} />
      {action}
    </Card>
  );
}

/** The button of a card that opens the page of the mission. */
export function OpenMission({ mission, children }: { mission: Pick<Mission, "id">; children: ReactNode }) {
  return (
    <Button asChild variant="primary" className="h-touch w-full">
      <Link href={`/driver/deliveries/${mission.id}`}>{children}</Link>
    </Button>
  );
}

/**
 * The four steps of a mission, and how far this one is. Read as a list:
 * each step says whether it is done, in progress or to come.
 */
export function MissionJourney({ mission }: { mission: Pick<Mission, "stage" | "acceptedAt" | "pickedAt"> }) {
  const states = journeyOf(mission);
  return (
    <ol aria-label="Avancement de la mission" className="flex items-start">
      {JOURNEY.map((step, index) => {
        const state = states[index];
        return (
          <li key={step.key} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {/* The line to the previous step, drawn behind the dots. */}
            {index > 0 && <span aria-hidden="true" className={cn("absolute top-3 right-1/2 h-0.5 w-full -translate-y-1/2", state === "upcoming" ? "bg-border" : "bg-success-icon")} />}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-[1] flex size-6 items-center justify-center rounded-pill border-2",
                state === "done" && "border-success-icon bg-success-icon text-surface",
                state === "current" && "border-info-icon bg-info-icon text-surface",
                state === "upcoming" && "border-border-strong bg-surface",
              )}
            >
              {state !== "upcoming" && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className={cn("max-w-full truncate px-0.5 text-meta", state === "current" ? "font-medium text-info-fg" : state === "done" ? "text-foreground" : "text-foreground-muted")}>
              {step.label}
              <span className="sr-only">{state === "done" ? " : fait" : state === "current" ? " : en cours" : " : à venir"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
