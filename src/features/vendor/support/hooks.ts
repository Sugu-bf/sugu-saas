"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { describeFailureWith, type Failure } from "@/lib/http/failure";
import { closeTicket, createTicket, fetchReplies, fetchTicket, fetchTickets, sendReply, type OutgoingReply, type TicketQuery } from "./api";
import type { NewTicket, ReplyPage } from "./contract";
import { kindFields, useSupportDesk } from "./desk";

/** One cache per desk: a seller who is also a Lanabaga never sees one list in the other. */
export const supportKeys = {
  all: ["support"] as const,
  desk: (desk: string) => ["support", desk] as const,
  lists: (desk: string) => ["support", desk, "list"] as const,
  list: (desk: string, query: TicketQuery) => ["support", desk, "list", query] as const,
  ticket: (desk: string, id: string) => ["support", desk, "ticket", id] as const,
  replies: (desk: string, id: string) => ["support", desk, "replies", id] as const,
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
export function useTickets(query: TicketQuery) {
  const desk = useSupportDesk();
  return useQuery({ queryKey: supportKeys.list(desk.id, query), queryFn: () => fetchTickets(desk.apiBase, query), placeholderData: keepPreviousData, staleTime: 15_000, refetchOnWindowFocus: true, refetchInterval: 60_000 });
}

export function useTicket(id: string | null) {
  const desk = useSupportDesk();
  return useQuery({ queryKey: supportKeys.ticket(desk.id, id ?? ""), queryFn: () => fetchTicket(desk.apiBase, id!), enabled: Boolean(id), retry: false, staleTime: 10_000, refetchOnWindowFocus: true, refetchInterval: 30_000 });
}

export function useReplies(id: string) {
  const desk = useSupportDesk();
  return useInfiniteQuery({
    queryKey: supportKeys.replies(desk.id, id),
    queryFn: ({ pageParam }) => fetchReplies(desk.apiBase, id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (oldest) => (oldest.hasMore && oldest.replies[0] ? oldest.replies[0].id : undefined),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
}

/** A ticket exists once the server has answered it: the list is read again, then. */
export function useCreateTicket(storeId: string | null) {
  const desk = useSupportDesk();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: NewTicket) => {
      if (desk.needsStore && !storeId) throw new Error("Boutique inconnue.");
      return createTicket(desk.apiBase, values, kindFields(desk, values.category), desk.needsStore ? storeId : null);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.lists(desk.id) }),
  });
}

export function useSendReply(id: string) {
  const desk = useSupportDesk();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reply: OutgoingReply) => sendReply(desk.apiBase, id, reply),
    onSuccess: (reply) => {
      queryClient.setQueryData<InfiniteData<ReplyPage, string | null>>(supportKeys.replies(desk.id, id), (cache) => {
        if (!cache || cache.pages.length === 0) return cache;
        if (cache.pages.some((page) => page.replies.some((known) => known.id === reply.id))) return cache;
        const [newest, ...older] = cache.pages;
        return { ...cache, pages: [{ ...newest, replies: [...newest.replies, reply] }, ...older] };
      });
      // A reply may reopen the ticket: its status and its row are asked again.
      queryClient.invalidateQueries({ queryKey: supportKeys.ticket(desk.id, id) });
      queryClient.invalidateQueries({ queryKey: supportKeys.lists(desk.id) });
    },
  });
}

export function useCloseTicket(id: string) {
  const desk = useSupportDesk();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => closeTicket(desk.apiBase, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: supportKeys.desk(desk.id) }),
  });
}
