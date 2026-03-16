"use client";

import { useEchoChannel } from "./useEchoChannel";
import type {
  MessageCreatedPayload,
  MessageReadPayload,
  UserTypingPayload,
} from "../types";

interface UseMessagingEventsOptions {
  /** Channel name to listen on (e.g. "messaging.user.{userId}" or "messaging.store.{storeId}") */
  channelName: string | null | undefined;

  /** Called when a new message arrives in any conversation */
  onMessageCreated?: (payload: MessageCreatedPayload) => void;

  /** Called when someone reads messages (read receipt) */
  onMessageRead?: (payload: MessageReadPayload) => void;

  /** Called when someone is typing */
  onUserTyping?: (payload: UserTypingPayload) => void;
}

/**
 * High-level hook that listens to messaging broadcast events on a given channel.
 * Wraps `useEchoChannel` with the 3 standard messaging events.
 *
 * No useMemo needed — `useEchoChannel` stabilizes callbacks internally via ref.
 */
export function useMessagingEvents(options: UseMessagingEventsOptions): void {
  const { channelName, onMessageCreated, onMessageRead, onUserTyping } = options;

  const events: Record<string, (payload: unknown) => void> = {};
  if (onMessageCreated) events["message.created"] = onMessageCreated as (payload: unknown) => void;
  if (onMessageRead) events["message.read"] = onMessageRead as (payload: unknown) => void;
  if (onUserTyping) events["user.typing"] = onUserTyping as (payload: unknown) => void;

  useEchoChannel(channelName, events);
}
