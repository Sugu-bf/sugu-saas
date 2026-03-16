"use client";

import { memo, useMemo } from "react";
import type { Conversation } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/features/vendor/services/_shared";

interface ConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/**
 * ConversationCard — Agency version.
 * Shows both customer name (primary) and courier name (secondary).
 * No unread count, no read receipts (agency is read-only observer).
 */
export const ConversationCard = memo(function ConversationCard({
  conversation,
  isSelected,
  onSelect,
}: ConversationCardProps) {
  const customerName = conversation.customer?.name ?? "Client";
  const avatarCls = avatarColor(customerName);
  const ini = initials(customerName);
  const lastMsg = conversation.last_message;

  // Extract courier name from participants
  const courierName = useMemo(() => {
    const courier = conversation.participants?.find((p) => p.type === "courier");
    return courier?.name ?? null;
  }, [conversation.participants]);

  return (
    <button
      id={`conversation-${conversation.id}`}
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200",
        isSelected
          ? "border-l-2 border-sugu-500 bg-sugu-50/60 dark:bg-sugu-950/30"
          : "border-l-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50",
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
            avatarCls,
          )}
        >
          {ini}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Customer name + timestamp */}
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {customerName}
          </span>
          <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
            {_relativeTime(conversation.updated_at)}
          </span>
        </div>

        {/* Line 2: Courier name */}
        {courierName && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 truncate">
            Coursier : {courierName}
          </p>
        )}

        {/* Line 3: Last message preview */}
        {lastMsg && (
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {lastMsg.body}
          </p>
        )}

        {/* Conversation type badge */}
        <div className="mt-0.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {_conversationTypeLabel(conversation.type)}
          </span>
        </div>
      </div>
    </button>
  );
});

function _relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 30) return `${diffD}j`;
  if (diffD < 365) return `${Math.floor(diffD / 30)} mois`;
  return `${Math.floor(diffD / 365)} an${Math.floor(diffD / 365) > 1 ? "s" : ""}`;
}

const CONVERSATION_TYPE_LABELS: Record<string, string> = {
  general: "Général",
  pre_order: "Question produit",
  order_support: "Support commande",
  delivery_support: "Support livraison",
  support_chat: "Support",
};

function _conversationTypeLabel(type: string): string {
  return CONVERSATION_TYPE_LABELS[type] ?? type;
}
