"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getEcho } from "@/lib/echo";
import { parseCreatedEvent, parseReadEvent, parseTypingEvent, type CreatedEvent, type ReadEvent, type TypingEvent } from "./contract";

// ============================================================
// Real time — one subscription per private channel, shared by every
// screen that listens to it (the list, the open thread, the menu
// counter), and the true state of the socket.
//
// The socket opens with the public key only. Joining a private
// channel is authorised by `/api/broadcasting/auth`, which adds the
// session server-side: no credential is ever readable from here.
//
// An event only says "something happened": the message itself is
// always read back from the API, as the signed-in reader.
// ============================================================

export type SocketState = "connecting" | "connected" | "offline";

export interface ChannelHandlers {
  onCreated?: (event: CreatedEvent) => void;
  onRead?: (event: ReadEvent) => void;
  onTyping?: (event: TypingEvent) => void;
  /** The socket is back after having been away: what was missed must be read again. */
  onResume?: () => void;
}

interface Subscription {
  listeners: Set<{ current: ChannelHandlers }>;
  leave: () => void;
}

const CHANNEL_NAME = /^[\w.-]+$/;
const subscriptions = new Map<string, Subscription>();

let socketState: SocketState = "connecting";
let wasConnected = false;
/** The socket being watched: a new one is opened after a sign-out. */
let watched: unknown = null;
const stateListeners = new Set<() => void>();

function setSocketState(next: SocketState) {
  if (next === socketState) return;
  socketState = next;
  stateListeners.forEach((listener) => listener());
}

/** The socket has answered once, or has been declared out of reach once. */
let settledOnce = false;

/**
 * Pusher's states, reduced to what the user is told. While it retries,
 * Pusher goes back and forth between "connecting" and "unavailable": once
 * the socket has been lost, the screen says so until it is really back,
 * instead of blinking. Only the very first connection is waited for in
 * silence.
 */
function reduce(state: string): SocketState {
  if (state === "connected") {
    settledOnce = true;
    return "connected";
  }
  if (state === "connecting" || state === "initialized") return settledOnce ? "offline" : "connecting";
  settledOnce = true;
  return "offline";
}

interface PusherConnection {
  state: string;
  bind: (event: string, callback: (change: { previous: string; current: string }) => void) => void;
}

function watchSocket() {
  if (typeof window === "undefined") return;
  try {
    const echo = getEcho();
    if (watched === echo) return;
    settledOnce = false;
    const connection = (echo.connector as unknown as { pusher?: { connection?: PusherConnection } }).pusher?.connection;
    if (!connection) return;
    watched = echo;
    setSocketState(reduce(connection.state));
    wasConnected = connection.state === "connected";

    connection.bind("state_change", ({ current }) => {
      const next = reduce(current);
      setSocketState(next);
      if (next !== "connected") return;
      // Connected again: events sent meanwhile are lost for good.
      if (wasConnected) {
        subscriptions.forEach((subscription) => subscription.listeners.forEach((handlers) => handlers.current.onResume?.()));
      }
      wasConnected = true;
    });
  } catch {
    setSocketState("offline");
  }
}

function subscribe(channelName: string, handlers: { current: ChannelHandlers }): () => void {
  let subscription = subscriptions.get(channelName);

  if (!subscription) {
    const listeners = new Set<{ current: ChannelHandlers }>();
    let leave = () => {};

    try {
      const echo = getEcho();
      watchSocket();
      const channel = echo.private(channelName);
      // Echo expects a leading dot for names given by `broadcastAs()`.
      channel.listen(".message.created", (payload: unknown) => {
        const event = parseCreatedEvent(payload);
        if (event) listeners.forEach((listener) => listener.current.onCreated?.(event));
      });
      channel.listen(".message.read", (payload: unknown) => {
        const event = parseReadEvent(payload);
        if (event) listeners.forEach((listener) => listener.current.onRead?.(event));
      });
      channel.listen(".user.typing", (payload: unknown) => {
        const event = parseTypingEvent(payload);
        if (event) listeners.forEach((listener) => listener.current.onTyping?.(event));
      });
      // The server refused the channel (session gone, wrong account): no event
      // will ever come. Said as "not connected", so the screen falls back to
      // asking the API at intervals.
      channel.error(() => setSocketState("offline"));
      leave = () => echo.leave(channelName);
    } catch {
      setSocketState("offline");
    }

    subscription = { listeners, leave };
    subscriptions.set(channelName, subscription);
  }

  subscription.listeners.add(handlers);

  return () => {
    const current = subscriptions.get(channelName);
    if (!current) return;
    current.listeners.delete(handlers);
    if (current.listeners.size === 0) {
      current.leave();
      subscriptions.delete(channelName);
    }
  };
}

/** Listen to a private messaging channel; `null` listens to nothing. */
export function useMessagingChannel(channelName: string | null, handlers: ChannelHandlers): void {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!channelName || !CHANNEL_NAME.test(channelName)) return;
    return subscribe(channelName, latest);
  }, [channelName]);
}

/**
 * State of the socket. `connecting` until it has answered; a screen that
 * never subscribed to anything stays `connecting` and shows nothing.
 */
export function useSocketState(): SocketState {
  return useSyncExternalStore(
    (listener) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    () => socketState,
    () => "connecting" as SocketState,
  );
}

/** For tests: forget every subscription and the state of the socket. */
export function resetRealtimeForTests() {
  subscriptions.clear();
  stateListeners.clear();
  socketState = "connecting";
  wasConnected = false;
  watched = null;
  settledOnce = false;
}
