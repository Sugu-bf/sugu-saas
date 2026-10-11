/**
 * Writes the state of a list (filters, sort, page) in the address bar,
 * replacing the current history entry.
 *
 * Through the native History API, which Next keeps in sync with
 * `useSearchParams`. A list page draws its data from the API, not from the
 * server render: going through the router fetched the page again on every
 * change, and two changes made in quick succession could leave the router
 * out of step and end in a full page reload, which closed whatever was open
 * (the filter sheet of a phone).
 */
export function replaceUrlQuery(pathname: string, query: string): void {
  window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
}
