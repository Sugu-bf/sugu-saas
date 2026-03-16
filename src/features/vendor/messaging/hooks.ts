"use client";

/**
 * Messaging React Query Hooks — Seller
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
  getSellerConversations,
  getSellerConversation,
  getSellerMessages,
  sendSellerMessage,
  sendSellerProductCard,
  markSellerRead,
  sendSellerTyping,
  getSellerPresence,
  reportSellerMessage,
  closeConversation,
  blockConversation,
  getRecommendedProducts,
} from "../services/messaging.service";
import type { Message } from "@/lib/messaging/types";

// ── Queries ────────────────────────────────────────────────

export function useSellerConversations(filters?: {
  status?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendor.conversations(filters),
    queryFn: () => getSellerConversations(filters),
    staleTime: 30_000,
  });
}

export function useSellerConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.vendor.conversation(id ?? ""),
    queryFn: () => getSellerConversation(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

interface MessagesPage {
  messages: Message[];
  has_more: boolean;
}

export function useSellerMessages(convId: string | null) {
  return useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage>,
    ReturnType<typeof queryKeys.vendor.messages>,
    string | undefined
  >({
    queryKey: queryKeys.vendor.messages(convId ?? ""),
    queryFn: ({ pageParam }) =>
      getSellerMessages(convId!, {
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

export function useSellerPresence(convId: string | null) {
  return useQuery({
    queryKey: queryKeys.vendor.presence(convId ?? ""),
    queryFn: () => getSellerPresence(convId!),
    enabled: !!convId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useRecommendedProducts(convId: string | null) {
  return useQuery({
    queryKey: queryKeys.vendor.recommendedProducts(convId ?? ""),
    queryFn: () => getRecommendedProducts(convId!),
    enabled: !!convId,
    staleTime: 5 * 60_000,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useSendSellerMessage() {
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
    }) => sendSellerMessage(convId, body, attachments),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.messages(variables.convId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
    },
  });
}

export function useSendSellerProductCard() {
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
    }) => sendSellerProductCard(convId, productId, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.messages(variables.convId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
    },
  });
}

export function useMarkSellerAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      convId,
      lastReadMessageId,
    }: {
      convId: string;
      lastReadMessageId: string;
    }) => markSellerRead(convId, lastReadMessageId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
    },
  });
}

export function useCloseConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (convId: string) => closeConversation(convId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
    },
  });
}

export function useBlockConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (convId: string) => blockConversation(convId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
    },
  });
}

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
    }) => reportSellerMessage(convId, msgId, reason),
  });
}

export { sendSellerTyping };
