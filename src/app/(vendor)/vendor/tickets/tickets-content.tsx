"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Paperclip,
  Send,
  X,
  Loader2,
} from "lucide-react";
import type { VendorTicket, TicketMessage } from "@/features/vendor/schema";
import {
  useVendorTickets,
  useTicketMessages,
  useSendTicketMessage,
  useCreateTicket,
  useCloseTicket,
} from "@/features/vendor/hooks";

type TabFilter = "all" | "open" | "resolved";

const STATUS_STYLES: Record<string, string> = {
  Ouvert: "bg-sugu-50 text-sugu-600 dark:bg-sugu-950/30",
  "En attente": "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  "Résolu": "bg-green-50 text-green-600 dark:bg-green-950/30",
  "Fermé": "bg-green-50 text-green-600 dark:bg-green-950/30",
  "Escaladé": "bg-red-50 text-red-600 dark:bg-red-950/30",
};

const PRIORITY_STYLES: Record<string, string> = {
  Urgent: "bg-red-50 text-red-600 dark:bg-red-950/30",
  Normal: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  Bas: "bg-blue-50 text-blue-500 dark:bg-blue-950/30",
};

// ────────────────────────────────────────────────────────────
// Skeleton loaders
// ────────────────────────────────────────────────────────────

function TicketListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-16 rounded bg-gray-200 animate-pulse dark:bg-gray-700" />
          </div>
          <div className="h-3.5 w-3/4 rounded bg-gray-200 animate-pulse dark:bg-gray-700 mb-1" />
          <div className="h-2.5 w-full rounded bg-gray-100 animate-pulse dark:bg-gray-800 mb-2" />
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse dark:bg-gray-800" />
            <div className="h-4 w-14 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="glass-card rounded-2xl flex flex-col h-[600px] lg:h-auto">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse dark:bg-gray-700" />
        <div className="h-2.5 w-1/4 rounded bg-gray-100 animate-pulse dark:bg-gray-800 mt-1" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse dark:bg-gray-700 mb-1" />
              <div className="h-16 w-4/5 rounded-xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Ticket card (left panel)
// ────────────────────────────────────────────────────────────

