"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { describeFailureWith, type Failure } from "@/lib/http/failure";
import {
  blockConversation,
  channelOf,
  closeConversation,
  fetchConversation,
  fetchConversationCounts,
  fetchConversations,
  fetchMessages,
  fetchPresence,
  fetchShareableProducts,
  basePath,
  markRead,
  reportMessage,
  scopeKey,
  sendMessage,
  sendProductCard,
  sendTyping,
  startCourierConversation,
  type ConversationFilters,
  type MessagingScope,
} from "./api";
import type { Conversation, ConversationPage, Message, MessagePage } from "./contract";
import { mergeMessages, newClientId, stillPending, type PendingMessage } from "./outbox";
import { useMessagingChannel, useSocketState } from "./realtime";

// ============================================================
// Messaging — queries, the outbox, and what an event changes.
// ============================================================

export const messagingKeys = {
  all: (scope: MessagingScope) => ["messaging", scopeKey(scope)] as const,
  lists: (scope: MessagingScope) => ["messaging", scopeKey(scope), "list"] as const,
  list: (scope: MessagingScope, filters: ConversationFilters) => ["messaging", scopeKey(scope), "list", filters] as const,
  counts: (scope: MessagingScope) => ["messaging", scopeKey(scope), "list", "counts"] as const,
  conversation: (scope: MessagingScope, id: string) => ["messaging", scopeKey(scope), "conversation", id] as const,
  messages: (scope: MessagingScope, id: string) => ["messaging", scopeKey(scope), "messages", id] as const,
  presence: (scope: MessagingScope, id: string) => ["messaging", scopeKey(scope), "presence", id] as const,
  products: (id: string, search: string) => ["messaging", "products", id, search] as const,
};

/** How often the API is asked while the socket is not there to say that something happened. */
const FALLBACK_POLL_MS = 15_000;

const WORDING = {
  not_found: "Cette conversation est introuvable.",
  forbidden: "Vous ne pouvez pas écrire dans cette conversation.",
  throttled: "Trop de messages en peu de temps. Patientez une minute, puis réessayez.",
};

export const describeMessagingFailure = (error: unknown): Failure => describeFailureWith(error, WORDING);

/** True once the scope names who is reading (an agency account whose agency is not known yet reads nothing). */
export const scopeReady = (scope: MessagingScope): boolean => basePath(scope) !== null;

// ── The list ────────────────────────────────────────────────

export function useConversations(scope: MessagingScope, filters: ConversationFilters) {
  const socket = useSocketState();

  const query = useInfiniteQuery({
    queryKey: messagingKeys.list(scope, filters),
    queryFn: ({ pageParam }) => fetchConversations(scope, filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: scopeReady(scope),
    staleTime: 10_000,
    // A search keeps the rows on screen, dimmed, until its answer comes.
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: socket === "connected" ? false : FALLBACK_POLL_MS,
  });

  // A conversation that received a message between two pages moves to the
  // top: it would come twice. The first occurrence (the freshest) is kept.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const all: Conversation[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const row of page.rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        all.push(row);
      }
    }
    return all;
  }, [query.data]);

  const first = query.data?.pages[0];
  return { ...query, rows, counts: first?.counts ?? null, total: first?.total ?? null };
}

/** Counts of the whole list (all, unread), for the tabs and the menu. Null for an agency. */
export function useConversationCounts(scope: MessagingScope, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: messagingKeys.counts(scope),
    queryFn: () => fetchConversationCounts(scope),
    enabled: scopeReady(scope) && scope.profile !== "agency" && (options.enabled ?? true),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    // The messaging screens ask again as messages arrive; elsewhere, every two minutes is enough for a menu.
    refetchInterval: 120_000,
  });
}

/** The list follows what happens on the reader's channel. */
export function useListRealtime(scope: MessagingScope) {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: messagingKeys.lists(scope) }), [queryClient, scope]);
  useMessagingChannel(channelOf(scope), { onCreated: refresh, onResume: refresh });
}

export function useConversation(scope: MessagingScope, id: string | null) {
  return useQuery({
    queryKey: messagingKeys.conversation(scope, id ?? ""),
    queryFn: () => fetchConversation(scope, id!),
    enabled: scopeReady(scope) && Boolean(id),
    retry: false,
    staleTime: 10_000,
  });
}

// ── The outbox: what left this screen and is not confirmed ──

