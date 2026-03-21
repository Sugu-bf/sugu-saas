"use client";

/**
 * Messaging React Query Hooks — Agency (Read-Only)
 * 3 queries, 0 mutations — the agency can only observe.
 */
import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  getAgencyConversations,
  getAgencyConversation,
  getAgencyMessages,
  type AgencyConversationsResult,
} from "../services/messaging.service";
import type { Message } from "@/lib/messaging/types";

// ── Queries ────────────────────────────────────────────────

export function useAgencyConversations(
  agencyId: string | undefined,
  filters?: { status?: string; courier_id?: string; q?: string },
) {
  return useQuery<AgencyConversationsResult>({
    queryKey: queryKeys.agency.conversations(filters),
    queryFn: () => getAgencyConversations(agencyId!, filters),
    enabled: !!agencyId,
    staleTime: 30_000,
  });
}

export function useAgencyConversation(
  agencyId: string | undefined,
  convId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.agency.conversation(convId ?? ""),
    queryFn: () => getAgencyConversation(agencyId!, convId!),
    enabled: !!agencyId && !!convId,
    staleTime: 60_000,
  });
}

interface MessagesPage {
  messages: Message[];
  has_more: boolean;
}

export function useAgencyMessages(
  agencyId: string | undefined,
  convId: string | null,
) {
  return useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage>,
    ReturnType<typeof queryKeys.agency.messages>,
    string | undefined
  >({
    queryKey: queryKeys.agency.messages(convId ?? ""),
    queryFn: async ({ pageParam }) => {
      const res = await getAgencyMessages(agencyId!, convId!, {
        before_id: pageParam,
        limit: 30,
      });
      return res.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.messages.length === 0)
        return undefined;
      return lastPage.messages[lastPage.messages.length - 1].id;
    },
    enabled: !!agencyId && !!convId,
    staleTime: 30_000,
  });
}
