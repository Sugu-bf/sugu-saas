"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useSession } from "@/features/auth";
import { useCourierConversation } from "@/features/driver/messaging/hooks";
import { ChatRoom } from "@/features/driver/messaging/components/ChatRoom";
import { ChatSkeleton } from "@/features/driver/messaging/components/ChatSkeleton";
import { useMessagingEvents, useTypingIndicator } from "@/lib/messaging";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { sendCourierTyping } from "@/features/driver/messaging/hooks";
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
  const userId = session?.id;

  const { data, isLoading } = useCourierConversation(conversationId);
  const conversation = data ?? null;

  const { typingUsers, onTypingReceived, notifyTyping } = useTypingIndicator(
    conversationId,
    sendCourierTyping,
  );

  // Redirect to list on desktop
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) router.replace("/driver/messages");
    };
    handler(mql);
    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, [router]);

  const onMessageCreated = useCallback(
    (payload: MessageCreatedPayload) => {
      if (payload.conversation_id === conversationId) {
        qc.invalidateQueries({
          queryKey: queryKeys.driver.messages(conversationId),
        });
      }
      qc.invalidateQueries({
        queryKey: queryKeys.driver.conversations(),
      });
    },
    [qc, conversationId],
  );

  const onMessageRead = useCallback(
    (payload: MessageReadPayload) => {
      if (payload.conversation_id === conversationId) {
        qc.invalidateQueries({
          queryKey: queryKeys.driver.messages(conversationId),
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
    channelName: userId ? `messaging.courier.${userId}` : null,
    onMessageCreated,
    onMessageRead,
    onUserTyping,
  });

  const handleBack = useCallback(() => {
    router.push("/driver/messages");
  }, [router]);

  if (isLoading || !conversation) {
    return (
      <div className="-m-4 -mb-[200px] h-[calc(100dvh-56px)] overflow-hidden lg:-m-8 lg:-mb-8 lg:h-[calc(100dvh-64px)]">
        <ChatSkeleton />
      </div>
    );
  }

  return (
    <div className="-m-4 -mb-[200px] h-[calc(100dvh-56px)] overflow-hidden lg:-m-8 lg:-mb-8 lg:h-[calc(100dvh-64px)]">
      <ChatRoom
        conversation={conversation}
        onBack={handleBack}
        typingUsers={typingUsers}
        onTyping={notifyTyping}
      />
    </div>
  );
}
