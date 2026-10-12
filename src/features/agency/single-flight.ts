import { useRef } from "react";

// ============================================================
// One request for one click.
//
// A button is drawn disabled once its request has started — on
// the next render. A second click that lands before that render
// (a double click, a key held down) used to send the request
// again: two deliveries created for one form.
//
// Two guards, at the two ends:
//   - `once`, around what a mutation sends: the same change asked
//     again while it is in flight joins the request already sent;
//   - `useOneAtATime`, around a handler: its second call joins the
//     first, so that what follows the request (a message, a
//     navigation) happens once too.
// ============================================================

const inFlight = new Map<string, Promise<unknown>>();

/** A file has no JSON of its own: it is told apart by what names it. */
const describe = (_key: string, value: unknown) => (typeof File !== "undefined" && value instanceof File ? ["file", value.name, value.size, value.lastModified] : value);

/**
 * Sends a change, unless the very same one (`what`: its kind and its
 * content) is already in flight: its answer is then awaited instead.
 */
export function once<Result>(what: unknown, send: () => Promise<Result>): Promise<Result> {
  const key = JSON.stringify(what, describe);
  const running = inFlight.get(key) as Promise<Result> | undefined;
  if (running) return running;

  const request = send().finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/**
 * The handler of a form or of a dialog, run one call at a time: a call made
 * while the previous one is still running is given the same promise.
 */
export function useOneAtATime<Args extends unknown[], Result>(handler: (...args: Args) => Promise<Result>): (...args: Args) => Promise<Result> {
  const running = useRef<Promise<Result> | null>(null);
  return (...args: Args) => {
    running.current ??= handler(...args).finally(() => {
      running.current = null;
    });
    return running.current;
  };
}
