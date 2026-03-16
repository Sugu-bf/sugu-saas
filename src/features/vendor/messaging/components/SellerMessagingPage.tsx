"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth";
import { useMessagingEvents, useTypingIndicator } from "@/lib/messaging";
import type {
  MessageCreatedPayload,
  MessageReadPayload,
  UserTypingPayload,
} from "@/lib/messaging/types";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { sendSellerTyping } from "../hooks";

import { useSellerConversations, useSellerConversation } from "../hooks";
import { ConversationList } from "./ConversationList";
import { ChatRoom } from "./ChatRoom";
import { CustomerPanel } from "./CustomerPanel";
import { EmptyState } from "./EmptyState";

/**
 * SellerMessagingPage — 3-panel layout (desktop) / navigation (mobile)
 *
 * - Panel 1: ConversationList
 * - Panel 2: ChatRoom
 * - Panel 3: CustomerPanel
 *
 * Real-time: listens to `messaging.store.{storeId}` via Echo.
 */
export function SellerMessagingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const storeId = session?.store_id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // ── Queries ──
  const { data: conversationsData, isLoading: isLoadingConversations } =
    useSellerConversations();
  const { data: conversationDetail } = useSellerConversation(selectedId);

  const conversations = useMemo(
    () => conversationsData?.data?.data ?? [],
    [conversationsData],
  );
  const activeConversation = conversationDetail?.data ?? null;

  // ── Typing Indicator ──
  const { typingUsers, onTypingReceived, notifyTyping } = useTypingIndicator(
    selectedId,
    sendSellerTyping,
  );

  // ── Real-time Events ──
  const onMessageCreated = useCallback(
    (payload: MessageCreatedPayload) => {
      // Refresh conversations list
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
      // If it's for the currently open conversation, refresh messages
      if (payload.conversation_id === selectedId) {
        qc.invalidateQueries({
          queryKey: queryKeys.vendor.messages(selectedId),
        });
      }
    },
    [qc, selectedId],
  );

  const onMessageRead = useCallback(
    (payload: MessageReadPayload) => {
      // Refresh conversations to update unread counts
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
      if (payload.conversation_id === selectedId) {
        qc.invalidateQueries({
          queryKey: queryKeys.vendor.messages(selectedId),
        });
      }
    },
    [qc, selectedId],
  );

  const onUserTyping = useCallback(
    (payload: UserTypingPayload) => {
      if (payload.conversation_id === selectedId) {
        onTypingReceived(payload);
      }
    },
    [selectedId, onTypingReceived],
  );

  useMessagingEvents({
    channelName: storeId ? `messaging.store.${storeId}` : null,
    onMessageCreated,
    onMessageRead,
    onUserTyping,
  });

  // ── Handlers ──
  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMobileView("chat");
      // On mobile, navigate to the conversation detail page
      if (window.innerWidth < 1024) {
        router.push(`/vendor/messages/${id}`);
      }
    },
    [router],
  );

  const handleBack = useCallback(() => {
    setMobileView("list");
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-full gap-4 animate-fade-in">
      {/* Panel 1 — Conversation List */}
      <div className="hidden w-[280px] flex-shrink-0 lg:flex lg:flex-col">
        <ConversationList
          conversations={conversations}
          isLoading={isLoadingConversations}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>

      {/* Mobile: show list or chat */}
      <div className="flex flex-1 flex-col lg:hidden">
        {mobileView === "list" ? (
          <ConversationList
            conversations={conversations}
            isLoading={isLoadingConversations}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
          />
        ) : activeConversation ? (
          <div className="glass-card flex-1 overflow-hidden rounded-2xl">
            <ChatRoom
              conversation={activeConversation}
              onBack={handleBack}
              typingUsers={typingUsers}
              onTyping={notifyTyping}
            />
          </div>
        ) : (
          <EmptyState
            title="Sélectionnez une conversation"
            description="Choisissez une conversation pour commencer."
          />
        )}
      </div>

      {/* Panel 2 — Chat Room (desktop only) */}
      <div className="hidden flex-1 lg:flex lg:flex-col">
        {activeConversation ? (
          <div className="glass-card flex-1 overflow-hidden rounded-2xl">
            <ChatRoom
              conversation={activeConversation}
              typingUsers={typingUsers}
              onTyping={notifyTyping}
            />
          </div>
        ) : (
          <div className="glass-card flex flex-1 items-center justify-center rounded-2xl">
            <EmptyState
              title="Sélectionnez une conversation"
              description="Choisissez une conversation dans la liste pour commencer."
            />
          </div>
        )}
      </div>

      {/* Panel 3 — Customer Panel (desktop only) */}
      {activeConversation && (
        <div className="hidden w-[300px] flex-shrink-0 xl:flex xl:flex-col">
          <CustomerPanel conversation={activeConversation} />
        </div>
      )}
    </div>
  );
}
