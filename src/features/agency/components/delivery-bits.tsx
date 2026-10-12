import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Avatar, Badge, StatusBadge, cn } from "@/design-system";
import { deliveryLabel, displayStatusOf, type DeliveryCourier, type DeliveryRow } from "../deliveries/contract";
import { shortName } from "../format";

// Small pieces every agency screen shows of a delivery: its status in the
// agency's words, its payment, who carries it, where it goes.

type StatusSource = Pick<DeliveryRow, "status" | "awaitingDecision" | "late">;

/**
 * The status as the agency reads it, with « En retard » next to it when the
 * promised time has passed. `late="icon"` keeps that mark to a clock, for a
 * column with no room for two labels; its name stays for assistive tech.
 * `stacked` puts « En retard » under the status: in the heading of a phone
 * card, two labels side by side pushed the number of the delivery under them.
 */
export function DeliveryStatus({
  delivery,
  late = "label",
  stacked = false,
  className,
}: {
  delivery: StatusSource;
  late?: "label" | "icon";
  stacked?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex gap-1", stacked ? "flex-col items-end" : "items-center", late === "label" && !stacked && "flex-wrap", className)}>
      <StatusBadge domain="agencyDelivery" code={displayStatusOf(delivery)} />
      {delivery.late &&
        (late === "icon" ? (
          <Badge tone="danger" title="En retard : l'heure annoncée au client est dépassée." className="px-1">
            <Clock className="size-3.5 text-danger-icon" aria-hidden="true" />
            <span className="sr-only">En retard</span>
          </Badge>
        ) : (
          <Badge tone="danger" icon={Clock} title="L'heure annoncée au client est dépassée.">
            En retard
          </Badge>
        ))}
    </span>
  );
}

type PaymentSource = Pick<DeliveryRow, "paymentStatus" | "codMixte" | "manual">;

/**
 * The payment code to show for a delivery. COD Mixte is paid in two steps:
 * its badge follows the two fees, not the order's own status. A delivery the
 * agency entered as « à encaisser à la livraison » is stored as an order
 * whose payment is pending: it is cash to collect, as its form said.
 */
export function paymentCodeOf(delivery: PaymentSource): string | null {
  const cod = delivery.codMixte;
  if (cod) {
    if (cod.deliveryFeePaid && cod.productFeePaid) return "paid";
    return cod.deliveryFeePaid || cod.productFeePaid ? "partial" : "cod_pending";
  }
  if (delivery.manual && delivery.paymentStatus === "pending") return "cod_pending";
  return delivery.paymentStatus;
}

export function DeliveryPayment({ delivery, className }: { delivery: PaymentSource; className?: string }) {
  return <StatusBadge domain="deliveryPayment" code={paymentCodeOf(delivery)} className={className} />;
}

/** The number of a delivery, linking to its page. */
export function DeliveryLink({ delivery, className }: { delivery: Pick<DeliveryRow, "id" | "reference">; className?: string }) {
  return (
    <Link
      href={`/agency/deliveries/${delivery.id}`}
      className={cn("rounded-compact font-semibold whitespace-nowrap text-foreground tabular-nums underline-offset-2 hover:underline", className)}
    >
      {deliveryLabel(delivery.reference)}
    </Link>
  );
}

/** Who receives the parcel: the name, and the phone under it. */
export function Recipient({ delivery }: { delivery: Pick<DeliveryRow, "recipient"> }) {
  const { name, phone } = delivery.recipient;
  return (
    <span className="flex min-w-0 flex-col">
      {/* One line in a table cell: the whole name is its tooltip, as for the address. */}
      <span className="truncate font-medium text-foreground" title={name ?? undefined}>
        {name ?? <span className="font-normal text-foreground-muted">Destinataire non renseigné</span>}
      </span>
      {phone && <span className="truncate text-meta text-foreground-muted tabular-nums">{phone}</span>}
    </span>
  );
}

/**
 * Where it goes: the address, then the zone or the city. In a table cell
 * the address keeps to one line (the whole of it is its tooltip); `wrap`
 * lets it run on, where there is room for it.
 */
export function Destination({ delivery, icon = true, wrap = false }: { delivery: Pick<DeliveryRow, "recipient" | "zone">; icon?: boolean; wrap?: boolean }) {
  const { address, city } = delivery.recipient;
  const place = delivery.zone?.name ?? city;
  if (!address && !place) return <span className="text-foreground-muted">Adresse non renseignée</span>;
  return (
    <span className="flex min-w-0 items-start gap-2">
      {icon && <MapPin className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />}
      <span className="flex min-w-0 flex-col">
        <span className={cn("text-foreground", wrap ? "break-words" : "truncate")} title={wrap ? undefined : (address ?? place ?? undefined)}>
          {address ?? place}
        </span>
        {address && place && <span className="truncate text-meta text-foreground-muted">{place}</span>}
      </span>
    </span>
  );
}

/**
 * Who carries the parcel, linking to his page; « Non assigné » when nobody
 * does yet. `short` writes « Moussa K. » where a column has no room for the
 * whole name, which stays its tooltip and what assistive tech reads.
 */
export function CourierIdentity({ courier, size = "sm", short = false }: { courier: Pick<DeliveryCourier, "id" | "name"> | null; size?: "sm" | "md"; short?: boolean }) {
  if (!courier) return <span className="text-foreground-muted">Non assigné</span>;
  return (
    <Link href={`/agency/drivers/${courier.id}`} title={short ? courier.name : undefined} className="group inline-flex max-w-full items-center gap-2 rounded-compact">
      <Avatar name={courier.name} size={size} />
      {short ? (
        <span className="truncate text-foreground underline-offset-2 group-hover:underline">
          <span aria-hidden="true">{shortName(courier.name)}</span>
          <span className="sr-only">{courier.name}</span>
        </span>
      ) : (
        <span className="truncate text-foreground underline-offset-2 group-hover:underline">{courier.name}</span>
      )}
    </Link>
  );
}
