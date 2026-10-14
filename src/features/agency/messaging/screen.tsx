"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { Avatar, Button, Skeleton, StatusBadge } from "@/design-system";
import { useSession } from "@/features/auth/hooks";
import { useCouriers } from "@/features/agency/couriers/hooks";
import { displayStatusOf } from "@/features/agency/deliveries/contract";
import { useDelivery } from "@/features/agency/deliveries/hooks";
import { telHref } from "@/features/agency/format";
import { useAgencyId } from "@/features/agency/session";
import type { MessagingScope } from "@/features/messaging/api";
import type { Conversation } from "@/features/messaging/contract";
import type { CourierOption } from "@/features/messaging/components/conversation-list";
import { MessagingWorkspace, type ThreadExtras } from "@/features/messaging/components/workspace";

// ============================================================
// Conversations of an agency: supervision, read-only.
//
// The agency reads what its couriers and their correspondents write
// about ITS deliveries. Nothing here writes, marks as read, closes
// or blocks, and Laravel has no route that would let it.
// ============================================================

/**
 * The mission beside the conversation: what the page of the delivery
 * already shows the agency, read from the same route.
 */
function MissionPanel({ conversation }: { conversation: Conversation }) {
  const delivery = useDelivery(conversation.shipmentId ?? "");
  const mission = delivery.data;

  return (
    <div className="space-y-4 p-4" data-mission-panel>
      <h3 className="text-section-title text-foreground">Mission</h3>

      {delivery.isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement de la mission">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !mission ? (
        <p className="text-body text-foreground-muted">{conversation.shipmentId ? "La fiche de cette livraison n'a pas pu être chargée." : "Cette conversation n'est rattachée à aucune livraison."}</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-body font-semibold text-foreground tabular-nums">{mission.reference ?? conversation.orderNumber ?? "Livraison"}</p>
            <StatusBadge domain="agencyDelivery" code={displayStatusOf(mission)} />
          </div>

          <dl className="space-y-4 border-t border-border pt-4">
            <Person label="Client" name={mission.recipient.name} phone={mission.recipient.phone} />
            <Person label="Coursier" name={mission.courier?.name ?? conversation.courier?.name ?? null} phone={mission.courier?.phone ?? null} />
            {(mission.recipient.address || mission.recipient.city) && (
              <div>
                <dt className="text-meta text-foreground-subtle">Adresse</dt>
                <dd className="mt-1 flex gap-2 text-body text-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                  <span>
                    {mission.recipient.address && <span className="block">{mission.recipient.address}</span>}
                    {mission.recipient.city && <span className="block text-foreground-muted">{mission.recipient.city}</span>}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </>
      )}

      {conversation.shipmentId && (
        <Button asChild variant="outline" className="w-full">
          <Link href={`/agency/deliveries/${conversation.shipmentId}`}>Voir la livraison</Link>
        </Button>
      )}
    </div>
  );
}

function Person({ label, name, phone }: { label: string; name: string | null; phone: string | null }) {
  if (!name && !phone) return null;
  return (
    <div>
      <dt className="text-meta text-foreground-subtle">{label}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <Avatar name={name ?? label} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-body font-medium text-foreground">{name ?? "Non renseigné"}</span>
          {phone && (
            <a href={telHref(phone)} className="flex items-center gap-1 text-label text-foreground-muted tabular-nums hover:text-foreground">
              <Phone className="size-3.5" aria-hidden="true" />
              {phone}
            </a>
          )}
        </span>
      </dd>
    </div>
  );
}

function useAgencyExtras(conversation: Conversation): ThreadExtras {
  const state = conversation.shipment ? (conversation.shipment.active ? "Mission en cours" : "Mission terminée") : null;

  return {
    phone: null,
    subtitle: [conversation.courier?.name, state].filter(Boolean).join(" · ") || null,
    links: {
      context: conversation.shipmentId ? { label: `Livraison ${conversation.orderNumber ?? ""}`.trim(), href: `/agency/deliveries/${conversation.shipmentId}` } : null,
    },
    panel: <MissionPanel conversation={conversation} />,
  };
}

export function AgencyMessaging() {
  const params = useParams<{ conversationId?: string }>();
  const { data: user } = useSession();
  const agencyId = useAgencyId();
  const scope = useMemo<MessagingScope>(() => ({ profile: "agency", agencyId }), [agencyId]);

  // The couriers of the agency, for the filter: the first hundred, by name.
  const couriers = useCouriers({ page: 1, pageSize: 100, sort: "name", direction: "asc" });
  const options = useMemo<CourierOption[]>(() => (couriers.data?.rows ?? []).map((courier) => ({ id: courier.userId, name: courier.name })), [couriers.data]);

  return <MessagingWorkspace scope={scope} viewerId={user ? String(user.id) : null} conversationId={params.conversationId ?? null} couriers={options} useExtras={useAgencyExtras} />;
}
