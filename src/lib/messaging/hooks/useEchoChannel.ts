"use client";

import { useEffect, useRef } from "react";
import { getEcho } from "@/lib/echo";

/**
 * Subscribe to a private Echo channel and bind event listeners.
 *
 * @param channelName - The channel name (e.g. "messaging.user.{userId}").
 *                      Pass null/undefined to skip subscription (lazy init).
 * @param events      - Map of event names → callbacks.
 *                      Event names should match `broadcastAs()` (e.g. "message.created").
 */
export function useEchoChannel(
  channelName: string | null | undefined,
  events: Record<string, (payload: unknown) => void>,
): void {
  // Stabilize events ref to avoid re-subscribing on every render
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });

  useEffect(() => {
    if (!channelName) return;

    // Security: validate channel name format to prevent injection
    if (!/^[\w.-]+$/.test(channelName)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[useEchoChannel] Rejected invalid channel name: ${channelName}`);
      }
      return;
    }

    let echo: ReturnType<typeof getEcho>;
    try {
      echo = getEcho();
    } catch {
      return; // SSR or Echo not available
    }

    const channel = echo.private(channelName);

    // Bind all events — Echo expects a `.` prefix for custom broadcastAs names
    const eventNames = Object.keys(eventsRef.current);
    for (const name of eventNames) {
      channel.listen(`.${name}`, (payload: unknown) => {
        eventsRef.current[name]?.(payload);
      });
    }

    return () => {
      for (const name of eventNames) {
        channel.stopListening(`.${name}`);
      }
      echo.leave(`private-${channelName}`);
    };
  }, [channelName]);
}
