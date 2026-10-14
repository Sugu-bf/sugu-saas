"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { describeFailureWith, type Failure } from "@/lib/http/failure";
import { closeTicket, createTicket, fetchReplies, fetchTicket, fetchTickets, sendReply, type OutgoingReply, type TicketQuery } from "./api";
import type { NewTicket, ReplyPage } from "./contract";

export const supportKeys = {
  all: ["support"] as const,
  lists: () => ["support", "list"] as const,
  list: (query: TicketQuery) => ["support", "list", query] as const,
  ticket: (id: string) => ["support", "ticket", id] as const,
  replies: (id: string) => ["support", "replies", id] as const,
};

const WORDING = {
  not_found: "Ce ticket est introuvable.",
  forbidden: "Vous n'avez pas accès à ce ticket.",
  throttled: "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.",
};

export const describeSupportFailure = (error: unknown): Failure => describeFailureWith(error, WORDING);

// The support team answers while the seller looks: the list and the open
// ticket are asked again when the page comes back to the front, and every
// half minute while it stays open.
export const useTickets = (query: TicketQuery) =>
  useQuery({ queryKey: supportKeys.list(query), queryFn: () => fetchTickets(query), placeholderData: keepPreviousData, staleTime: 15_000, refetchOnWindowFocus: true, refetchInterval: 60_000 });

export const useTicket = (id: string | null) =>
  useQuery({ queryKey: supportKeys.ticket(id ?? ""), queryFn: () => fetchTicket(id!), enabled: Boolean(id), retry: false, staleTime: 10_000, refetchOnWindowFocus: true, refetchInterval: 30_000 });

export function useReplies(id: string) {
  return useInfiniteQuery({
    queryKey: supportKeys.replies(id),
    queryFn: ({ pageParam }) => fetchReplies(id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (oldest) => (oldest.hasMore && oldest.replies[0] ? oldest.replies[0].id : undefined),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
}

/** A ticket exists once the server has answered it: the list is read again, then. */
export function useCreateTicket(storeId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: NewTicket) => {
      if (!storeId) throw new Error("Boutique inconnue.");
      return createTicket(values, storeId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.lists() }),
  });
}

export function useSendReply(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reply: OutgoingReply) => sendReply(id, reply),
    onSuccess: (reply) => {
      queryClient.setQueryData<InfiniteData<ReplyPage, string | null>>(supportKeys.replies(id), (cache) => {
        if (!cache || cache.pages.length === 0) return cache;
        if (cache.pages.some((page) => page.replies.some((known) => known.id === reply.id))) return cache;
        const [newest, ...older] = cache.pages;
        return { ...cache, pages: [{ ...newest, replies: [...newest.replies, reply] }, ...older] };
      });
      // A reply may reopen the ticket: its status and its row are asked again.
      queryClient.invalidateQueries({ queryKey: supportKeys.ticket(id) });
      queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}

export function useCloseTicket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => closeTicket(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
