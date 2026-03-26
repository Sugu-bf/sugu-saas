"use client";

import { memo } from "react";
import type { Conversation } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/features/vendor/services/_shared";

interface ConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const ConversationCard = memo(function ConversationCard({
  conversation,
  isSelected,
  onSelect,
}: ConversationCardProps) {
  const customerName = conversation.customer?.name ?? "Client";
  const avatarCls = avatarColor(customerName);
  const ini = initials(customerName);
  const lastMsg = conversation.last_message;
  const unread = conversation.unread_count;

  // Check online status from participants
  const customerParticipant = conversation.participants?.find(
    (p) => p.type === "customer",
  );
  const isOnline = !!customerParticipant; // presence is checked separately

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
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
            avatarCls,
          )}
        >
          {ini}
        </div>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {customerName}
          </span>
          <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
            {_relativeTime(conversation.updated_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {lastMsg && (
            <>
              {lastMsg.sender_type !== "customer" && (
                <span className="text-[11px] text-gray-400">✓</span>
              )}
              <p className="flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
                {lastMsg.body}
              </p>
            </>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {_conversationTypeLabel(conversation.type)}
          </span>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-sugu-400 to-sugu-500 px-1.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
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
