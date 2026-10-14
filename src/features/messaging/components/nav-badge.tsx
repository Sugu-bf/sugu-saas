"use client";

import { useMemo } from "react";
import { useSession } from "@/features/auth/hooks";
import type { MessagingScope } from "../api";
import { useConversationCounts } from "../hooks";

/**
 * Conversations holding an unread message, beside « Messages » in the menu
 * of a seller or a courier. Asked to the server (a list of one row gives
 * the counts), again every two minutes and when the tab comes back; the
 * messaging screens refresh it as messages arrive. An agency reads without
 * taking part: it has nothing unread, and no badge.
 */
export function UnreadMessagesBadge() {
  const { data: user } = useSession();
  const scope = useMemo<MessagingScope | null>(() => {
    if (user?.role === "vendor") return { profile: "vendor", storeId: user.store_id };
    if (user?.role === "courier") return { profile: "courier", userId: String(user.id) };
    return null;
  }, [user]);

  // The hook is always called: a scope that reads nothing asks nothing.
  const counts = useConversationCounts(scope ?? { profile: "agency", agencyId: null }, { enabled: scope !== null });
  const unread = scope ? (counts.data?.unread ?? 0) : 0;
  if (unread <= 0) return null;

  return (
    <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-pill bg-primary px-1.5 text-meta font-semibold text-primary-foreground tabular-nums" data-unread-badge>
      <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>
      <span className="sr-only">{unread === 1 ? ", 1 conversation non lue" : `, ${unread} conversations non lues`}</span>
    </span>
  );
}
