"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, CircleX, Headset, LifeBuoy, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  Avatar,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  ErrorState,
  FormErrorSummary,
  FormField,
  IconButton,
  Input,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  buttonVariants,
  cn,
} from "@/design-system";
import { useSession } from "@/features/auth/hooks";
import { Attachments, DeliveryTick } from "@/features/messaging/components/bits";
import { Composer } from "@/features/messaging/components/composer";
import { Cover } from "@/features/messaging/components/workspace";
import { dayKey, formatClock, formatDayHeading, formatFullDate, formatSince } from "@/features/messaging/format";
import { newClientId } from "@/features/messaging/outbox";
import { ApiError } from "@/lib/http/api-error";
import type { OutgoingReply } from "../api";
import {
  DESCRIPTION_MAX,
  REPLY_FILE_LIMITS,
  REPLY_MAX,
  SUBJECT_MAX,
  TICKET_FILTERS,
  countOf,
  priorityLabel,
  ticketKindLabel,
  validateNewTicket,
  type NewTicket,
  type Ticket,
  type TicketFilter,
  type TicketReply,
} from "../contract";
import { deskKinds, useSupportDesk } from "../desk";
import { describeSupportFailure, useCloseTicket, useCreateTicket, useReplies, useSendReply, useTicket, useTickets } from "../hooks";

// ============================================================
// Support — the tickets of a seller, on one route.
//
// The list, the open ticket and the form of a new one share
// `/vendor/tickets`: `?ticket=…` opens a ticket, `?new=1` the form.
// From 768px the list stays beside them; on a phone each takes the
// screen, with its own way back.
// ============================================================

const CARD = "md:overflow-hidden md:rounded-panel md:border md:border-border";

