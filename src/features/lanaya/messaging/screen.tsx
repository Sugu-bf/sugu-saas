"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/features/auth/hooks";
import type { MessagingScope } from "@/features/messaging/api";
import { MessagingWorkspace, type ThreadExtras } from "@/features/messaging/components/workspace";

// ============================================================
// Messages of a Lanabaga (DEC-33): one conversation per store SUGU
// entrusted to them, with its seller. Nothing of the store's buyers,
// no phone number: the server sends none, and masks the ones typed.
// ============================================================

/** A Lanabaga calls nobody from here and opens no customer record: the store, and that is all. */
function useLanabagaExtras(): ThreadExtras {
  return { phone: null, links: { profile: null, orders: null, context: { label: "Mes vendeurs", href: "/lanabaga/sellers" }, product: () => null } };
}

export function LanabagaMessaging() {
  const params = useParams<{ conversationId?: string }>();
  const { data: user } = useSession();
  const userId = user?.lanaya?.can_work ? String(user.id) : null;
  const scope = useMemo<MessagingScope>(() => ({ profile: "lanabaga", userId }), [userId]);

  return <MessagingWorkspace scope={scope} viewerId={user ? String(user.id) : null} conversationId={params.conversationId ?? null} useExtras={useLanabagaExtras} />;
}
