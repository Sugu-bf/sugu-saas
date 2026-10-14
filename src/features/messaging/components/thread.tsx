"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, Ban, CircleX, Eye, Flag, MoreHorizontal, Package, PackagePlus, Phone, ShoppingBag, UserRound } from "lucide-react";
import { Avatar, Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, ErrorState, IconButton, Skeleton, buttonVariants, cn } from "@/design-system";
import { routeOf, type MessagingScope } from "../api";
import { MESSAGE_LIMITS, type Conversation, type Message, type Profile } from "../contract";
import { closedNotice, dayKey, formatClock, formatDayHeading, presenceLabel, senderLabel, threadTitleOf } from "../format";
import { usePresence, useThread, type Thread } from "../hooks";
import { sentStateOf, type PendingMessage } from "../outbox";
import { useSocketState } from "../realtime";
import { Attachments, ConnectionNote, DeliveryTick, ProductCardView } from "./bits";
import { Composer } from "./composer";
import { DecisionDialog, ReportDialog, ShareProductDialog, type ConversationDecision } from "./dialogs";

// ============================================================
// An open conversation: who it is with, the messages, and the field
// to answer. The same screen for the three profiles; what a profile
// may do is what the server says in `conversation.can`.
// ============================================================

/** Where a profile goes from a conversation. Every link is a real page of the portal. */
export interface ThreadLinks {
  /** The page of the other side (a customer of the store). */
  profile?: string | null;
  /** The orders of the other side. */
  orders?: string | null;
  /** The order or the mission the conversation is about. */
  context?: { label: string; href: string } | null;
  /** The page of a shared product. */
  product?: (productId: string) => string | null;
}

export interface ThreadProps {
  scope: MessagingScope;
  conversation: Conversation;
  /** The signed-in account, to tell its own events from the other side's. */
  viewerId: string | null;
  links: ThreadLinks;
  /** A number the profile already has the right to call, or null. */
  phone: string | null;
  /** Extra line under the title (agency: the courier and the state of the mission). */
  subtitle?: string | null;
}

const NEAR_BOTTOM_PX = 80;