function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SupportScreen() {
  const { route: ROUTE } = useSupportDesk();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ticketId = params.get("ticket");
  const creating = params.get("new") === "1" && !ticketId;
  const open = Boolean(ticketId) || creating;

  const [filter, setFilter] = useState<TicketFilter>("all");
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(typed);

  const goTo = (query: string, replace = false) => {
    const href = query ? `${pathname}?${query}` : pathname;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  };

  return (
    <div
      className={cn(
        "sugu-ui -mx-4 -mt-4 md:m-0 md:grid md:gap-4",
        "md:h-[calc(100dvh_-_3.5rem_-_1rem_-_var(--shell-scroll-pad-bottom))] lg:h-[calc(100dvh_-_4rem_-_2rem_-_var(--shell-scroll-pad-bottom))]",
        "md:grid-rows-[minmax(0,1fr)] md:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]",
      )}
      data-support
    >
      <TicketList
        className={cn(CARD, "md:h-full", open && "hidden md:flex")}
        activeId={ticketId}
        filter={filter}
        onFilter={(next) => {
          setFilter(next);
          setPage(1);
        }}
        typed={typed}
        onTyped={(next) => {
          setTyped(next);
          setPage(1);
        }}
        search={search}
        page={page}
        onPage={setPage}
      />

      {creating ? (
        <Cover>
          <div className={cn(CARD, "h-full")}>
            <NewTicketForm onCancel={() => goTo("")} onCreated={(id) => goTo(`ticket=${encodeURIComponent(id)}`, true)} />
          </div>
        </Cover>
      ) : ticketId ? (
        <Cover>
          <OpenTicket key={ticketId} id={ticketId} />
        </Cover>
      ) : (
        <div className={cn(CARD, "hidden h-full items-center justify-center bg-surface md:flex")}>
          <EmptyState
            icon={LifeBuoy}
            title="Choisissez un ticket"
            description="Il s'ouvre ici, à côté de la liste."
            action={
              <Button asChild variant="primary" icon={Plus}>
                <Link href={`${ROUTE}?new=1`} scroll={false}>
                  Nouveau ticket
                </Link>
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}

// ── The list ────────────────────────────────────────────────

interface TicketListProps {
  className?: string;
  activeId: string | null;
  filter: TicketFilter;
  onFilter: (filter: TicketFilter) => void;
  typed: string;
  onTyped: (value: string) => void;
  search: string;
  page: number;
  onPage: (page: number) => void;
}

function TicketList({ className, activeId, filter, onFilter, typed, onTyped, search, page, onPage }: TicketListProps) {
  const { route: ROUTE, empty } = useSupportDesk();
  const tickets = useTickets({ filter, search, page });
  const data = tickets.data;
  const narrowed = filter !== "all" || search.trim() !== "";

  return (
    <section aria-label="Support" className={cn("flex min-h-0 flex-col bg-surface", className)}>
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-page-title text-foreground">Support</h1>
          <Button asChild variant="primary" icon={Plus} className="shrink-0">
            <Link href={`${ROUTE}?new=1`} scroll={false}>
              Nouveau ticket
            </Link>
          </Button>
        </div>
        <p className="mt-1 text-body text-foreground-muted">Soumettez et suivez vos demandes d&apos;assistance</p>
      </header>

      <div className="flex flex-col gap-2 px-4 pb-3">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input type="search" leadingIcon={Search} value={typed} onChange={(event) => onTyped(event.target.value)} placeholder="Rechercher…" aria-label="Rechercher un ticket" maxLength={80} />
          </div>
          <div className="hidden w-40 shrink-0 md:block">
            <Select aria-label="Statut" value={filter} onChange={(event) => onFilter(event.target.value as TicketFilter)}>
              {TICKET_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div role="group" aria-label="Filtrer les tickets" className="grid grid-cols-3 gap-1 rounded-pill bg-surface-subtle p-1 md:hidden">
          {TICKET_FILTERS.map((option) => {
            const count = countOf(data?.counts, option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => onFilter(option.value)}
                className={cn("h-touch rounded-pill text-label transition-colors duration-100", filter === option.value ? "bg-surface font-semibold text-primary shadow-raised" : "text-foreground-muted")}
              >
                {option.short}
                {count != null && <span className="tabular-nums"> ({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:border-t md:border-border">
        {tickets.isLoading ? (
          <ul aria-busy="true" aria-label="Chargement des tickets" className="divide-y divide-border">
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-9 rounded-pill" />
                <span className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </span>
              </li>
            ))}
          </ul>
        ) : tickets.isError && !data ? (
          <ErrorState title="Impossible de charger vos tickets" onRetry={() => void tickets.refetch()} retrying={tickets.isRefetching} />
        ) : !data || data.rows.length === 0 ? (
          narrowed ? (
            <EmptyState icon={Search} title="Aucun ticket ne correspond" description="Modifiez la recherche ou le statut." />
          ) : (
            <EmptyState icon={Headset} title="Aucun ticket" description={empty} />
          )
        ) : (
          <>
            <ul className={cn("divide-y divide-border", tickets.isPlaceholderData && "opacity-60")}>
              {data.rows.map((ticket) => (
                <li key={ticket.id}>
                  <TicketRow ticket={ticket} active={ticket.id === activeId} />
                </li>
              ))}
            </ul>
            {data.lastPage > 1 && (
              // The pages are the server's. Buttons of full size: on a phone they are hit with a thumb.
              <nav aria-label="Pages des tickets" className="flex items-center justify-between gap-3 border-t border-border px-4 py-2">
                <IconButton icon={ChevronLeft} label="Page précédente" variant="secondary" disabled={data.page <= 1 || tickets.isFetching} onClick={() => onPage(data.page - 1)} />
                <p className="text-label text-foreground-muted tabular-nums" aria-live="polite">
                  Page {data.page} sur {data.lastPage}
                </p>
                <IconButton icon={ChevronRight} label="Page suivante" variant="secondary" disabled={data.page >= data.lastPage || tickets.isFetching} onClick={() => onPage(data.page + 1)} />
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function TicketRow({ ticket, active }: { ticket: Ticket; active: boolean }) {
  const { route: ROUTE } = useSupportDesk();
  return (
    <Link
      href={`${ROUTE}?ticket=${encodeURIComponent(ticket.id)}`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      data-ticket={ticket.id}
      className={cn("flex items-center gap-3 px-4 py-3 transition-colors duration-100 hover:bg-surface-subtle focus-visible:-outline-offset-2", active && "bg-brand-subtle hover:bg-brand-subtle")}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-subtle text-foreground-subtle">
        <LifeBuoy className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-semibold text-foreground tabular-nums">#{ticket.number}</span>
        <span className="block truncate text-label text-foreground-muted">{ticket.subject}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge domain="ticket" code={ticket.status} />
        <span className="text-meta text-foreground-subtle tabular-nums">{formatSince(ticket.lastActivityAt)}</span>
      </span>
    </Link>
  );
}

// ── An open ticket ──────────────────────────────────────────

function OpenTicket({ id }: { id: string }) {
  const { route: ROUTE } = useSupportDesk();
  const ticket = useTicket(id);

  if (ticket.isLoading) {
    return (
      <div className={cn(CARD, "h-full space-y-4 bg-surface p-4")} aria-busy="true" aria-label="Chargement du ticket">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!ticket.data) {
    const missing = ticket.error instanceof ApiError && (ticket.error.status === 404 || ticket.error.status === 403);
    return (
      <div className={cn(CARD, "flex h-full flex-col items-center justify-center gap-3 bg-surface p-4")}>
        {missing ? (
          <EmptyState icon={LifeBuoy} title="Ticket introuvable" description="Il n'existe pas, ou il n'est pas rattaché à votre boutique." />
        ) : (
          <ErrorState title="Impossible de charger le ticket" onRetry={() => void ticket.refetch()} retrying={ticket.isRefetching} />
        )}
        <Button asChild>
          <Link href={ROUTE} scroll={false}>
            Retour aux tickets
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 min-[1400px]:grid min-[1400px]:grid-cols-[minmax(0,1fr)_17rem] min-[1400px]:grid-rows-[minmax(0,1fr)] min-[1400px]:gap-4">
      <div className={cn(CARD, "h-full min-w-0")}>
        <TicketThread ticket={ticket.data} />
      </div>
      <aside className={cn(CARD, "hidden h-full overflow-y-auto bg-surface min-[1400px]:block")} aria-label="Informations du ticket">
        <TicketFacts ticket={ticket.data} />
      </aside>
    </div>
  );
}

function facts(ticket: Ticket): { label: string; value: ReactNode }[] {
  const priority = priorityLabel(ticket.priority);
  return [
    { label: "Statut", value: <StatusBadge domain="ticket" code={ticket.status} /> },
    { label: ticket.topic ? "Thème" : "Catégorie", value: ticketKindLabel(ticket) },
    ...(priority ? [{ label: "Priorité", value: priority }] : []),
    ...(ticket.order?.number ? [{ label: "Commande", value: <Link href={`/vendor/orders/${ticket.order.id}`} className="font-medium text-foreground underline underline-offset-2">{ticket.order.number}</Link> }] : []),
    ...(ticket.openedBy ? [{ label: "Ouvert par", value: ticket.openedBy }] : []),
    { label: "Date de création", value: formatFullDate(ticket.createdAt) },
    { label: "Dernière activité", value: formatSince(ticket.lastActivityAt) },
  ];
}

function TicketFacts({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-4 p-4" data-ticket-facts>
      <h3 className="text-section-title text-foreground">Informations</h3>
      <dl className="space-y-3">
        {facts(ticket).map((fact) => (
          <div key={fact.label}>
            <dt className="text-meta text-foreground-subtle">{fact.label}</dt>
            <dd className="mt-0.5 text-body text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TicketThread({ ticket }: { ticket: Ticket }) {
  const { route: ROUTE, team } = useSupportDesk();
  const replies = useReplies(ticket.id);
  const send = useSendReply(ticket.id);
  const close = useCloseTicket(ticket.id);
  const [closing, setClosing] = useState(false);
  /** The reply that did not leave: kept whole, with its identifier, to be sent again. */
  const [failed, setFailed] = useState<{ reply: OutgoingReply; message: string; retryable: boolean } | null>(null);

  const all = useMemo(() => {
    const byId = new Map<string, TicketReply>();
    for (const page of replies.data?.pages ?? []) for (const reply of page.replies) byId.set(reply.id, reply);
    return [...byId.values()].sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at < b.at ? -1 : 1));
  }, [replies.data]);

  // The thread opens on its latest reply, and follows the seller's own.
  const scroller = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ height: number; top: number } | null>(null);
  const lastId = all[all.length - 1]?.id ?? null;
  const firstId = all[0]?.id ?? null;
  const following = useRef(true);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && following.current) element.scrollTop = element.scrollHeight;
  }, [lastId]);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !anchor.current) return;
    element.scrollTop = element.scrollHeight - anchor.current.height + anchor.current.top;
    anchor.current = null;
  }, [firstId]);

  const sending = useRef(false);
  const attempt = (reply: OutgoingReply) => {
    // One reply on its way at a time, whatever is clicked meanwhile.
    if (sending.current) return;
    sending.current = true;
    setFailed(null);
    following.current = true;
    send.mutate(reply, {
      onSettled: () => {
        sending.current = false;
      },
      onError: (error) => {
        const failure = describeSupportFailure(error);
        setFailed({ reply, message: failure.fields.attachments ?? failure.fields["attachments.0"] ?? failure.fields.body ?? failure.message, retryable: ["network", "server", "throttled"].includes(failure.kind) });
      },
    });
  };

  return (
    <section aria-label={`Ticket ${ticket.number}`} className="flex h-full min-h-0 flex-col bg-surface" data-ticket-thread={ticket.id}>
      <header className="flex items-start gap-2 border-b border-border px-2 py-2 md:px-4 md:py-3">
        <Link href={ROUTE} scroll={false} aria-label="Retour aux tickets" className={cn(buttonVariants({ variant: "quiet", iconOnly: true }), "md:hidden")}>
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-section-title text-foreground tabular-nums">#{ticket.number}</h2>
            <StatusBadge domain="ticket" code={ticket.status} />
          </div>
          <p className="mt-0.5 text-body font-medium break-words text-foreground">{ticket.subject}</p>
          <p className="text-meta text-foreground-subtle">Créé le {formatFullDate(ticket.createdAt)}</p>
          {/* Below 1400px the side panel is not there: what it says is said here, in one line. */}
          <p className="mt-1 text-meta text-foreground-muted min-[1400px]:hidden">
            {[ticketKindLabel(ticket), priorityLabel(ticket.priority) ? `Priorité ${priorityLabel(ticket.priority)!.toLowerCase()}` : null, ticket.openedBy ? `Ouvert par ${ticket.openedBy}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        {ticket.can.close && (
          <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="Actions du ticket" variant="secondary" />}>
            <DropdownMenuItem icon={CircleX} tone="danger" onSelect={() => setClosing(true)}>
              Fermer le ticket
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-4" tabIndex={0} role="log" aria-label="Échanges du ticket" aria-live="off" onScroll={(event) => {
        const element = event.currentTarget;
        following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}>
        {replies.isLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Chargement des échanges">
            <Skeleton className="h-16 w-4/5 rounded-panel" />
            <Skeleton className="h-12 w-3/5 rounded-panel" />
          </div>
        ) : replies.isError && all.length === 0 ? (
          <ErrorState title="Impossible de charger les échanges" onRetry={() => void replies.refetch()} retrying={replies.isRefetching} />
        ) : (
          <div className="flex flex-col gap-3">
            {replies.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  size="compact"
                  loading={replies.isFetchingNextPage}
                  onClick={() => {
                    const element = scroller.current;
                    if (element) anchor.current = { height: element.scrollHeight, top: element.scrollTop };
                    void replies.fetchNextPage();
                  }}
                >
                  Échanges précédents
                </Button>
              </div>
            )}
            {all.map((reply, index) => {
              const newDay = index === 0 || dayKey(all[index - 1].at) !== dayKey(reply.at);
              return (
                <div key={reply.id}>
                  {newDay && (
                    <p className="flex items-center gap-3 pb-2 text-meta text-foreground-subtle">
                      <span className="h-px flex-1 bg-border" aria-hidden="true" />
                      <time dateTime={reply.at}>{formatDayHeading(reply.at)}</time>
                      <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    </p>
                  )}
                  <ReplyView reply={reply} />
                </div>
              );
            })}
            {send.isPending && send.variables && <PendingReply reply={send.variables} />}
          </div>
        )}
      </div>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-t border-danger-border bg-danger-bg px-4 py-2 text-label text-danger-fg">
          <span className="flex min-w-0 items-center gap-2">
            <DeliveryTick mark="failed" />
            <span>Votre réponse n&apos;a pas été envoyée. {failed.message}</span>
          </span>
          <span className="flex gap-2">
            {failed.retryable && (
              <Button size="compact" variant="outline" onClick={() => attempt(failed.reply)}>
                Réessayer
              </Button>
            )}
            <Button size="compact" onClick={() => setFailed(null)}>
              Abandonner
            </Button>
          </span>
        </div>
      )}

      {ticket.can.reply ? (
        <Composer
          onSend={(body, files) => attempt({ clientId: newClientId(), body: body.trim(), files })}
          placeholder="Écrire une réponse…"
          label="Votre réponse"
          maxLength={REPLY_MAX}
          limits={REPLY_FILE_LIMITS}
          bodyRequired
          busy={send.isPending}
        />
      ) : (
        <p className="border-t border-border bg-surface-subtle px-4 py-3 text-center text-label text-foreground-muted" role="status">
          Ce ticket est fermé : il ne reçoit plus de réponse. Pour une nouvelle demande, ouvrez un nouveau ticket.
        </p>
      )}

      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title="Fermer ce ticket ?"
        description={`Un ticket fermé ne reçoit plus de réponse, ni de vous ni de ${team}. Vous ne pourrez pas le rouvrir depuis le portail.`}
        confirmLabel="Fermer le ticket"
        tone="danger"
        onConfirm={async () => {
          try {
            await close.mutateAsync();
            toast.success("Ticket fermé.");
          } catch (error) {
            toast.error(describeSupportFailure(error).message);
            throw error;
          }
        }}
      />
    </section>
  );
}

function ReplyView({ reply }: { reply: TicketReply }) {
  const name = reply.own ? "Moi" : reply.senderName;
  return (
    <div className="flex gap-3" data-reply={reply.id} data-own={reply.own}>
      <Avatar name={reply.own ? "Moi" : reply.senderName} size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-label">
          <span className="font-semibold text-foreground">{name}</span>
          <time dateTime={reply.at} className="text-meta text-foreground-subtle tabular-nums">
            {formatClock(reply.at)}
          </time>
        </p>
        <div className={cn("mt-1 space-y-2 rounded-panel px-3 py-2", reply.own ? "bg-brand-subtle" : "bg-surface-subtle")}>
          {reply.body && <p className="text-body break-words whitespace-pre-wrap text-foreground">{reply.body}</p>}
          <Attachments attachments={reply.attachments} align="start" />
        </div>
      </div>
    </div>
  );
}

/** On its way: shown as such, never as an exchange of the ticket. */
function PendingReply({ reply }: { reply: OutgoingReply }) {
  return (
    <div className="flex gap-3 opacity-70" data-pending-reply>
      <Avatar name="Moi" size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-label">
          <span className="font-semibold text-foreground">Moi</span>
          <span className="flex items-center gap-1 text-meta text-foreground-subtle">
            En cours d&apos;envoi <DeliveryTick mark="sending" />
          </span>
        </p>
        <div className="mt-1 rounded-panel bg-brand-subtle px-3 py-2">
          <p className="text-body break-words whitespace-pre-wrap text-foreground">{reply.body}</p>
          {reply.files.length > 0 && <p className="mt-1 text-meta text-foreground-muted">{reply.files.length === 1 ? reply.files[0].name : `${reply.files.length} fichiers`}</p>}
        </div>
      </div>
    </div>
  );
}

// ── A new ticket ────────────────────────────────────────────

const EMPTY_TICKET: NewTicket = { subject: "", category: "", description: "" };

function NewTicketForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const { data: user } = useSession();
  const desk = useSupportDesk();
  const kinds = deskKinds(desk, user);
  const create = useCreateTicket(desk.needsStore ? (user?.store_id ?? null) : null);
  const [values, setValues] = useState<NewTicket>(EMPTY_TICKET);
  const [errors, setErrors] = useState<Partial<Record<keyof NewTicket, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const subject = useRef<HTMLInputElement>(null);

  useEffect(() => {
    subject.current?.focus({ preventScroll: true });
  }, []);

  const set = (field: keyof NewTicket, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // One request at a time. Set at once, not at the next render: a second
  // click can land before the button is drawn as waiting.
  const creating = useRef(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (creating.current) return;

    const found = validateNewTicket(values, kinds);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;

    creating.current = true;
    create.mutate(values, {
      onSettled: () => {
        creating.current = false;
      },
      onSuccess: (ticket) => {
        toast.success(ticket.duplicate ? `Ce ticket existe déjà : #${ticket.number}.` : `Ticket #${ticket.number} créé.`);
        onCreated(ticket.id);
      },
      onError: (error) => {
        const described = describeSupportFailure(error);
        const { subject: subjectError, category, description } = described.fields;
        if (subjectError || category || description) setErrors({ subject: subjectError, category, description });
        setFailure(described.message);
      },
    });
  };

  const summary = Object.entries(errors).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <form onSubmit={submit} noValidate className="flex h-full min-h-0 flex-col bg-surface" aria-label="Nouveau ticket" data-new-ticket>
      <header className="flex items-center gap-2 border-b border-border px-2 py-2 md:px-4 md:py-3">
        <button type="button" onClick={onCancel} aria-label="Retour aux tickets" className={cn(buttonVariants({ variant: "quiet", iconOnly: true }), "md:hidden")}>
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h2 className="text-section-title text-foreground">Nouveau ticket</h2>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {failure &&
          (summary.length > 0 ? (
            <FormErrorSummary title={failure} errors={Object.fromEntries(summary)} fields={{ subject: { label: "Sujet" }, category: { label: desk.kindLabel }, description: { label: "Description" } }} />
          ) : (
            <Alert tone="danger" title={failure} />
          ))}

        <FormField label="Sujet" required error={errors.subject}>
          <Input ref={subject} value={values.subject} onChange={(event) => set("subject", event.target.value)} maxLength={SUBJECT_MAX} placeholder="Problème de paiement" autoComplete="off" />
        </FormField>

        {desk.formNotice && (
          <Alert tone="info" title="Avant d'écrire">
            {desk.formNotice}
          </Alert>
        )}
        <FormField label={desk.kindLabel} required error={errors.category}>
          <Select value={values.category} onChange={(event) => set("category", event.target.value)} placeholder={desk.id === "lanabaga" ? "Choisir un thème" : "Choisir une catégorie"}>
            {kinds.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Description" required error={errors.description} hint="Ce qui s'est passé, la commande concernée, ce que vous attendez.">
          <Textarea value={values.description} onChange={(event) => set("description", event.target.value)} rows={6} maxLength={DESCRIPTION_MAX} />
        </FormField>
        <p className="-mt-2 text-right text-meta text-foreground-subtle tabular-nums" aria-live="polite">
          {values.description.length} / {DESCRIPTION_MAX}
        </p>

        <p className="text-meta text-foreground-muted">Vous pourrez joindre des fichiers dans vos réponses, une fois le ticket créé.</p>
      </div>

      <footer className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex-row md:justify-end">
        <Button onClick={onCancel} className="hidden md:inline-flex">
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending}>
          Créer le ticket
        </Button>
      </footer>
    </form>
  );
}

export function SupportLoading() {
  return (
    <div className="sugu-ui space-y-3" aria-busy="true" aria-label="Chargement du support">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
