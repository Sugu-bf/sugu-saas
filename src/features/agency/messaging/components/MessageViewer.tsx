"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Conversation, Message } from "@/lib/messaging/types";
import { useAgencyMessages } from "../hooks";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/features/vendor/services/_shared";
import { ArrowLeft, Loader2 } from "lucide-react";

import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "@/features/vendor/messaging/components/DateSeparator";
import { TypingIndicator } from "@/features/vendor/messaging/components/TypingIndicator";
import { ReadOnlyBanner } from "./ReadOnlyBanner";
import { ChatSkeleton } from "./ChatSkeleton";

interface MessageViewerProps {
  agencyId: string;
  conversation: Conversation;
  onBack?: () => void;
  typingUsers?: Record<string, { userName: string; participantType: string }>;
}

/**
 * MessageViewer — Agency read-only message viewer.
 * No composer, no actions, no mark-as-read.
 * All bubbles left-aligned, colored by sender_type.
 */
export function MessageViewer({
  agencyId,
  conversation,
  onBack,
  typingUsers = {},
}: MessageViewerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAgencyMessages(agencyId, conversation.id);

  // Flatten pages into messages (reversed for chronological order)
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const all: Message[] = [];
    for (let i = data.pages.length - 1; i >= 0; i--) {
      all.push(...data.pages[i].messages);
    }
    return all;
  }, [data]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Load more on scroll to top (seek pagination)
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const customerName = conversation.customer?.name ?? "Client";
  const courierParticipant = conversation.participants?.find(
    (p) => p.type === "courier",
  );
  const courierName = courierParticipant?.name ?? "Coursier";
  const avatarCls = avatarColor(customerName);
  const ini = initials(customerName);

  // Typing users
  const activeTypers = useMemo(
    () => Object.values(typingUsers),
    [typingUsers],
  );

  // Group messages by date
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
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {customerName}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Coursier : {courierName}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold",
            conversation.status === "open"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : conversation.status === "closed"
                ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          )}
        >
          {conversation.status === "open"
            ? "Ouverte"
            : conversation.status === "closed"
              ? "Fermée"
              : conversation.status === "blocked"
                ? "Bloquée"
                : "Archivée"}
        </span>
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
            return (
              <DateSeparator key={`date-${item.date}`} date={item.date} />
            );
          }
          return <MessageBubble key={item.message.id} message={item.message} />;
        })}

        {activeTypers.length > 0 && (
          <TypingIndicator userName={activeTypers[0].userName} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Read-only banner (instead of Composer) */}
      <ReadOnlyBanner />
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
