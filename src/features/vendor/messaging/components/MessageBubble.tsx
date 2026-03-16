"use client";

import type { Message } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReadReceipt } from "./ReadReceipt";
import { ProductCardBubble } from "./ProductCardBubble";
import { SystemEventBubble } from "./SystemEventBubble";

interface MessageBubbleProps {
  message: Message;
  isLastRead?: boolean;
}

export function MessageBubble({ message, isLastRead }: MessageBubbleProps) {
  // System events
  if (message.message_type === "system_event") {
    return <SystemEventBubble message={message} />;
  }

  // Product card
  if (message.message_type === "product_card") {
    return (
      <div
        className={cn(
          "flex gap-2 px-4 py-1",
          message.is_own ? "justify-end" : "justify-start",
        )}
      >
        <div className="flex flex-col gap-1">
          {message.body && (
            <div
              className={cn(
                "max-w-[320px] rounded-2xl px-4 py-2.5 text-sm",
                message.is_own
                  ? "bg-gradient-to-br from-sugu-500 to-sugu-600 text-white"
                  : "glass-card text-gray-900 dark:bg-gray-800/60 dark:text-white",
              )}
            >
              {message.body}
            </div>
          )}
          <ProductCardBubble message={message} />
          <_TimeStamp message={message} />
        </div>
      </div>
    );
  }

  // Image messages
  if (
    message.message_type === "image" ||
    (message.attachments && message.attachments.length > 0)
  ) {
    return (
      <div
        className={cn(
          "flex gap-2 px-4 py-1",
          message.is_own ? "justify-end" : "justify-start",
        )}
      >
        <div className="flex flex-col gap-1">
          {message.body && (
            <div
              className={cn(
                "max-w-[320px] rounded-2xl px-4 py-2.5 text-sm",
                message.is_own
                  ? "bg-gradient-to-br from-sugu-500 to-sugu-600 text-white"
                  : "glass-card text-gray-900 dark:bg-gray-800/60 dark:text-white",
              )}
            >
              {message.body}
            </div>
          )}
          {message.attachments?.map((att) => (
            <a
              key={att.id}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[240px] overflow-hidden rounded-2xl border border-border"
            >
              <Image
                src={att.thumb_url ?? att.url}
                alt={att.name}
                width={240}
                height={180}
                className="h-auto w-full object-cover"
              />
            </a>
          ))}
          <_TimeStamp message={message} />
        </div>
      </div>
    );
  }

  // Text message (default)
  return (
    <div
      className={cn(
        "flex gap-2 px-4 py-1",
        message.is_own ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[320px] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          message.is_own
            ? "bg-gradient-to-br from-sugu-500 to-sugu-600 text-white"
            : "glass-card text-gray-900 dark:bg-gray-800/60 dark:border-gray-700/60 dark:text-white",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            message.is_own
              ? "text-white/70"
              : "text-gray-400 dark:text-gray-500",
          )}
        >
          <span>{_formatTime(message.created_at)}</span>
          <ReadReceipt isOwn={message.is_own} isRead={!!isLastRead} />
        </div>
      </div>
    </div>
  );
}

function _TimeStamp({ message }: { message: Message }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[10px]",
        message.is_own
          ? "justify-end text-gray-400 dark:text-gray-500"
          : "justify-start text-gray-400 dark:text-gray-500",
      )}
    >
      <span>{_formatTime(message.created_at)}</span>
    </div>
  );
}

function _formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