function TicketCard({
  ticket,
  isActive,
  onClick,
}: {
  ticket: VendorTicket;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-all",
        isActive
          ? "border-sugu-300 bg-sugu-50/40 ring-1 ring-sugu-200 dark:border-sugu-800 dark:bg-sugu-950/10 dark:ring-sugu-900/40"
          : "border-gray-100 bg-white/60 hover:bg-white dark:border-gray-800 dark:bg-gray-900/40 dark:hover:bg-gray-900/60",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-gray-400">
          {ticket.reference}
        </span>
        {ticket.priority === "urgent" && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-bold", PRIORITY_STYLES[ticket.priorityLabel])}>
            {ticket.priorityLabel}
          </span>
        )}
        {ticket.priority === "normal" && ticket.status === "open" && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-bold", PRIORITY_STYLES[ticket.priorityLabel])}>
            {ticket.priorityLabel}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
        {ticket.subject}
      </p>
      {ticket.preview && (
        <p className="mt-0.5 text-[10px] text-gray-400 line-clamp-2">
          {ticket.preview}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-gray-400">
          {ticket.timeAgo} · {ticket.messageCount} msg
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", STATUS_STYLES[ticket.statusLabel])}>
          {ticket.statusLabel}
        </span>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Chat panel (right) — loads messages via hook
// ────────────────────────────────────────────────────────────

function ChatPanel({ ticket }: { ticket: VendorTicket }) {
  const [reply, setReply] = useState("");
  const { data: messages, isLoading: messagesLoading } = useTicketMessages(ticket.id);
  const sendMessage = useSendTicketMessage();
  const closeTicket = useCloseTicket();

  const isClosed = ticket.status === "resolved";

  const handleSend = () => {
    const trimmed = reply.trim();
    if (!trimmed || sendMessage.isPending) return;

    sendMessage.mutate(
      { ticketId: ticket.id, body: trimmed },
      { onSuccess: () => setReply("") },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    if (closeTicket.isPending) return;
    closeTicket.mutate(ticket.id);
  };

  // Render messages from hook data, or empty array
  const displayMessages: TicketMessage[] = messages ?? ticket.messages ?? [];

  return (
    <div className="glass-card rounded-2xl flex flex-col h-[600px] lg:h-auto">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            {ticket.reference} — {ticket.subject}
          </h2>
          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", STATUS_STYLES[ticket.statusLabel])}>
            {ticket.statusLabel}
          </span>
          {ticket.priority === "urgent" && (
            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", PRIORITY_STYLES[ticket.priorityLabel])}>
              {ticket.priorityLabel}
            </span>
          )}
          {/* Close ticket button */}
          {!isClosed && (
            <button
              onClick={handleClose}
              disabled={closeTicket.isPending}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {closeTicket.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              Fermer le ticket
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Assigné: {ticket.assignee}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messagesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse dark:bg-gray-700 mb-1" />
                <div className="h-16 w-4/5 rounded-xl bg-gray-100 animate-pulse dark:bg-gray-800" />
              </div>
            </div>
          ))
        ) : displayMessages.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            Aucun message pour le moment.
          </p>
        ) : (
          displayMessages.map((msg) => {
            const isVendor = msg.senderRole === "vendor";
            return (
              <div key={msg.id} className={cn("flex gap-2.5", isVendor ? "" : "")}>
                {/* Avatar */}
                <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold", msg.senderAvatarColor)}>
                  {msg.senderInitials}
                </div>

                {/* Bubble */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {msg.senderName}
                    </span>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                      isVendor ? "bg-sugu-50 text-sugu-600 dark:bg-sugu-950/30" : "bg-green-50 text-green-600 dark:bg-green-950/30",
                    )}>
                      {isVendor ? "Vendeur" : "Support SUGU"}
                    </span>
                    <span className="text-[10px] text-gray-400">{msg.time}</span>
                  </div>
                  <div className={cn(
                    "rounded-xl px-3 py-2.5 text-xs leading-relaxed",
                    isVendor
                      ? "bg-white/60 border border-gray-100 text-gray-700 dark:bg-gray-900/40 dark:border-gray-800 dark:text-gray-300"
                      : "bg-green-50/60 border border-green-100 text-gray-700 dark:bg-green-950/10 dark:border-green-900/30 dark:text-gray-300",
                  )}>
                    {msg.text}
                  </div>
                  {msg.attachment && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500 dark:bg-gray-800">
                      <Paperclip className="h-3 w-3" />
                      {msg.attachment}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply input */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2 dark:border-gray-800">
        {isClosed ? (
          <p className="flex-1 py-2 text-xs text-gray-400 text-center">
            Ce ticket est fermé. Vous ne pouvez plus envoyer de messages.
          </p>
        ) : (
          <>
            <input
              type="text"
              placeholder="Écrire votre réponse..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sendMessage.isPending}
              className="form-input flex-1 py-2 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sendMessage.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sugu-600 transition-colors disabled:opacity-50"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  Envoyer
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Create Ticket Modal
// ────────────────────────────────────────────────────────────

function CreateTicketModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const createTicket = useCreateTicket();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || createTicket.isPending) return;

    createTicket.mutate(
      { subject: subject.trim(), description: description.trim(), category: category as "order" | "payment" | "delivery" | "refund" | "account" | "vendor" | "product" | "other" },
      {
        onSuccess: () => {
          setSubject("");
          setDescription("");
          setCategory("other");
          onClose();
        },
      },
    );
  };

  const CATEGORY_OPTIONS = [
    { value: "order", label: "Commande" },
    { value: "payment", label: "Paiement" },
    { value: "delivery", label: "Livraison" },
    { value: "refund", label: "Remboursement" },
    { value: "account", label: "Compte" },
    { value: "product", label: "Produit" },
    { value: "other", label: "Autre" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Nouveau ticket de support
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input py-2 text-xs w-full"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
              Sujet
            </label>
            <input
              type="text"
              placeholder="Ex: Paiement non reçu pour la commande #123"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-input py-2 text-xs w-full"
              maxLength={200}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">
              Description
            </label>
            <textarea
              placeholder="Décrivez votre problème en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input py-2 text-xs w-full min-h-[100px] resize-none"
              required
            />
          </div>
          {createTicket.isError && (
            <p className="text-[10px] text-red-500">
              Erreur : {(createTicket.error as Error)?.message ?? "Impossible de créer le ticket."}
            </p>
          )}
          <button
            type="submit"
            disabled={!subject.trim() || !description.trim() || createTicket.isPending}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-sugu-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sugu-600 transition-all disabled:opacity-50"
          >
            {createTicket.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Créer le ticket
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function TicketsContent() {
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch tickets from API
  const { data, isLoading, isError } = useVendorTickets({
    status: tab === "all" ? undefined : tab,
    search: search || undefined,
  });

  const tickets = data?.tickets ?? [];
  const counts = data?.counts ?? { all: 0, open: 0, resolved: 0 };

  // Client-side filter (in addition to server-side)
  const filtered = tickets.filter((t) => {
    if (tab === "open") return t.status === "open" || t.status === "pending";
    if (tab === "resolved") return t.status === "resolved";
    return true;
  });

  // Set default active ticket when data loads
  const effectiveActiveId = activeTicketId || filtered[0]?.id || "";
  const activeTicket = tickets.find((t) => t.id === effectiveActiveId) ?? filtered[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Support
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sugu-600 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Nouveau ticket
        </button>
      </header>

      {/* Body: list + detail */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left — Ticket list */}
        <div className="glass-card rounded-2xl p-4 lg:w-80 lg:flex-shrink-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input py-2 pl-8 text-xs"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {([
              ["all", `Tous (${counts.all})`],
              ["open", `Ouverts (${counts.open})`],
              ["resolved", `Résolus (${counts.resolved})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all",
                  tab === key
                    ? "bg-sugu-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {isLoading ? (
              <TicketListSkeleton />
            ) : isError ? (
              <p className="py-8 text-center text-xs text-red-400">
                Erreur de chargement des tickets.
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                Aucun ticket trouvé.
              </p>
            ) : (
              filtered.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isActive={ticket.id === effectiveActiveId}
                  onClick={() => setActiveTicketId(ticket.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — Chat */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <ChatSkeleton />
          ) : activeTicket ? (
            <ChatPanel ticket={activeTicket} />
          ) : (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-sm text-gray-400">Sélectionnez un ticket</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
