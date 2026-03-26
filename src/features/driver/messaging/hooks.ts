"use client";

/**
 * Messaging React Query Hooks — Courier
 * Typed wrappers around TanStack Query for the messaging feature.
 */
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  getCourierConversations,
  getCourierConversation,
  getCourierMessages,
  sendCourierMessage,
  sendCourierProductCard,
  markCourierRead,
  sendCourierTyping,
  getCourierPresence,
  reportCourierMessage,
  getRecommendedProducts,
} from "../services/messaging.service";
import type { Message } from "@/lib/messaging/types";

// ── Queries ────────────────────────────────────────────────

export function useCourierConversations(filters?: {
  status?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: queryKeys.driver.conversations(filters),
    queryFn: () => getCourierConversations(filters),
    staleTime: 30_000,
  });
}

export function useCourierConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.driver.conversation(id ?? ""),
    queryFn: () => getCourierConversation(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

interface MessagesPage {
  messages: Message[];
  has_more: boolean;
}

export function useCourierMessages(convId: string | null) {
  return useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage>,
    ReturnType<typeof queryKeys.driver.messages>,
    string | undefined
  >({
    queryKey: queryKeys.driver.messages(convId ?? ""),
    queryFn: ({ pageParam }) =>
      getCourierMessages(convId!, {
        before_id: pageParam,
        limit: 30,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.messages.length === 0)
        return undefined;
      // Fix: use the oldest message (first) as cursor for loading older messages
      return lastPage.messages[0].id;
    },
    enabled: !!convId,
    staleTime: 30_000,
  });
}

export function useCourierPresence(convId: string | null) {
  return useQuery({
    queryKey: queryKeys.driver.presence(convId ?? ""),
    queryFn: () => getCourierPresence(convId!),
    enabled: !!convId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useRecommendedProducts(convId: string | null) {
  return useQuery({
    queryKey: queryKeys.driver.recommendedProducts(convId ?? ""),
    queryFn: () => getRecommendedProducts(convId!),
    enabled: !!convId,
    staleTime: 5 * 60_000,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useSendCourierMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      convId,
      body,
      attachments,
    }: {
      convId: string;
      body: string;
      attachments?: File[];
    }) => sendCourierMessage(convId, body, attachments),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.driver.messages(variables.convId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.driver.conversations(),
      });
    },
  });
}

export function useSendCourierProductCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      convId,
      productId,
      body,
    }: {
      convId: string;
      productId: string;
      body?: string;
    }) => sendCourierProductCard(convId, productId, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.driver.messages(variables.convId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.driver.conversations(),
      });
    },
  });
}

export function useMarkCourierAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      convId,
      lastReadMessageId,
    }: {
      convId: string;
      lastReadMessageId: string;
    }) => markCourierRead(convId, lastReadMessageId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.driver.conversations(),
      });
    },
  });
}

// removed unsupported hooks

export function useReportMessage() {
  return useMutation({
    mutationFn: ({
      convId,
      msgId,
      reason,
    }: {
      convId: string;
      msgId: string;
      reason: string;
    }) => reportCourierMessage(convId, msgId, reason),
  });
}

export { sendCourierTyping };
