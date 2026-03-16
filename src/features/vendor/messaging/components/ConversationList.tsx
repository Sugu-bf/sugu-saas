"use client";

import { useState, useMemo, useDeferredValue } from "react";
import type { Conversation } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { ConversationCard } from "./ConversationCard";
import { EmptyState } from "./EmptyState";

type Tab = "all" | "unread";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() =>
    conversations.filter((c) => {
      if (tab === "unread" && c.unread_count === 0) return false;
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase();
        const name = c.customer?.name?.toLowerCase() ?? "";
        const body = c.last_message?.body?.toLowerCase() ?? "";
        return name.includes(q) || body.includes(q);
      }
      return true;
    }), [conversations, tab, deferredSearch]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread_count > 0).length,
    [conversations],
  );

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="border-b border-gray-200/60 p-4 dark:border-gray-800/60">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Messages
        </h2>

        {/* Tabs */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              tab === "all"
                ? "bg-gradient-to-r from-sugu-400 to-sugu-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
            )}
          >
            Tous ({conversations.length})
          </button>
          <button
            onClick={() => setTab("unread")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              tab === "unread"
                ? "bg-gradient-to-r from-sugu-400 to-sugu-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
            )}
          >
            Non lus ({unreadCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation…"
            className="form-input w-full pl-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={tab === "unread" ? "Tout est lu !" : "Aucune conversation"}
            description={
              tab === "unread"
                ? "Vous n'avez aucun message non lu."
                : "Les messages de vos clients apparaîtront ici."
            }
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {filtered.map((conv) => (
              <ConversationCard
                key={conv.id}
                conversation={conv}
                isSelected={conv.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
