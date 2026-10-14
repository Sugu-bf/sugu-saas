"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/features/auth/hooks";
import { useMission } from "@/features/driver/missions/hooks";
import type { MessagingScope } from "@/features/messaging/api";
import type { Conversation } from "@/features/messaging/contract";
import { MessagingWorkspace, type ThreadExtras } from "@/features/messaging/components/workspace";

// ============================================================
// Messages of a courier: the buyer or the store of a mission.
// A phone first: this is read on the road.
// ============================================================

/**
 * The mission the conversation is about, and the buyer's number while the
 * mission is running: the same number the page of the mission shows, read
 * from the same route. Nothing else of the mission comes here.
 */
function useCourierExtras(conversation: Conversation): ThreadExtras {
  const running = conversation.shipment?.active === true && conversation.shipmentId !== null;
  // An empty identifier asks nothing.
  const mission = useMission(running ? conversation.shipmentId! : "");
  const phone = running && conversation.peer.type === "customer" ? (mission.data?.recipient.phone ?? null) : null;

  return {
    phone,
    links: {
      context: conversation.shipmentId
        ? { label: conversation.orderNumber ? `Mission ${conversation.orderNumber}` : "Voir la mission", href: `/driver/deliveries/${conversation.shipmentId}` }
        : null,
    },
  };
}

export function CourierMessaging() {
  const params = useParams<{ conversationId?: string }>();
  const { data: user } = useSession();
  const userId = user ? String(user.id) : null;
  const scope = useMemo<MessagingScope>(() => ({ profile: "courier", userId }), [userId]);

  return <MessagingWorkspace scope={scope} viewerId={userId} conversationId={params.conversationId ?? null} useExtras={useCourierExtras} />;
}
