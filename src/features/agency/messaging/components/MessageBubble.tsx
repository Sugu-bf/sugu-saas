"use client";

import type { Message, ProductCardMetadata } from "@/lib/messaging/types";
import { cn, formatCurrency } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

interface MessageBubbleProps {
  message: Message;
}

// ── Sender type colors ────────────────────────────────────

const SENDER_BUBBLE_STYLES: Record<string, string> = {
  customer:
    "glass-card text-gray-900 dark:bg-gray-800/60 dark:text-white",
  seller:
    "bg-gradient-to-br from-sugu-500/15 to-sugu-600/10 text-gray-900 border border-sugu-200/40 dark:from-sugu-500/20 dark:to-sugu-600/15 dark:text-white dark:border-sugu-700/30",
  courier:
    "bg-blue-500/10 text-blue-900 border border-blue-200/40 dark:bg-blue-500/20 dark:text-blue-100 dark:border-blue-700/30",
  admin:
    "bg-purple-500/10 text-purple-900 border border-purple-200/40 dark:bg-purple-500/20 dark:text-purple-100 dark:border-purple-700/30",
};

const SENDER_BADGE_STYLES: Record<string, string> = {
  customer: "text-gray-500 dark:text-gray-400",
  seller: "text-sugu-600 dark:text-sugu-400",
  courier: "text-blue-600 dark:text-blue-400",
  admin: "text-purple-600 dark:text-purple-400",
};

const SENDER_TYPE_LABELS: Record<string, string> = {
  customer: "Client",
  seller: "Vendeur",
  courier: "Coursier",
  admin: "Admin",
  system: "Système",
};

function _getBubbleStyle(senderType: string): string {
  return SENDER_BUBBLE_STYLES[senderType] ?? SENDER_BUBBLE_STYLES.customer;
}

function _getBadgeStyle(senderType: string): string {
  return SENDER_BADGE_STYLES[senderType] ?? SENDER_BADGE_STYLES.customer;
}

/**
 * MessageBubble — Agency version (read-only, all left-aligned).
 * Every bubble shows sender_name + sender_type badge, colored by type.
 * No is_own distinction — agency is a third-party observer.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  // System events — centered
  if (message.message_type === "system_event") {
    return (
      <div className="flex justify-center py-2">
        <div className="glass-card rounded-xl border border-border px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">{message.body}</p>
        </div>
      </div>
    );
  }

  const bubbleStyle = _getBubbleStyle(message.sender_type);
  const badgeStyle = _getBadgeStyle(message.sender_type);
  const typeLabel = SENDER_TYPE_LABELS[message.sender_type] ?? message.sender_type;

  // Product card
  if (message.message_type === "product_card") {
    const meta = message.metadata as ProductCardMetadata | null;
    return (
      <div className="flex justify-start gap-2 px-4 py-1">
        <div className="flex flex-col gap-1">
          {/* Sender info */}
          <_SenderLabel name={message.sender_name} type={typeLabel} badgeStyle={badgeStyle} />

          {message.body && (
            <div className={cn("max-w-[320px] rounded-2xl px-4 py-2.5 text-sm", bubbleStyle)}>
              {message.body}
            </div>
          )}

          {meta && (
            <div className="max-w-[280px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-gray-800/80">
              {meta.thumbnail && (
                <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={meta.thumbnail}
                    alt={meta.product_name}
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {meta.product_name}
                  </p>
                  <p className="text-sm font-bold text-sugu-500">
                    {formatCurrency(meta.price)} {meta.currency}
                  </p>
                  {meta.compare_price && meta.compare_price > meta.price && (
                    <p className="text-xs text-gray-400 line-through">
                      {formatCurrency(meta.compare_price)} {meta.currency}
                    </p>
                  )}
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sugu-50 text-sugu-500 dark:bg-sugu-950/30">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}

          <_TimeStamp time={message.created_at} />
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
      <div className="flex justify-start gap-2 px-4 py-1">
        <div className="flex flex-col gap-1">
          <_SenderLabel name={message.sender_name} type={typeLabel} badgeStyle={badgeStyle} />

          {message.body && (
            <div className={cn("max-w-[320px] rounded-2xl px-4 py-2.5 text-sm", bubbleStyle)}>
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
          <_TimeStamp time={message.created_at} />
        </div>
      </div>
    );
  }

  // Text message (default) — ALL left-aligned
  return (
    <div className="flex justify-start gap-2 px-4 py-1">
      <div className="flex flex-col gap-1 max-w-[320px]">
        <_SenderLabel name={message.sender_name} type={typeLabel} badgeStyle={badgeStyle} />
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            bubbleStyle,
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <span>{_formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function _SenderLabel({
  name,
  type,
  badgeStyle,
}: {
  name: string;
  type: string;
  badgeStyle: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        {name}
      </span>
      <span className={cn("text-[10px] font-semibold", badgeStyle)}>
        {type}
      </span>
    </div>
  );
}

function _TimeStamp({ time }: { time: string }) {
  return (
    <div className="flex items-center justify-start gap-1 px-1 text-[10px] text-gray-400 dark:text-gray-500">
      <span>{_formatTime(time)}</span>
    </div>
  );
}

function _formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
