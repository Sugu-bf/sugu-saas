import { MapPin, Navigation, Store } from "lucide-react";
import { cn } from "@/design-system";
import { StaticMap } from "@/features/agency/components/static-map";
import type { MissionDetail } from "../missions/contract";
import { addressLine, pickupLine } from "./mission-bits";

// Where the parcel is collected and where it goes, on a map — when the
// addresses of the mission carry coordinates. Two places and nothing else:
// no position of the courier, no route, no distance. « Voir l'itinéraire »
// opens a real map application, which computes its own.

/** Directions to an address, in the map application of the device. */
export const directionsHref = (destination: string): string => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

/** Where the courier goes next: the boutique until the parcel is collected, the customer after. */
export function nextStopOf(mission: Pick<MissionDetail, "stage" | "pickup" | "recipient">): { kind: "pickup" | "dropoff"; address: string | null } {
  const beforeCollection = ["available", "to_accept", "awaiting_fee_payment", "to_collect"].includes(mission.stage);
  return beforeCollection ? { kind: "pickup", address: mission.pickup.address } : { kind: "dropoff", address: [mission.recipient.address, mission.recipient.city].filter(Boolean).join(", ") || null };
}

function Pin({ kind }: { kind: "pickup" | "dropoff" }) {
  const Icon = kind === "pickup" ? Store : MapPin;
  return (
    <span className={cn("flex size-8 items-center justify-center rounded-pill border-2 border-surface text-surface", kind === "pickup" ? "bg-info-icon" : "bg-primary")}>
      <Icon className="size-4" />
    </span>
  );
}

export function MissionMap({ mission }: { mission: MissionDetail }) {
  const next = nextStopOf(mission);
  const { pickup, dropoff } = mission.positions;
  // Centred on where the courier goes next; the other place is drawn when it falls in the frame.
  const centre = next.kind === "pickup" ? (pickup ?? dropoff) : (dropoff ?? pickup);
  if (!centre) return null;

  const centreKind: "pickup" | "dropoff" = centre === pickup ? "pickup" : "dropoff";
  const other = centreKind === "pickup" ? dropoff : pickup;
  const caption = centreKind === "pickup" ? { title: mission.pickup.name ?? "Point de collecte", line: pickupLine(mission) } : { title: mission.recipient.name ?? "Destinataire", line: addressLine(mission) };

  return (
    <StaticMap
      lat={centre.lat}
      lng={centre.lng}
      label={centreKind === "pickup" ? `Carte du point de collecte : ${caption.title}` : `Carte de l'adresse de livraison : ${caption.title}`}
      marker={<Pin kind={centreKind} />}
      others={other ? [{ ...other, marker: <Pin kind={centreKind === "pickup" ? "dropoff" : "pickup"} /> }] : []}
      className="h-56 rounded-panel"
    >
      <p className="flex max-w-full flex-col rounded-control border border-border bg-surface px-3 py-2">
        <span className="truncate text-label text-foreground">{caption.title}</span>
        <span className="truncate text-meta text-foreground-muted">{caption.line}</span>
      </p>
      {next.address && (
        <a
          href={directionsHref(next.address)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex h-control items-center gap-1.5 rounded-button border border-border bg-surface px-3 text-label text-info-fg hover:bg-surface-subtle touch:h-touch"
        >
          <Navigation className="size-3.5" aria-hidden="true" />
          Voir l&apos;itinéraire
        </a>
      )}
    </StaticMap>
  );
}
