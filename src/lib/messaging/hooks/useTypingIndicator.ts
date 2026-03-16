"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserTypingPayload } from "../types";

export interface TypingUser {
  userName: string;
  participantType: string;
}

interface UseTypingIndicatorReturn {
  /** Call this on every keystroke in the composer */
  notifyTyping: () => void;

  /** Record of userId → typing info. Auto-dismisses after 3s without updates. */
  typingUsers: Record<string, TypingUser>;

  /**
   * Feed incoming typing payloads into this handler.
   * Typically called from `useMessagingEvents.onUserTyping`.
   */
  onTypingReceived: (payload: UserTypingPayload) => void;
}

/**
 * Hook that manages typing indicator state — both sending and receiving.
 *
 * - **Sending**: Throttles calls to `sendEndpoint` at max 1 per 2 seconds.
 * - **Receiving**: Auto-dismisses users from the typing map after 3 seconds of inactivity.
 *
 * Uses `Record<string, TypingUser>` instead of `Map` for better React
 * shallow-comparison and fewer allocations per event.
 *
 * @param conversationId - The current conversation ID (null = disabled).
 * @param sendEndpoint   - Async function to POST the typing event to the backend.
 */
export function useTypingIndicator(
  conversationId: string | null,
  sendEndpoint: (conversationId: string) => Promise<void>,
): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({});

  // ─── Sending (throttled) ──────────────────────────────────
  const lastSentRef = useRef<number>(0);
  const sendEndpointRef = useRef(sendEndpoint);
  sendEndpointRef.current = sendEndpoint;

  const notifyTyping = useCallback(() => {
    if (!conversationId) return;

    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // throttle: max 1 per 2s

    lastSentRef.current = now;
    sendEndpointRef.current(conversationId).catch(() => {
      // Silently ignore — typing is best-effort
    });
  }, [conversationId]);

  // ─── Receiving ────────────────────────────────────────────
  const dismissTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const onTypingReceived = useCallback((payload: UserTypingPayload) => {
    const { user_id, user_name, participant_type } = payload;

    // Upsert — spread is cheaper than new Map() for small objects
    setTypingUsers((prev) => ({
      ...prev,
      [user_id]: {
        userName: user_name,
        participantType: participant_type,
      },
    }));

    // Reset the auto-dismiss timer for this user
    const timers = dismissTimersRef.current;
    const existing = timers[user_id];
    if (existing) clearTimeout(existing);

    timers[user_id] = setTimeout(() => {
      setTypingUsers((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [user_id]: _, ...rest } = prev;
        return rest;
      });
      delete timers[user_id];
    }, 3000); // auto-dismiss after 3s
  }, []);

  // ─── Cleanup on unmount or conversation change ────────────
  useEffect(() => {
    return () => {
      // Clear all dismiss timers
      for (const timer of Object.values(dismissTimersRef.current)) {
        clearTimeout(timer);
      }
      dismissTimersRef.current = {};
      setTypingUsers({});
    };
  }, [conversationId]);

  return { notifyTyping, typingUsers, onTypingReceived };
}
