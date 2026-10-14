"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/features/auth/hooks";
import type { MessagingScope } from "@/features/messaging/api";
import type { Conversation } from "@/features/messaging/contract";
import { MessagingWorkspace, type ThreadExtras } from "@/features/messaging/components/workspace";

// ============================================================
// Messages of a seller: the buyers of the store, and the couriers
// who come to collect an order.
// ============================================================

/**
 * Where a seller goes from a conversation. The customer page and the phone
 * exist only once the buyer is a customer of the store: Laravel then gives
 * the record the seller already reads in « Clients ».
 */
function useVendorExtras(conversation: Conversation): ThreadExtras {
  const buyer = conversation.peer.type === "customer";
  const record = conversation.customerRecord;

  return {
    phone: buyer ? (record?.phone ?? null) : null,
    links: {
      profile: buyer && record?.id ? `/vendor/clients?client=${encodeURIComponent(record.id)}` : null,
      orders: buyer && record?.id ? `/vendor/orders?q=${encodeURIComponent(conversation.peer.name)}` : null,
      context: conversation.orderId && conversation.orderNumber ? { label: `Commande ${conversation.orderNumber}`, href: `/vendor/orders/${conversation.orderId}` } : null,
      product: (productId) => `/vendor/products/${encodeURIComponent(productId)}`,
    },
  };
}

export function VendorMessaging() {
  const params = useParams<{ conversationId?: string }>();
  const { data: user } = useSession();
  const storeId = user?.store_id ?? null;
  const scope = useMemo<MessagingScope>(() => ({ profile: "vendor", storeId }), [storeId]);

  return <MessagingWorkspace scope={scope} viewerId={user ? String(user.id) : null} conversationId={params.conversationId ?? null} useExtras={useVendorExtras} />;
}
