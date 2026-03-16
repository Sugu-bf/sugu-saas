"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { Conversation, Message } from "@/lib/messaging/types";
import {
  useSellerMessages,
  useSendSellerMessage,
  useMarkSellerAsRead,
  useCloseConversation,
  useBlockConversation,
} from "../hooks";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "../../services/_shared";
import {
  ArrowLeft,
  MoreVertical,
  X as XIcon,
  Ban,
  Loader2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { toast } from "sonner";

import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { TypingIndicator } from "./TypingIndicator";
import { Composer } from "./Composer";
import { ShareProductDialog } from "./ShareProductDialog";
import { ChatSkeleton } from "./ChatSkeleton";

interface ChatRoomProps {
  conversation: Conversation;
  onBack?: () => void;
  typingUsers?: Record<string, { userName: string; participantType: string }>;
  /** Stable callback to notify typing — provided by parent's useTypingIndicator */
  onTyping: () => void;
}

export function ChatRoom({
  conversation,
  onBack,
  typingUsers = {},
  onTyping,
}: ChatRoomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSellerMessages(conversation.id);
  const sendMessage = useSendSellerMessage();
  const markRead = useMarkSellerAsRead();
  const closeConv = useCloseConversation();
  const blockConv = useBlockConversation();

  // Flatten pages into messages (reversed for chronological order)
  const messages = useMemo(() => {
    if (!data?.pages) return [];
    const all: Message[] = [];
    // Pages come newest first, reverse to get chronological
    for (let i = data.pages.length - 1; i >= 0; i--) {
      all.push(...data.pages[i].messages);
    }
    return all;
  }, [data]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark as read when we view messages (C1 fix: ref guard prevents infinite loop)
  const lastReadIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.is_own && lastMsg.id !== lastReadIdRef.current) {
        lastReadIdRef.current = lastMsg.id;
        markRead.mutate({
          convId: conversation.id,
          lastReadMessageId: lastMsg.id,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, messages.length]);

  // Load more on scroll to top
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = useCallback(
    (body: string, attachments?: File[]) => {
      sendMessage.mutate(
        { convId: conversation.id, body, attachments },
        {
          onError: () => toast.error("Erreur d'envoi"),
        },
      );
    },
    [conversation.id, sendMessage],
  );

  const handleClose = useCallback(() => {
    closeConv.mutate(conversation.id, {
      onSuccess: () => {
        toast.success("Conversation fermée");
        setCloseDialogOpen(false);
      },
      onError: () => toast.error("Erreur"),
    });
  }, [conversation.id, closeConv]);

  const handleBlock = useCallback(() => {
    blockConv.mutate(conversation.id, {
      onSuccess: () => {
        toast.success("Client bloqué");
        setBlockDialogOpen(false);
      },
      onError: () => toast.error("Erreur"),
    });
  }, [conversation.id, blockConv]);

  const customerName = conversation.customer?.name ?? "Client";
  const avatarCls = avatarColor(customerName);
  const ini = initials(customerName);

  // Find typing users for the current conversation (exclude ourselves)
  const activeTypers = useMemo(
    () => Object.values(typingUsers).filter((t) => t.participantType === "customer"),
    [typingUsers],
  );

  // Group messages by date for separator insertion (H1 fix: memoized)
  const messagesWithDates = useMemo(
    () => _insertDateSeparators(messages),
    [messages],
  );

  if (isLoading) return <ChatSkeleton />;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200/60 px-4 py-3 dark:border-gray-800/60">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="relative">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
              avatarCls,
            )}
          >
            {ini}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {customerName}
          </p>
          <p className="text-xs text-green-500">● En ligne</p>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[160px] rounded-xl border border-border bg-white p-1.5 shadow-lg dark:bg-gray-900"
              sideOffset={5}
              align="end"
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                onSelect={() => setCloseDialogOpen(true)}
              >
                <XIcon className="h-4 w-4" />
                Fermer la conversation
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                onSelect={() => setBlockDialogOpen(true)}
              >
                <Ban className="h-4 w-4" />
                Bloquer le client
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {messagesWithDates.map((item) => {
          if (item.type === "date") {
            return <DateSeparator key={`date-${item.date}`} date={item.date} />;
          }
          return (
            <MessageBubble
              key={item.message.id}
              message={item.message}
              isLastRead={false}
            />
          );
        })}

        {activeTypers.length > 0 && (
          <TypingIndicator userName={activeTypers[0].userName} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {conversation.status === "open" ? (
        <Composer
          onSend={handleSend}
          onTyping={onTyping}
          onShareProduct={() => setShareDialogOpen(true)}
          disabled={sendMessage.isPending}
        />
      ) : (
        <div className="border-t border-gray-200/60 p-4 text-center text-sm text-muted-foreground dark:border-gray-800/60">
          Cette conversation est {conversation.status === "closed" ? "fermée" : conversation.status === "blocked" ? "bloquée" : "archivée"}.
        </div>
      )}

      {/* Share product dialog */}
      <ShareProductDialog
        conversationId={conversation.id}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      {/* Close confirmation */}
      <_ConfirmDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        title="Fermer la conversation ?"
        description="Le client ne pourra plus envoyer de messages dans cette conversation."
        confirmLabel="Fermer"
        onConfirm={handleClose}
        isPending={closeConv.isPending}
      />

      {/* Block confirmation */}
      <_ConfirmDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        title="Bloquer ce client ?"
        description="Le client ne pourra plus vous contacter. Cette action est réversible depuis les paramètres."
        confirmLabel="Bloquer"
        onConfirm={handleBlock}
        isPending={blockConv.isPending}
        destructive
      />
    </div>
  );
}

// ── Confirmation Dialog Component ──

function _ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  destructive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending: boolean;
  destructive?: boolean;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-6 shadow-2xl dark:bg-gray-900">
          <AlertDialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              Annuler
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              disabled={isPending}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50",
                destructive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-r from-sugu-400 to-sugu-500 hover:shadow-md",
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                confirmLabel
              )}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

// ── Helpers ────────────────────────────────────────────────

type DateItem = { type: "date"; date: string };
type MessageItem = { type: "message"; message: Message };

function _insertDateSeparators(
  messages: Message[],
): (DateItem | MessageItem)[] {
  const result: (DateItem | MessageItem)[] = [];
  let lastDate = "";

  for (const msg of messages) {
    const day = msg.created_at.split("T")[0];
    if (day !== lastDate) {
      result.push({ type: "date", date: msg.created_at });
      lastDate = day;
    }
    result.push({ type: "message", message: msg });
  }

  return result;
}