export function ThreadView({ scope, conversation, viewerId, links, phone, subtitle }: ThreadProps) {
  const profile = scope.profile;
  const thread = useThread(scope, conversation.id, viewerId);
  const socket = useSocketState();
  const presence = usePresence(scope, conversation.id, conversation.peer.type === "customer" || conversation.peer.type === "courier");

  const [sharing, setSharing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState<Message | null>(null);
  const [decision, setDecision] = useState<ConversationDecision>(null);

  const notice = profile === "agency" ? null : closedNotice(conversation);
  const state = presenceLabel(presence.data);
  const title = threadTitleOf(conversation, profile);

  return (
    <section aria-label={`Conversation : ${title}`} className="flex h-full min-h-0 flex-col bg-surface" data-thread={conversation.id}>
      {/* On a phone every pixel of the row goes to the title: for a courier it is the number of the mission. */}
      <header className="flex items-center gap-1 border-b border-border px-1 py-2 md:gap-2 md:px-4">
        <Link
          href={routeOf(profile)}
          aria-label="Retour aux conversations"
          className={cn(buttonVariants({ variant: "quiet", iconOnly: true }), "md:hidden")}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>

        <span className="relative shrink-0">
          <Avatar name={conversation.peer.name} src={conversation.peer.avatarUrl} size="lg" className="size-8 text-meta md:size-10 md:text-body" />
          {state?.online && <span className="absolute right-0 bottom-0 size-2.5 rounded-pill border-2 border-surface bg-success-icon" aria-hidden="true" />}
        </span>

        <div className="min-w-0 flex-1 pl-1 md:pl-0">
          <h2 className="truncate text-body font-semibold text-foreground md:text-section-title">{title}</h2>
          <p className="truncate text-meta text-foreground-muted">
            {subtitle ?? (
              <>
                {profile !== "vendor" && conversation.orderNumber && <span>{conversation.peer.name}</span>}
                {profile !== "vendor" && conversation.orderNumber && state && <span aria-hidden="true"> · </span>}
                {state && <span className={state.online ? "font-medium text-success-fg" : undefined}>{state.text}</span>}
              </>
            )}
          </p>
        </div>

        {phone && (
          // `cn` settles the paddings of the variant: without it the icon is squeezed to nothing.
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} aria-label={`Appeler ${conversation.peer.name}`} className={cn(buttonVariants({ variant: "quiet", iconOnly: true }))}>
            <Phone className="size-4 shrink-0" aria-hidden="true" />
          </a>
        )}

        {profile !== "agency" && (
          <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="Actions de la conversation" variant="secondary" />}>
            {links.profile && (
              <DropdownMenuItem asChild>
                <Link href={links.profile}>
                  <UserRound className="size-4 text-foreground-subtle" aria-hidden="true" />
                  Voir le profil client
                </Link>
              </DropdownMenuItem>
            )}
            {links.orders && (
              <DropdownMenuItem asChild>
                <Link href={links.orders}>
                  <ShoppingBag className="size-4 text-foreground-subtle" aria-hidden="true" />
                  Voir ses commandes
                </Link>
              </DropdownMenuItem>
            )}
            {conversation.can.shareProduct && (
              <DropdownMenuItem icon={PackagePlus} onSelect={() => setSharing(true)}>
                Partager un produit
              </DropdownMenuItem>
            )}
            {conversation.can.report && (
              <DropdownMenuItem icon={Flag} onSelect={() => setReporting(true)}>
                Signaler un message
              </DropdownMenuItem>
            )}
            {(conversation.can.block || conversation.can.close) && <DropdownMenuSeparator />}
            {conversation.can.block && (
              <DropdownMenuItem icon={Ban} onSelect={() => setDecision("block")}>
                Bloquer ce client
              </DropdownMenuItem>
            )}
            {conversation.can.close && (
              <DropdownMenuItem icon={CircleX} tone="danger" onSelect={() => setDecision("close")}>
                Fermer la conversation
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        )}
      </header>

      {links.context && (
        // The whole row is the link: on a phone it is as tall as a finger.
        <Link
          href={links.context.href}
          className="flex min-h-8 items-center gap-1.5 border-b border-border px-4 text-meta font-medium text-foreground-muted hover:bg-surface-subtle hover:text-foreground focus-visible:-outline-offset-2 touch:min-h-touch"
        >
          <Package className="size-3.5 shrink-0 text-foreground-subtle" aria-hidden="true" />
          {links.context.label}
        </Link>
      )}

      <ConnectionNote state={socket} />

      {profile === "agency" && (
        <div className="px-4 pt-3">
          {/* Not an alert: nothing happened, the screen is simply read-only. */}
          <div role="note" className="flex gap-3 rounded-panel border border-warning-border bg-warning-bg p-3" data-read-only>
            <Eye className="mt-0.5 size-4 shrink-0 text-warning-icon" aria-hidden="true" />
            <div>
              <p className="text-label font-semibold text-warning-fg">Lecture seule</p>
              <p className="text-body text-warning-fg">Vous consultez cette conversation à titre de supervision. Vous ne pouvez pas envoyer de message.</p>
            </div>
          </div>
        </div>
      )}

      {reporting && (
        <div className="flex items-center justify-between gap-3 border-b border-info-border bg-info-bg px-4 py-2 text-label text-info-fg" role="status">
          <span>Choisissez le message à signaler.</span>
          <Button size="compact" onClick={() => setReporting(false)}>
            Annuler
          </Button>
        </div>
      )}

      <Messages
        thread={thread}
        conversation={conversation}
        profile={profile}
        productHref={links.product ?? null}
        reporting={reporting}
        onReport={(message) => {
          setReporting(false);
          setReported(message);
        }}
      />

      {profile !== "agency" &&
        (notice ? (
          <p className="border-t border-border bg-surface-subtle px-4 py-3 text-center text-label text-foreground-muted" role="status">
            {notice}
          </p>
        ) : (
          <Composer
            onSend={thread.send}
            onTyping={thread.notifyTyping}
            imageExtensions={MESSAGE_LIMITS.imageExtensions}
            label={`Écrire à ${conversation.peer.name}`}
          />
        ))}

      {conversation.can.shareProduct && <ShareProductDialog open={sharing} onOpenChange={setSharing} conversationId={conversation.id} onShare={thread.shareProduct} />}
      <ReportDialog scope={scope} conversationId={conversation.id} message={reported} onClose={() => setReported(null)} />
      {profile !== "agency" && <DecisionDialog scope={scope} conversation={conversation} decision={decision} onClose={() => setDecision(null)} />}
    </section>
  );
}

// ── The messages ────────────────────────────────────────────

interface MessagesProps {
  thread: Thread;
  conversation: Conversation;
  profile: Profile;
  productHref: ((productId: string) => string | null) | null;
  reporting: boolean;
  onReport: (message: Message) => void;
}

function Messages({ thread, conversation, profile, productHref, reporting, onReport }: MessagesProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  /** The reader is at the bottom: what arrives is followed. */
  const following = useRef(true);
  /** Where the reader was when older messages were asked. */
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const settled = useRef(false);
  const [atBottom, setAtBottom] = useState(true);
  /** The last message the reader had under their eyes when they left the bottom. */
  const [seenId, setSeenId] = useState<string | null>(null);
  const latestId = useRef<string | null>(null);

  const { messages, pending } = thread;
  const firstId = messages[0]?.id ?? null;
  const last = messages[messages.length - 1] ?? null;
  const lastPending = pending[pending.length - 1] ?? null;
  const lastKey = lastPending?.clientId ?? last?.id ?? null;
  const lastIncomingId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index--) {
      if (!messages[index].own && messages[index].senderType !== "system") return messages[index].id;
    }
    return null;
  }, [messages]);

  const toBottom = useCallback((smooth = false) => {
    const element = scroller.current;
    if (!element) return;
    if (typeof element.scrollTo === "function") element.scrollTo({ top: element.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    else element.scrollTop = element.scrollHeight;
  }, []);

  const loadOlder = useCallback(() => {
    const element = scroller.current;
    if (!element || !thread.hasOlder || thread.loadingOlder) return;
    anchor.current = { height: element.scrollHeight, top: element.scrollTop };
    thread.loadOlder();
  }, [thread]);

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    const near = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    following.current = near;
    setAtBottom(near);
    if (near) setSeenId(latestId.current);
    if (settled.current && element.scrollTop < 48) loadOlder();
  };

  // Older messages came in above: the reader stays on the message they were reading.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !anchor.current) return;
    element.scrollTop = element.scrollHeight - anchor.current.height + anchor.current.top;
    anchor.current = null;
  }, [firstId]);

  // Something arrived below. Followed when the reader is at the bottom or
  // wrote it; otherwise only counted, and the reader keeps their place.
  const previousLastKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    latestId.current = last?.id ?? null;
    if (lastKey === null || lastKey === previousLastKey.current) return;
    const first = previousLastKey.current === null;
    previousLastKey.current = lastKey;

    const mine = lastPending !== null || (last?.own ?? false);
    if (first || following.current || (mine && profile !== "agency")) {
      toBottom();
      following.current = true;
      settled.current = true;
    }
  }, [lastKey, last, lastPending, profile, toBottom]);

  // Messages that arrived below while the reader was reading higher up.
  const unseen = useMemo(() => {
    if (atBottom || !seenId) return 0;
    const index = messages.findIndex((message) => message.id === seenId);
    return index < 0 ? 0 : messages.length - 1 - index;
  }, [atBottom, seenId, messages]);

  // A picture that finishes loading, or a message that says why it failed,
  // makes the thread taller: the bottom stays the bottom. Watched once the
  // thread is drawn (while it loads there is nothing to watch).
  const drawn = !thread.isLoading && !thread.isError;
  useEffect(() => {
    const element = content.current;
    if (!drawn || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (following.current) toBottom();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [drawn, toBottom]);

  // Read: only what the reader can actually see, in a visible tab.
  const read = thread.read;
  useEffect(() => {
    if (!lastIncomingId || !atBottom) return;
    const mark = () => {
      if (document.visibilityState === "visible") read(lastIncomingId);
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [lastIncomingId, atBottom, read]);

  // New messages of the other side are said to a screen reader; the history
  // (what was there when the thread opened) is not.
  const [heard, setHeard] = useState<{ ready: boolean; id: string | null; text: string }>({ ready: false, id: null, text: "" });
  if (!thread.isLoading && (!heard.ready || heard.id !== lastIncomingId)) {
    const message = heard.ready ? messages.find((candidate) => candidate.id === lastIncomingId) : undefined;
    setHeard({
      ready: true,
      id: lastIncomingId,
      text: message ? `Nouveau message de ${senderLabel(message)} : ${message.body ? message.body.slice(0, 140) : "pièce jointe"}` : heard.text,
    });
  }

  // Where a day starts, and where the writer changes.
  const rows = useMemo(
    () =>
      messages.map((message, index) => {
        const previous = index > 0 ? messages[index - 1] : null;
        const newDay = !previous || dayKey(previous.at) !== dayKey(message.at);
        const newSender = newDay || previous?.senderType !== message.senderType || previous?.senderId !== message.senderId;
        return { message, newDay, newSender };
      }),
    [messages],
  );

  if (thread.isLoading) return <ThreadSkeleton />;
  if (thread.isError) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <ErrorState title="Impossible de charger les messages" onRetry={thread.refetch} retrying={thread.isRefetching} />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 py-3 md:px-4" data-thread-scroller tabIndex={0} role="log" aria-label="Messages" aria-live="off">
        <div ref={content} className="flex flex-col gap-1.5">
          {thread.hasOlder && (
            <div className="flex justify-center pb-2">
              <Button size="compact" onClick={loadOlder} loading={thread.loadingOlder}>
                Messages précédents
              </Button>
            </div>
          )}

          {messages.length === 0 && pending.length === 0 && (
            <p className="py-10 text-center text-body text-foreground-muted">{profile === "agency" ? "Aucun message dans cette conversation." : "Aucun message pour l'instant. Écrivez le premier."}</p>
          )}

          {rows.map(({ message, newDay, newSender }) => {
            return (
              <div key={message.id}>
                {newDay && <DayHeading iso={message.at} />}
                {message.type === "system_event" || message.senderType === "system" ? (
                  <p className="py-1 text-center text-meta text-foreground-subtle">{message.body}</p>
                ) : (
                  <Bubble
                    message={message}
                    profile={profile}
                    peerAvatar={conversation.peer.avatarUrl}
                    showSender={newSender}
                    mark={message.own && profile !== "agency" ? sentStateOf(message, thread.peerLastReadId) : null}
                    productHref={productHref}
                    report={reporting && !message.own && !message.flagged ? () => onReport(message) : null}
                  />
                )}
              </div>
            );
          })}

          {pending.map((message) => (
            <PendingBubble key={message.clientId} message={message} onRetry={() => thread.retry(message.clientId)} onDiscard={() => thread.discard(message.clientId)} />
          ))}

          {thread.typingName && <p className="pt-1 pl-10 text-meta text-foreground-subtle">{thread.typingName} écrit…</p>}
        </div>
      </div>

      {!atBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            size="compact"
            icon={ArrowDown}
            className="pointer-events-auto shadow-overlay"
            onClick={() => toBottom(true)}
          >
            {unseen > 0 ? (unseen === 1 ? "1 nouveau message" : `${unseen} nouveaux messages`) : "Derniers messages"}
          </Button>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {heard.text}
      </p>
    </div>
  );
}

function DayHeading({ iso }: { iso: string }) {
  return (
    <p className="flex items-center gap-3 py-2 text-meta text-foreground-subtle">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <time dateTime={iso}>{formatDayHeading(iso)}</time>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </p>
  );
}

interface BubbleProps {
  message: Message;
  profile: Profile;
  peerAvatar: string | null;
  showSender: boolean;
  mark: "sent" | "read" | null;
  productHref: ((productId: string) => string | null) | null;
  report: (() => void) | null;
}

function Bubble({ message, profile, peerAvatar, showSender, mark, productHref, report }: BubbleProps) {
  const own = message.own;
  const sender = senderLabel(message);
  const time = formatClock(message.at);
  const hasText = message.body.trim() !== "" && !(message.type === "product_card" && message.body === message.product?.name);

  const meta = (
    <span className="flex shrink-0 items-center gap-1.5 pb-0.5 text-meta text-foreground-subtle">
      <time dateTime={message.at} className="tabular-nums">
        {time}
      </time>
      {mark && <DeliveryTick mark={mark} />}
      {!own && message.flagged && <span>· Signalé</span>}
    </span>
  );

  return (
    <div className={cn("flex items-start gap-2", own ? "justify-end" : "justify-start", showSender && "mt-2")} data-message={message.id} data-own={own}>
      {!own && <span className="w-8 shrink-0">{showSender && <Avatar name={sender} src={message.senderType === "customer" ? peerAvatar : null} size="md" />}</span>}

      <div className={cn("flex max-w-[88%] min-w-0 flex-col gap-1 md:max-w-[75%]", own ? "items-end" : "items-start")}>
        <span className="sr-only">{own && profile !== "agency" ? "Vous" : sender}</span>
        {/* The agency reads both sides: each bubble says who wrote it. */}
        {profile === "agency" && showSender && <span className="text-meta font-medium text-foreground-muted" aria-hidden="true">{sender}</span>}

        {/* What was received carries its time beside it; what was sent, under it, with its state. */}
        <div className={cn("flex max-w-full min-w-0 gap-2", own ? "flex-col items-end gap-1" : "items-end")}>
          <div className={cn("flex min-w-0 flex-col gap-1", own ? "items-end" : "items-start")}>
            {hasText && (
              <p
                className={cn(
                  "max-w-full rounded-panel px-3 py-2 text-body break-words whitespace-pre-wrap",
                  own ? (profile === "agency" ? "border border-border bg-surface text-foreground" : "bg-primary text-primary-foreground") : "bg-surface-subtle text-foreground",
                )}
              >
                {message.body}
              </p>
            )}

            {message.product && <ProductCardView product={message.product} sentAt={message.at} href={productHref ? productHref(message.product.id) : null} />}
            <Attachments attachments={message.attachments} align={own ? "end" : "start"} />
          </div>
          {meta}
        </div>

        {report && (
          <Button size="compact" icon={Flag} onClick={report}>
            Signaler ce message
          </Button>
        )}
      </div>
    </div>
  );
}

/** A message that left this screen and that the server has not confirmed. Never drawn as sent. */
function PendingBubble({ message, onRetry, onDiscard }: { message: PendingMessage; onRetry: () => void; onDiscard: () => void }) {
  const failed = message.state === "failed";
  const text = message.kind === "product" ? `Produit : ${message.productName ?? ""}` : message.body;

  return (
    <div className="mt-2 flex justify-end" data-pending={message.clientId} data-state={message.state}>
      <div className="flex max-w-[85%] min-w-0 flex-col items-end gap-1 md:max-w-[70%]">
        <span className="sr-only">Vous</span>
        {text && (
          <p className={cn("max-w-full rounded-panel px-3 py-2 text-body break-words whitespace-pre-wrap", failed ? "border border-danger-border bg-danger-bg text-danger-fg" : "bg-primary/70 text-primary-foreground")}>
            {text}
          </p>
        )}
        {message.files.length > 0 && (
          <p className={cn("rounded-panel border px-3 py-1.5 text-meta", failed ? "border-danger-border bg-danger-bg text-danger-fg" : "border-border bg-surface-subtle text-foreground-muted")}>
            {message.files.length === 1 ? message.files[0].name : `${message.files.length} fichiers`}
          </p>
        )}

        {failed ? (
          <div className="flex flex-col items-end gap-1" role="alert">
            <span className="flex items-center gap-1.5 text-meta text-danger-fg">
              <DeliveryTick mark="failed" />
              {message.error ?? "Ce message n'a pas été envoyé."}
            </span>
            <span className="flex gap-2">
              {message.retryable && (
                <Button size="compact" variant="outline" onClick={onRetry}>
                  Réessayer
                </Button>
              )}
              <Button size="compact" onClick={onDiscard}>
                Supprimer
              </Button>
            </span>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-meta text-foreground-subtle">
            En cours d&apos;envoi
            <DeliveryTick mark="sending" />
          </span>
        )}
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-hidden px-4 py-4" aria-busy="true" aria-label="Chargement des messages">
      {[false, true, false, false, true].map((own, index) => (
        <div key={index} className={cn("flex", own ? "justify-end" : "justify-start")}>
          <Skeleton className={cn("h-10 rounded-panel", index % 2 === 0 ? "w-3/5" : "w-2/5")} />
        </div>
      ))}
    </div>
  );
}

/** Shown beside the list when no conversation is open (tablet and desktop). */
export function NoThread({ children }: { children: ReactNode }) {
  return <div className="hidden h-full min-h-0 flex-1 items-center justify-center bg-surface md:flex">{children}</div>;
}
