/**
 * Minimal convention for "what is this data doing right now".
 *
 *   loading → nothing to show yet
 *   error   → the request failed: say so and offer a retry
 *   ready   → we have an answer; an EMPTY answer is only trustworthy here
 *
 * An empty list must never be rendered from `loading` or `error`: that is how
 * an outage ends up displayed as "nothing configured".
 */
export type LoadState = "loading" | "error" | "ready";

export function loadStateOf(query: { isError: boolean; isSuccess: boolean }): LoadState {
  if (query.isError) return "error";
  return query.isSuccess ? "ready" : "loading";
}
