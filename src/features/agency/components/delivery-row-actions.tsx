"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Check, Eye, MoreHorizontal, Phone, RotateCw, UserPlus, type LucideIcon } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, IconButton, cn } from "@/design-system";
import { deliveryLabel, type DeliveryRow } from "../deliveries/contract";
import { telHref } from "../format";
import { assignLabelOf, statusActionsFor, type DeliveryIntent } from "./delivery-actions";

/** What a row asks for first: a decision, a courier, a new attempt — or nothing but to be followed. */
export function primaryActionOf(delivery: DeliveryRow, followLabel: string): { label: string; icon: LucideIcon; intent: DeliveryIntent | null } {
  if (delivery.awaitingDecision) return { label: "Accepter", icon: Check, intent: { kind: "accept", delivery } };
  if (delivery.status === "delivery_failed" && delivery.canAssign) return { label: "Relancer", icon: RotateCw, intent: { kind: "assign", delivery } };
  if (delivery.canAssign && !delivery.courier) return { label: "Assigner", icon: UserPlus, intent: { kind: "assign", delivery } };
  return { label: followLabel, icon: Eye, intent: null };
}

/**
 * The actions of a delivery in a table, on the list as on the dashboard: what
 * the row asks for first as a labelled button, and the rest behind a menu.
 * The dialogs are the caller's (`DeliveryActionDialogs`), fed through `onIntent`.
 */
export function DeliveryRowActions({
  delivery,
  onIntent,
  followLabel = "Suivi",
  className = "min-w-24",
  menuOnly = false,
}: {
  delivery: DeliveryRow;
  onIntent: (intent: DeliveryIntent) => void;
  /** How the link to its page is called, for a delivery that asks for nothing. */
  followLabel?: string;
  /** Width kept for the labelled button, so the buttons of a column line up. */
  className?: string;
  /** The menu alone, for a table that lists deliveries without asking anything of them (the last ones of a courier). */
  menuOnly?: boolean;
}) {
  const router = useRouter();
  const page = `/agency/deliveries/${delivery.id}`;
  const primary = primaryActionOf(delivery, followLabel);
  const { intent } = primary;
  const transitions = statusActionsFor(delivery);
  const button = cn(className, "justify-start px-2.5");

  return (
    <>
      {menuOnly ? null : intent ? (
        <Button variant="outline" size="compact" icon={primary.icon} className={button} onClick={() => onIntent(intent)}>
          {primary.label}
        </Button>
      ) : (
        <Button asChild variant="outline" size="compact" icon={primary.icon} className={button}>
          <Link href={page}>{primary.label}</Link>
        </Button>
      )}
      <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Autres actions pour la livraison ${deliveryLabel(delivery.reference)}`} className="flex-none!" />}>
        <DropdownMenuItem icon={Eye} onSelect={() => router.push(page)}>
          Ouvrir la livraison
        </DropdownMenuItem>
        {delivery.recipient.phone && (
          <DropdownMenuItem asChild>
            <a href={telHref(delivery.recipient.phone)}>
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Appeler le client</span>
            </a>
          </DropdownMenuItem>
        )}
        {(delivery.canAssign || delivery.canReassign) && !delivery.awaitingDecision && (
          <DropdownMenuItem icon={delivery.status === "delivery_failed" ? RotateCw : UserPlus} onSelect={() => onIntent({ kind: "assign", delivery })}>
            {assignLabelOf(delivery)}
          </DropdownMenuItem>
        )}
        {transitions.length > 0 && <DropdownMenuSeparator />}
        {transitions.map(({ status, action }) => (
          <DropdownMenuItem key={status} icon={action.icon} tone={action.tone === "danger" ? "danger" : "default"} onSelect={() => onIntent({ kind: "status", delivery, status })}>
            {action.label}
          </DropdownMenuItem>
        ))}
        {delivery.awaitingDecision && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={Ban} tone="danger" onSelect={() => onIntent({ kind: "refuse", delivery })}>
              Refuser la livraison
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenu>
    </>
  );
}
