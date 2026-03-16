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

import { useAgencyConversations, useAgencyConversation } from "../hooks";
import { ConversationList } from "./ConversationList";
import { MessageViewer } from "./MessageViewer";
import { EmptyState } from "./EmptyState";

/**
 * AgencyMessagingPage — 2-panel layout (desktop) / navigation (mobile)
 *
 * - Panel 1: ConversationList (with CourierFilter)
 * - Panel 2: MessageViewer (read-only)
 *
 * Real-time: listens to `messaging.agency.{agencyId}` via Echo.
 * Agency receives events but does NOT produce any (read-only).
 */
export function AgencyMessagingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const agencyId = session?.delivery_partner_id ?? undefined;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "viewer">("list");
  const [courierId, setCourierId] = useState<string | undefined>(undefined);

  // ── Queries ──
  const filters = useMemo(
    () => (courierId ? { courier_id: courierId } : undefined),
    [courierId],
  );
  const { data: conversationsData, isLoading: isLoadingConversations } =
    useAgencyConversations(agencyId, filters);
  const { data: conversationDetail } = useAgencyConversation(
    agencyId,
    selectedId,
  );

  const conversations = useMemo(
    () => conversationsData?.data ?? [],
    [conversationsData],
  );
  const activeConversation = conversationDetail?.data ?? null;

  // ── Typing Indicator (receive only — agency has no sendTyping) ──
  const { typingUsers, onTypingReceived } = useTypingIndicator(
    selectedId,
    // No-op: agency doesn't send typing events
    () => Promise.resolve(),
  );

  // ── Real-time Events ──
  const onMessageCreated = useCallback(
    (payload: MessageCreatedPayload) => {
      qc.invalidateQueries({
        queryKey: queryKeys.agency.conversations(),
      });
      if (payload.conversation_id === selectedId) {
        qc.invalidateQueries({
          queryKey: queryKeys.agency.messages(selectedId),
        });
      }
    },
    [qc, selectedId],
  );

  const onMessageRead = useCallback(
    (payload: MessageReadPayload) => {
      if (payload.conversation_id === selectedId) {
        qc.invalidateQueries({
          queryKey: queryKeys.agency.messages(selectedId),
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
    channelName: agencyId ? `messaging.agency.${agencyId}` : null,
    onMessageCreated,
    onMessageRead,
    onUserTyping,
  });

  // ── Handlers ──
  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMobileView("viewer");
      // On mobile, navigate to the conversation detail page
      if (window.innerWidth < 1024) {
        router.push(`/agency/messages/${id}`);
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
      {/* Panel 1 — Conversation List (desktop) */}
      <div className="hidden w-[300px] flex-shrink-0 lg:flex lg:flex-col">
        <ConversationList
          conversations={conversations}
          isLoading={isLoadingConversations}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          courierId={courierId}
          onCourierChange={setCourierId}
        />
      </div>

      {/* Mobile: show list or viewer */}
      <div className="flex flex-1 flex-col lg:hidden">
        {mobileView === "list" ? (
          <ConversationList
            conversations={conversations}
            isLoading={isLoadingConversations}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
            courierId={courierId}
            onCourierChange={setCourierId}
          />
        ) : activeConversation && agencyId ? (
          <div className="glass-card flex-1 overflow-hidden rounded-2xl">
            <MessageViewer
              agencyId={agencyId}
              conversation={activeConversation}
              onBack={handleBack}
              typingUsers={typingUsers}
            />
          </div>
        ) : (
          <EmptyState
            title="Sélectionnez une conversation"
            description="Choisissez une conversation pour voir les messages."
          />
        )}
      </div>

      {/* Panel 2 — Message Viewer (desktop only) */}
      <div className="hidden flex-1 lg:flex lg:flex-col">
        {activeConversation && agencyId ? (
          <div className="glass-card flex-1 overflow-hidden rounded-2xl">
            <MessageViewer
              agencyId={agencyId}
              conversation={activeConversation}
              typingUsers={typingUsers}
            />
          </div>
        ) : (
          <div className="glass-card flex flex-1 items-center justify-center rounded-2xl">
            <EmptyState
              title="Sélectionnez une conversation"
              description="Choisissez une conversation dans la liste pour voir les messages."
            />
          </div>
        )}
      </div>
    </div>
  );
}
