"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, ImageIcon, MessagesSquare, Package, RefreshCw, Search } from "lucide-react";
import { Avatar, Button, EmptyState, ErrorState, IconButton, Input, Select, Skeleton, cn } from "@/design-system";
import { routeOf, type ConversationFilters, type MessagingScope } from "../api";
import type { Conversation, Profile } from "../contract";
import { agencyRowDetail, formatListDate, previewOf, titleOf } from "../format";
import { useConversations, useListRealtime } from "../hooks";
import { UnreadCount } from "./bits";

// ============================================================
// The list of conversations: search, filter, rows, next page.
// Search and filters are the server's, over every conversation of
// the reader; the next page is asked with what the previous one
// answered (a cursor, or a page number for an agency).
// ============================================================

const HEADINGS: Record<Profile, { title: string; description: string }> = {
  vendor: { title: "Messages", description: "Discutez avec vos clients" },
  courier: { title: "Messages", description: "Vos échanges avec les clients et les boutiques de vos missions" },
  agency: { title: "Conversations", description: "Suivez les échanges liés à vos livraisons" },
};

export interface CourierOption {
  /** User account of the courier: what the filter expects. */
  id: string;
  name: string;
}

interface ConversationListProps {
  scope: MessagingScope;
  /** The conversation open next to the list, if any. */
  activeId: string | null;
  /** Agency: the couriers the list can be narrowed to. */
  couriers?: CourierOption[];
  className?: string;
}

