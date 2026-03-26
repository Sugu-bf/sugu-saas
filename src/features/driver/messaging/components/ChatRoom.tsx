"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Conversation, Message } from "@/lib/messaging/types";
import {
  useCourierMessages,
  useSendCourierMessage,
  useMarkCourierAsRead,
} from "../hooks";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/features/vendor/services/_shared";
import { ArrowLeft, Loader2 } from "lucide-react";

import { toast } from "sonner";

import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { TypingIndicator } from "./TypingIndicator";
import { Composer } from "./Composer";
import { ChatSkeleton } from "./ChatSkeleton";

interface ChatRoomProps {
  conversation: Conversation;
  onBack?: () => void;
  typingUsers?: Record<string, { userName: string; participantType: string }>;
  /** Stable callback to notify typing — provided by parent's useTypingIndicator */
  onTyping: () => void;
}

export function ChatRoom({
  conversation,
  onBack,
  typingUsers = {},
  onTyping,
}: ChatRoomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCourierMessages(conversation.id);
  const sendMessage = useSendCourierMessage();
  const markRead = useMarkCourierAsRead();

  // Flatten pages into messages (reversed for chronological order)
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const all: Message[] = [];
    // Pages come newest first, reverse to get chronological
    for (let i = data.pages.length - 1; i >= 0; i--) {
      all.push(...data.pages[i].messages);
    }
    return all;
  }, [data]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark as read when we view messages (C1 fix: ref guard prevents infinite loop)
  const lastReadIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.is_own && lastMsg.id !== lastReadIdRef.current) {
        lastReadIdRef.current = lastMsg.id;
        markRead.mutate({
          convId: conversation.id,
          lastReadMessageId: lastMsg.id,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, messages.length]);

  // Load more on scroll to top
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = useCallback(
    (body: string, attachments?: File[]) => {
      sendMessage.mutate(
        { convId: conversation.id, body, attachments },
        {
          onError: () => toast.error("Erreur d'envoi"),
        },
      );
    },
    [conversation.id, sendMessage],
  );


  const customerName = conversation.customer?.name ?? "Client";
  const avatarCls = avatarColor(customerName);
  const ini = initials(customerName);

  // Find typing users for the current conversation (exclude ourselves)
  const activeTypers = useMemo(
    () => Object.values(typingUsers).filter((t) => t.participantType === "customer"),
    [typingUsers],
  );

  // Group messages by date for separator insertion (H1 fix: memoized)
  const messagesWithDates = useMemo(
    () => _insertDateSeparators(messages),
    [messages],
  );

  if (isLoading) return <ChatSkeleton />;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200/60 px-4 py-3 dark:border-gray-800/60">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="relative">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
              avatarCls,
            )}
          >
            {ini}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {customerName}
          </p>
          <p className="text-xs text-green-500">● En ligne</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {messagesWithDates.map((item) => {
          if (item.type === "date") {
            return <DateSeparator key={`date-${item.date}`} date={item.date} />;
          }
          return (
            <MessageBubble
              key={item.message.id}
              message={item.message}
              isLastRead={false}
            />
          );
        })}

        {activeTypers.length > 0 && (
          <TypingIndicator userName={activeTypers[0].userName} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {conversation.status === "open" ? (
        <Composer
          onSend={handleSend}
          onTyping={onTyping}
          disabled={sendMessage.isPending}
        />
      ) : (
        <div className="border-t border-gray-200/60 p-4 text-center text-sm text-muted-foreground dark:border-gray-800/60">
          Cette conversation est {conversation.status === "closed" ? "fermée" : conversation.status === "blocked" ? "bloquée" : "archivée"}.
        </div>
      )}

    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

type DateItem = { type: "date"; date: string };
type MessageItem = { type: "message"; message: Message };

function _insertDateSeparators(
  messages: Message[],
): (DateItem | MessageItem)[] {
  const result: (DateItem | MessageItem)[] = [];
  let lastDate = "";

  for (const msg of messages) {
    const day = msg.created_at.split("T")[0];
    if (day !== lastDate) {
      result.push({ type: "date", date: msg.created_at });
      lastDate = day;
    }
    result.push({ type: "message", message: msg });
  }

  return result;
}
