"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { MessagesSquare } from "lucide-react";
import { Button, EmptyState, ErrorState, Skeleton, cn } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import { routeOf, type MessagingScope } from "../api";
import type { Conversation } from "../contract";
import { scopeReady, useConversation } from "../hooks";
import { ConversationList, type CourierOption } from "./conversation-list";
import { NoThread, ThreadView, type ThreadLinks } from "./thread";

// ============================================================
// The messaging screen of a profile.
//
// From 768px: the list and the open conversation side by side, each
// in its own card, the whole screen exactly as tall as the window.
// Below: one of the two at a time. The list is an ordinary page; an
// open conversation covers the screen, with its own way back, and
// follows the visible part of the window so that the field stays
// above the keyboard.
// ============================================================

/** What a profile adds to an open conversation. */
export interface ThreadExtras {
  links: ThreadLinks;
  phone: string | null;
  subtitle?: string | null;
  /** A third column, from 1400px (agency: the mission). */
  panel?: ReactNode;
}

export interface MessagingWorkspaceProps {
  scope: MessagingScope;
  viewerId: string | null;
  /** The conversation of the address, or null on the list. */
  conversationId: string | null;
  couriers?: CourierOption[];
  /** A hook of the profile, called for the open conversation. Its identity never changes. */
  useExtras: (conversation: Conversation) => ThreadExtras;
}

/**
 * On a phone, the height really visible: `dvh` does not shrink when the
 * keyboard opens on iOS, and the field would sit under it.
 */
function useVisibleViewport(target: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const element = target.current;
    if (!viewport || !element) return;

    const apply = () => {
      element.style.setProperty("--visible-height", `${Math.round(viewport.height)}px`);
      element.style.setProperty("--visible-top", `${Math.round(viewport.offsetTop)}px`);
    };
    apply();
    viewport.addEventListener("resize", apply);
    viewport.addEventListener("scroll", apply);
    return () => {
      viewport.removeEventListener("resize", apply);
      viewport.removeEventListener("scroll", apply);
    };
  }, [target]);
}

const CARD = "md:overflow-hidden md:rounded-panel md:border md:border-border";

export function MessagingWorkspace({ scope, viewerId, conversationId, couriers, useExtras }: MessagingWorkspaceProps) {
  const open = conversationId !== null;

  if (!scopeReady(scope)) {
    return (
      <div className="sugu-ui">
        <WorkspaceSkeleton />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "sugu-ui -mx-4 -mt-4 md:m-0 md:grid md:gap-4",
        // Exactly the room left by the top bar and the padding of the page: nothing scrolls but the list and the thread.
        "md:h-[calc(100dvh_-_3.5rem_-_1rem_-_var(--shell-scroll-pad-bottom))] lg:h-[calc(100dvh_-_4rem_-_2rem_-_var(--shell-scroll-pad-bottom))]",
        // One row, as tall as the screen and no taller: a long list or a long thread scrolls inside its card.
        "md:grid-rows-[minmax(0,1fr)] md:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]",
      )}
      data-messaging={scope.profile}
    >
      <ConversationList scope={scope} activeId={conversationId} couriers={couriers} className={cn(CARD, "md:h-full", open && "hidden md:flex")} />

      {open ? (
        <Cover>
          <OpenConversation key={conversationId} scope={scope} viewerId={viewerId} conversationId={conversationId} useExtras={useExtras} />
        </Cover>
      ) : (
        <NoThread>
          <div className={cn(CARD, "flex size-full items-center justify-center")}>
            <EmptyState icon={MessagesSquare} title="Choisissez une conversation" description="Elle s'ouvre ici, à côté de la liste." />
          </div>
        </NoThread>
      )}
    </div>
  );
}

/**
 * Phone: over the whole screen, above the top bar, down to the tab bar when
 * the route keeps one (`--shell-bottom-inset`, zero on a conversation).
 * A pane from 768px.
 */
export function Cover({ children }: { children: ReactNode }) {
  const cover = useRef<HTMLDivElement>(null);
  useVisibleViewport(cover);

  return (
    <div
      ref={cover}
      style={{ "--visible-height": "100dvh", "--visible-top": "0px" } as CSSProperties}
      className="fixed inset-x-0 top-(--visible-top) z-nav h-[calc(var(--visible-height)_-_var(--shell-bottom-inset,0px))] bg-surface md:static md:z-auto md:h-full md:min-h-0 md:min-w-0"
      data-thread-cover
    >
      {children}
    </div>
  );
}

function OpenConversation({ scope, viewerId, conversationId, useExtras }: { scope: MessagingScope; viewerId: string | null; conversationId: string; useExtras: MessagingWorkspaceProps["useExtras"] }) {
  const conversation = useConversation(scope, conversationId);

  if (conversation.isLoading) {
    return (
      <div className={cn(CARD, "h-full")}>
        <ThreadSkeleton />
      </div>
    );
  }

  if (!conversation.data) {
    const missing = conversation.error instanceof ApiError && (conversation.error.status === 404 || conversation.error.status === 403);
    return (
      <div className={cn(CARD, "flex h-full flex-col items-center justify-center gap-3 p-4")}>
        {missing ? (
          <EmptyState
            icon={MessagesSquare}
            title="Conversation introuvable"
            description="Elle n'existe pas, ou vous n'y avez pas accès."
            action={
              <Button asChild>
                <Link href={routeOf(scope.profile)}>Retour aux conversations</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ErrorState title="Impossible de charger la conversation" onRetry={() => void conversation.refetch()} retrying={conversation.isRefetching} />
            <Button asChild variant="quiet">
              <Link href={routeOf(scope.profile)}>Retour aux conversations</Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  return <WithExtras scope={scope} viewerId={viewerId} conversation={conversation.data} useExtras={useExtras} />;
}

function WithExtras({ scope, viewerId, conversation, useExtras }: { scope: MessagingScope; viewerId: string | null; conversation: Conversation; useExtras: MessagingWorkspaceProps["useExtras"] }) {
  const extras = useExtras(conversation);

  return (
    <div className={cn("h-full min-h-0", extras.panel && "min-[1400px]:grid min-[1400px]:grid-cols-[minmax(0,1fr)_18rem] min-[1400px]:grid-rows-[minmax(0,1fr)] min-[1400px]:gap-4")}>
      <div className={cn(CARD, "h-full min-w-0")}>
        <ThreadView scope={scope} conversation={conversation} viewerId={viewerId} links={extras.links} phone={extras.phone} subtitle={extras.subtitle} />
      </div>
      {extras.panel && <aside className={cn(CARD, "hidden h-full overflow-y-auto bg-surface min-[1400px]:block")}>{extras.panel}</aside>}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex h-full flex-col bg-surface" aria-busy="true" aria-label="Chargement de la conversation">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Skeleton className="size-10 rounded-pill" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex-1 space-y-4 p-4">
        <Skeleton className="h-10 w-3/5 rounded-panel" />
        <Skeleton className="ml-auto h-10 w-2/5 rounded-panel" />
        <Skeleton className="h-10 w-1/2 rounded-panel" />
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement de la messagerie">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