type OutboxListener = () => void;
const outboxes = new Map<string, PendingMessage[]>();
const outboxListeners = new Set<OutboxListener>();
const inFlight = new Set<string>();
const NOTHING: PendingMessage[] = [];

const outboxKey = (scope: MessagingScope, id: string) => `${scopeKey(scope)}|${id}`;

function writeOutbox(key: string, update: (current: PendingMessage[]) => PendingMessage[]) {
  const next = update(outboxes.get(key) ?? NOTHING);
  if (next.length === 0) outboxes.delete(key);
  else outboxes.set(key, next);
  outboxListeners.forEach((listener) => listener());
}

/**
 * Messages waiting in a conversation. Kept outside the screen: leaving a
 * conversation while a message is on its way, or after it failed, must not
 * make it disappear without a word.
 */
function useOutbox(key: string): PendingMessage[] {
  return useSyncExternalStore(
    (listener) => {
      outboxListeners.add(listener);
      return () => outboxListeners.delete(listener);
    },
    () => outboxes.get(key) ?? NOTHING,
    () => NOTHING,
  );
}

/** For tests. */
export function resetOutboxForTests() {
  outboxes.clear();
  inFlight.clear();
}

type MessageCache = InfiniteData<MessagePage, string | null>;

/** Put a message the server answered into the newest page, once. */
function insertMessage(queryClient: QueryClient, scope: MessagingScope, id: string, message: Message) {
  queryClient.setQueryData<MessageCache>(messagingKeys.messages(scope, id), (cache) => {
    if (!cache || cache.pages.length === 0) return cache;
    if (cache.pages.some((page) => page.messages.some((known) => known.id === message.id))) return cache;
    const [newest, ...older] = cache.pages;
    return { ...cache, pages: [{ ...newest, messages: [...newest.messages, message] }, ...older] };
  });
}

/** Kinds of failure after which sending the same message again may succeed. */
const RETRYABLE: Failure["kind"][] = ["network", "server", "throttled", "conflict"];

// ── A thread ────────────────────────────────────────────────

export interface Thread {
  messages: Message[];
  pending: PendingMessage[];
  /** The furthest message the other side has read. */
  peerLastReadId: string | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  isRefetching: boolean;
  hasOlder: boolean;
  loadOlder: () => void;
  loadingOlder: boolean;
  /** Name of who is writing on the other side, while they write. */
  typingName: string | null;
  send: (body: string, files: File[]) => void;
  shareProduct: (product: { id: string; name: string }) => void;
  retry: (clientId: string) => void;
  discard: (clientId: string) => void;
  /** Tell the other side that the reader is writing (at most once every few seconds). */
  notifyTyping: () => void;
  /** Mark everything up to this message as read. */
  read: (messageId: string) => void;
}

