"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useSession } from "@/features/auth";
import { useSellerConversation } from "@/features/vendor/messaging/hooks";
import { ChatRoom } from "@/features/vendor/messaging/components/ChatRoom";
import { ChatSkeleton } from "@/features/vendor/messaging/components/ChatSkeleton";
import { useMessagingEvents, useTypingIndicator } from "@/lib/messaging";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { sendSellerTyping } from "@/features/vendor/messaging/hooks";
import type {
  MessageCreatedPayload,
  MessageReadPayload,
  UserTypingPayload,
} from "@/lib/messaging/types";

interface MobileChatContentProps {
  conversationId: string;
}

export function MobileChatContent({ conversationId }: MobileChatContentProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const storeId = session?.store_id;

  const { data, isLoading } = useSellerConversation(conversationId);
  const conversation = data?.data ?? null;

  const { typingUsers, onTypingReceived, notifyTyping } = useTypingIndicator(
    conversationId,
    sendSellerTyping,
  );

  // Redirect to list on desktop (M1 fix: use matchMedia instead of resize)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) router.replace("/vendor/messages");
    };
    handler(mql); // initial check
    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, [router]);

  const onMessageCreated = useCallback(
    (payload: MessageCreatedPayload) => {
      if (payload.conversation_id === conversationId) {
        qc.invalidateQueries({
          queryKey: queryKeys.vendor.messages(conversationId),
        });
      }
      qc.invalidateQueries({
        queryKey: queryKeys.vendor.conversations(),
      });
    },
    [qc, conversationId],
  );

  const onMessageRead = useCallback(
    (payload: MessageReadPayload) => {
      if (payload.conversation_id === conversationId) {
        qc.invalidateQueries({
          queryKey: queryKeys.vendor.messages(conversationId),
        });
      }
    },
    [qc, conversationId],
  );

  const onUserTyping = useCallback(
    (payload: UserTypingPayload) => {
      if (payload.conversation_id === conversationId) {
        onTypingReceived(payload);
      }
    },
    [conversationId, onTypingReceived],
  );

  useMessagingEvents({
    channelName: storeId ? `messaging.store.${storeId}` : null,
    onMessageCreated,
    onMessageRead,
    onUserTyping,
  });

  const handleBack = useCallback(() => {
    router.push("/vendor/messages");
  }, [router]);

  if (isLoading || !conversation) {
    return (
      <div className="-m-4 -mb-24 h-[calc(100vh-64px)] overflow-hidden lg:-m-8 lg:-mb-8">
        <ChatSkeleton />
      </div>
    );
  }

  return (
    <div className="-m-4 -mb-24 h-[calc(100vh-64px)] overflow-hidden lg:-m-8 lg:-mb-8">
      <ChatRoom
        conversation={conversation}
        onBack={handleBack}
        typingUsers={typingUsers}
        onTyping={notifyTyping}
      />
    </div>
  );
}