/** What is typed, a moment after the last key: one request per pause, not per letter. */
function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ConversationList({ scope, activeId, couriers = [], className }: ConversationListProps) {
  const profile = scope.profile;
  const [typed, setTyped] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [courierId, setCourierId] = useState("");
  const search = useDebounced(typed);

  const filters: ConversationFilters = { search, unreadOnly: profile !== "agency" && unreadOnly, courierId: profile === "agency" && courierId ? courierId : null };
  const list = useConversations(scope, filters);
  useListRealtime(scope);

  const heading = HEADINGS[profile];
  const filtered = search.trim() !== "" || filters.unreadOnly || filters.courierId !== null;
  // Counts of the whole list, whatever the search or the filter: the server answers them with each page.
  const all = list.counts?.all;
  const unread = list.counts?.unread;

  return (
    <section aria-label={heading.title} className={cn("flex min-h-0 flex-col bg-surface", className)}>
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-page-title text-foreground">{heading.title}</h1>
        <p className="text-body text-foreground-muted">{heading.description}</p>
      </header>

      <div className="flex flex-col gap-2 px-4 pb-3">
        {/* One row, as the mock-up draws it: the search, the filter, then the refresh. */}
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              leadingIcon={Search}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher une conversation"
              maxLength={80}
            />
          </div>
          {profile !== "agency" && (
            // From tablet up: a select. A phone gets the two tabs below.
            <div className="hidden w-28 shrink-0 md:block">
              <Select aria-label="Filtrer les conversations" value={unreadOnly ? "unread" : "all"} onChange={(event) => setUnreadOnly(event.target.value === "unread")}>
                <option value="all">Toutes</option>
                <option value="unread">Non lues</option>
              </Select>
            </div>
          )}
          <IconButton icon={RefreshCw} label="Actualiser" variant="secondary" loading={list.isRefetching && !list.isFetchingNextPage} onClick={() => void list.refetch()} />
        </div>

        {profile === "agency" && couriers.length > 0 && (
          <Select aria-label="Coursier" value={courierId} onChange={(event) => setCourierId(event.target.value)}>
            <option value="">Tous les coursiers</option>
            {couriers.map((courier) => (
              <option key={courier.id} value={courier.id}>
                {courier.name}
              </option>
            ))}
          </Select>
        )}

        {profile !== "agency" && (
          <div role="group" aria-label="Filtrer les conversations" className="grid grid-cols-2 gap-1 rounded-pill bg-surface-subtle p-1 md:hidden">
            {[
              { value: false, label: "Toutes", count: all },
              { value: true, label: "Non lus", count: unread },
            ].map((tab) => (
              <button
                key={tab.label}
                type="button"
                aria-pressed={unreadOnly === tab.value}
                onClick={() => setUnreadOnly(tab.value)}
                className={cn(
                  "h-touch rounded-pill text-label transition-colors duration-100",
                  unreadOnly === tab.value ? "bg-surface font-semibold text-primary shadow-raised" : "text-foreground-muted",
                )}
              >
                {tab.label}
                {tab.count != null && <span className="tabular-nums"> ({tab.count})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:border-t md:border-border" data-conversation-rows>
        {list.isLoading ? (
          <ListSkeleton />
        ) : list.isError && list.rows.length === 0 ? (
          <ErrorState title="Impossible de charger les conversations" onRetry={() => void list.refetch()} retrying={list.isRefetching} />
        ) : list.rows.length === 0 ? (
          filtered ? (
            <EmptyState icon={Search} title="Aucune conversation ne correspond" description="Modifiez la recherche ou le filtre." />
          ) : (
            <EmptyState icon={MessagesSquare} title="Aucune conversation" description={EMPTY[profile]} />
          )
        ) : (
          <>
            <ul className={cn("divide-y divide-border", list.isPlaceholderData && "opacity-60")}>
              {list.rows.map((conversation) => (
                <li key={conversation.id}>
                  <ConversationRow conversation={conversation} profile={profile} active={conversation.id === activeId} />
                </li>
              ))}
            </ul>
            {list.hasNextPage && (
              <div className="flex justify-center p-3">
                <Button onClick={() => void list.fetchNextPage()} loading={list.isFetchingNextPage}>
                  Afficher plus de conversations
                </Button>
              </div>
            )}
            {list.isError && (
              <p role="alert" className="px-4 pb-3 text-meta text-danger-fg">
                La liste n&apos;a pas pu être actualisée. Elle peut ne plus être à jour.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const EMPTY: Record<Profile, string> = {
  vendor: "Les messages de vos clients apparaîtront ici.",
  courier: "Écrivez à un client ou à une boutique depuis la fiche d'une mission : l'échange apparaîtra ici.",
  agency: "Les échanges de vos coursiers avec les clients et les boutiques de vos livraisons apparaîtront ici.",
};

const PREVIEW_ICON = { image: ImageIcon, file: FileText, product: Package } as const;

function ConversationRow({ conversation, profile, active }: { conversation: Conversation; profile: Profile; active: boolean }) {
  const title = titleOf(conversation, profile);
  const preview = previewOf(conversation, profile);
  const Icon = preview.kind === "image" || preview.kind === "file" || preview.kind === "product" ? PREVIEW_ICON[preview.kind] : null;
  const unread = conversation.unread > 0;
  const closed = conversation.status === "closed" || conversation.status === "blocked";

  return (
    <Link
      href={`${routeOf(profile)}/${conversation.id}`}
      aria-current={active ? "page" : undefined}
      data-conversation={conversation.id}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors duration-100 hover:bg-surface-subtle focus-visible:-outline-offset-2",
        active && "bg-brand-subtle hover:bg-brand-subtle",
      )}
    >
      <span className="relative shrink-0">
        <Avatar name={conversation.peer.name} src={conversation.peer.avatarUrl} size="lg" />
        {conversation.peer.online === true && (
          <span className="absolute right-0 bottom-0 size-2.5 rounded-pill border-2 border-surface bg-success-icon">
            <span className="sr-only">En ligne</span>
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-body text-foreground", unread ? "font-semibold" : "font-medium")}>{title}</span>
          <span className={cn("shrink-0 text-meta tabular-nums", unread ? "font-medium text-primary" : "text-foreground-subtle")}>{formatListDate(conversation.lastMessage?.at ?? conversation.updatedAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("flex min-w-0 items-center gap-1.5 text-label", unread ? "text-foreground" : "text-foreground-muted")}>
            {profile === "agency" ? (
              <span className="truncate">{agencyRowDetail(conversation)}</span>
            ) : (
              <>
                {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
                <span className="truncate font-normal">{preview.text}</span>
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {closed && <span className="text-meta text-foreground-subtle">{conversation.status === "blocked" ? "Bloquée" : "Fermée"}</span>}
            <UnreadCount count={conversation.unread} />
          </span>
        </span>
        {profile === "agency" && (
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-meta text-foreground-subtle">
            {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{preview.text}</span>
          </span>
        )}
      </span>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Chargement des conversations" className="divide-y divide-border">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-10 rounded-pill" />
          <span className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </span>
        </li>
      ))}
    </ul>
  );
}