export function useThread(scope: MessagingScope, conversationId: string, viewerId: string | null): Thread {
  const queryClient = useQueryClient();
  const socket = useSocketState();
  const key = outboxKey(scope, conversationId);
  const queryKey = useMemo(() => messagingKeys.messages(scope, conversationId), [scope, conversationId]);
  const canWrite = scope.profile !== "agency";

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchMessages(scope, conversationId, pageParam),
    initialPageParam: null as string | null,
    // Older messages: everything before the oldest one already on screen.
    getNextPageParam: (oldest) => (oldest.hasMore && oldest.messages[0] ? oldest.messages[0].id : undefined),
    enabled: scopeReady(scope),
    staleTime: 0,
    // What arrives while the thread is open is read by `refresh` below, which
    // asks for the latest page only: asking every loaded page again would
    // move their boundaries, and with them what the reader is looking at.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const messages = useMemo(() => mergeMessages((query.data?.pages ?? []).map((page) => page.messages)), [query.data]);
  const waiting = useOutbox(key);
  const pending = useMemo(() => stillPending(waiting, messages), [waiting, messages]);

  // What the server confirmed leaves the outbox for good.
  useEffect(() => {
    if (pending.length !== waiting.length) {
      const kept = new Set(pending.map((message) => message.clientId));
      writeOutbox(key, (current) => current.filter((message) => kept.has(message.clientId)));
    }
  }, [key, pending, waiting]);

  // Read receipts: what the page answered, moved forward by events.
  const [readByEvent, setReadByEvent] = useState<string | null>(null);
  const readByPage = query.data?.pages[0]?.peerLastReadId ?? null;
  const peerLastReadId = readByEvent && (!readByPage || readByEvent > readByPage) ? readByEvent : readByPage;

  const [typingName, setTypingName] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (typingTimer.current && clearTimeout(typingTimer.current)), []);

  /**
   * Read the latest page and add what it holds to the thread. The pages
   * already loaded stay as they are: nothing moves above the reader. If so
   * much was missed that the latest page does not reach what is on screen,
   * the thread starts again from it rather than showing a hole.
   */
  const refreshing = useRef(false);
  const refresh = useCallback(() => {
    if (refreshing.current || !queryClient.getQueryData<MessageCache>(queryKey)) return;
    refreshing.current = true;

    fetchMessages(scope, conversationId, null)
      .then((latest) => {
        queryClient.setQueryData<MessageCache>(queryKey, (cache) => {
          if (!cache || cache.pages.length === 0) return cache;
          const known = new Set(cache.pages.flatMap((page) => page.messages.map((message) => message.id)));
          const reaches = !latest.hasMore || latest.messages.some((message) => known.has(message.id));
          if (!reaches) return { pages: [latest], pageParams: [null] };

          const [newest, ...older] = cache.pages;
          return { ...cache, pages: [{ ...newest, messages: mergeMessages([newest.messages, latest.messages]), peerLastReadId: latest.peerLastReadId }, ...older] };
        });
      })
      .catch(() => {
        // The next event, the next interval or the next visit asks again.
      })
      .finally(() => {
        refreshing.current = false;
      });
  }, [queryClient, queryKey, scope, conversationId]);

  // Without the socket nothing says that a message arrived: the latest page
  // is asked at intervals. And whenever the tab comes back to the front.
  useEffect(() => {
    if (socket === "connected") return;
    const timer = setInterval(refresh, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [socket, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  useMessagingChannel(channelOf(scope), {
    onCreated: (event) => {
      if (event.conversationId !== conversationId) return;
      if (event.senderId !== viewerId) setTypingName(null);
      refresh();
      // A message may have reopened the conversation: what the reader may do is asked again.
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(scope, conversationId) });
    },
    onRead: (event) => {
      if (event.conversationId !== conversationId || event.userId === viewerId) return;
      setReadByEvent((current) => (current && current > event.lastReadId ? current : event.lastReadId));
    },
    onTyping: (event) => {
      if (event.conversationId !== conversationId || event.userId === viewerId) return;
      setTypingName(event.userName ?? "Votre correspondant");
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingName(null), 4_000);
    },
    onResume: refresh,
  });

  const attempt = useCallback(
    async (message: PendingMessage) => {
      // One request per message at a time: a second click, a second Enter or
      // a retry pressed twice never opens a second one.
      if (inFlight.has(message.clientId)) return;
      inFlight.add(message.clientId);

      try {
        const sent =
          message.kind === "product" && message.productId
            ? await sendProductCard(scope, conversationId, { clientId: message.clientId, productId: message.productId })
            : await sendMessage(scope, conversationId, { clientId: message.clientId, body: message.body, files: message.files });

        insertMessage(queryClient, scope, conversationId, sent);
        writeOutbox(key, (current) => current.filter((waitingMessage) => waitingMessage.clientId !== message.clientId));
        queryClient.invalidateQueries({ queryKey: messagingKeys.lists(scope) });
      } catch (error) {
        const failure = describeMessagingFailure(error);
        writeOutbox(key, (current) =>
          current.map((waitingMessage) =>
            waitingMessage.clientId === message.clientId
              ? { ...waitingMessage, state: "failed", error: failure.fields.attachments ?? failure.fields.body ?? failure.fields.product_id ?? failure.message, retryable: RETRYABLE.includes(failure.kind) }
              : waitingMessage,
          ),
        );
        // The answer may have been lost on the way back: if the message was
        // written, the next read of the thread shows it and clears this one.
        if (failure.kind === "network" || failure.kind === "server") refresh();
        // The server may have closed or blocked the conversation meanwhile.
        if (failure.kind === "forbidden") queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(scope, conversationId) });
      } finally {
        inFlight.delete(message.clientId);
      }
    },
    [scope, conversationId, queryClient, key, refresh],
  );

  const enqueue = useCallback(
    (message: Omit<PendingMessage, "clientId" | "state" | "error" | "retryable" | "createdAt">) => {
      if (!canWrite) return;
      const pendingMessage: PendingMessage = { ...message, clientId: newClientId(), state: "sending", error: null, retryable: true, createdAt: new Date().toISOString() };
      writeOutbox(key, (current) => [...current, pendingMessage]);
      void attempt(pendingMessage);
    },
    [canWrite, key, attempt],
  );

  const send = useCallback(
    (body: string, files: File[]) => {
      const text = body.trim();
      if (text === "" && files.length === 0) return;
      enqueue({ kind: "message", body: text, files, productId: null, productName: null });
    },
    [enqueue],
  );

  const shareProduct = useCallback(
    (product: { id: string; name: string }) => enqueue({ kind: "product", body: "", files: [], productId: product.id, productName: product.name }),
    [enqueue],
  );

  const retry = useCallback(
    (clientId: string) => {
      const message = (outboxes.get(key) ?? NOTHING).find((waitingMessage) => waitingMessage.clientId === clientId);
      if (!message || message.state !== "failed") return;
      const again: PendingMessage = { ...message, state: "sending", error: null };
      writeOutbox(key, (current) => current.map((waitingMessage) => (waitingMessage.clientId === clientId ? again : waitingMessage)));
      void attempt(again);
    },
    [key, attempt],
  );

  const discard = useCallback(
    (clientId: string) => writeOutbox(key, (current) => current.filter((waitingMessage) => waitingMessage.clientId !== clientId || waitingMessage.state === "sending")),
    [key],
  );

  // Laravel accepts ten typing signals a minute: one every seven seconds at most.
  const lastTyping = useRef(0);
  const notifyTyping = useCallback(() => {
    if (!canWrite) return;
    const now = Date.now();
    if (now - lastTyping.current < 7_000) return;
    lastTyping.current = now;
    void sendTyping(scope, conversationId);
  }, [canWrite, scope, conversationId]);

  const lastRead = useRef<string | null>(null);
  const read = useCallback(
    (messageId: string) => {
      // An agency is nobody's side: reading must leave no trace.
      if (!canWrite || lastRead.current === messageId) return;
      lastRead.current = messageId;
      markRead(scope, conversationId, messageId)
        .then(() => {
          // The row loses its counter at once; the list is asked again for the rest.
          queryClient.setQueriesData<InfiniteData<ConversationPage, string | null>>({ queryKey: messagingKeys.lists(scope) }, (cache) =>
            cache && Array.isArray(cache.pages)
              ? { ...cache, pages: cache.pages.map((page) => ({ ...page, rows: page.rows.map((row) => (row.id === conversationId ? { ...row, unread: 0 } : row)) })) }
              : cache,
          );
          queryClient.invalidateQueries({ queryKey: messagingKeys.lists(scope) });
        })
        .catch(() => {
          // Not marked: the next message, or the next visit, tries again.
          lastRead.current = null;
        });
    },
    [canWrite, scope, conversationId, queryClient],
  );

  return {
    messages,
    pending,
    peerLastReadId,
    isLoading: query.isLoading,
    isError: query.isError && messages.length === 0,
    refetch: () => void query.refetch(),
    isRefetching: query.isRefetching,
    hasOlder: Boolean(query.hasNextPage),
    loadOlder: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    loadingOlder: query.isFetchingNextPage,
    typingName,
    send,
    shareProduct,
    retry,
    discard,
    notifyTyping,
    read,
  };
}

// ── Around a thread ─────────────────────────────────────────

/** Presence of the other side, asked again every minute while the thread is open. */
export function usePresence(scope: MessagingScope, id: string, enabled: boolean) {
  return useQuery({
    queryKey: messagingKeys.presence(scope, id),
    queryFn: () => fetchPresence(scope, id),
    enabled: enabled && scopeReady(scope) && scope.profile !== "agency",
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useShareableProducts(conversationId: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: messagingKeys.products(conversationId, search),
    queryFn: () => fetchShareableProducts(conversationId, search),
    enabled,
    staleTime: 30_000,
  });
}

/** Closing or blocking changes the conversation and its row. */
export function useConversationAction(scope: MessagingScope, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { type: "close" } | { type: "block"; reason: string | null }) =>
      action.type === "close" ? closeConversation(scope, id) : blockConversation(scope, id, action.reason),
    onSettled: () => queryClient.invalidateQueries({ queryKey: messagingKeys.all(scope) }),
  });
}

export function useReportMessage(scope: MessagingScope, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (report: { messageId: string; reason: string; note: string }) => reportMessage(scope, id, report.messageId, report),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagingKeys.messages(scope, id) }),
  });
}

/** From the page of a mission: open the conversation with its buyer or its store. */
export function useStartCourierConversation() {
  return useMutation({ mutationFn: startCourierConversation });
}
