"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchExpedition,
  fetchExpeditions,
  fetchFilters,
  fetchMovements,
  fetchReception,
  fetchReceptions,
  fetchStock,
  fetchSummary,
  type ExpeditionQuery,
  type MovementQuery,
  type ReceptionQuery,
  type StockQuery,
} from "./api";

export const suguBoxKeys = {
  all: ["sugubox"] as const,
  summary: () => ["sugubox", "summary"] as const,
  filters: () => ["sugubox", "filters"] as const,
  stock: (query: StockQuery) => ["sugubox", "stock", query] as const,
  receptions: (query: ReceptionQuery) => ["sugubox", "receptions", query] as const,
  reception: (id: string) => ["sugubox", "reception", id] as const,
  expeditions: (query: ExpeditionQuery) => ["sugubox", "expeditions", query] as const,
  expedition: (id: string) => ["sugubox", "expedition", id] as const,
  movements: (query: MovementQuery) => ["sugubox", "movements", query] as const,
};

// The warehouse works while the seller watches: a list is asked again when
// the page is opened again, and kept on screen while its next page loads.
const list = { placeholderData: keepPreviousData, staleTime: 30_000 } as const;

export const useSummary = () => useQuery({ queryKey: suguBoxKeys.summary(), queryFn: fetchSummary, staleTime: 30_000 });
export const useBoardFilters = () => useQuery({ queryKey: suguBoxKeys.filters(), queryFn: fetchFilters, staleTime: 5 * 60_000 });
export const useStock = (query: StockQuery) => useQuery({ queryKey: suguBoxKeys.stock(query), queryFn: () => fetchStock(query), ...list });
export const useReceptions = (query: ReceptionQuery) => useQuery({ queryKey: suguBoxKeys.receptions(query), queryFn: () => fetchReceptions(query), ...list });
export const useReception = (id: string) => useQuery({ queryKey: suguBoxKeys.reception(id), queryFn: () => fetchReception(id), retry: false });
export const useExpeditions = (query: ExpeditionQuery) => useQuery({ queryKey: suguBoxKeys.expeditions(query), queryFn: () => fetchExpeditions(query), ...list });
export const useExpedition = (id: string) => useQuery({ queryKey: suguBoxKeys.expedition(id), queryFn: () => fetchExpedition(id), retry: false });
export const useMovements = (query: MovementQuery) => useQuery({ queryKey: suguBoxKeys.movements(query), queryFn: () => fetchMovements(query), ...list });

// ── The filters of a list live in its address ───────────────

const isDay = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Search, filters and page of a list, kept in the address: a filtered list
 * can be reloaded, sent, and found again with the back button. The search
 * is sent to the server a moment after the last key.
 */
export function useListAddress(pageSizes: readonly number[]) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const search = params.get("q") ?? "";
  const [typed, setTyped] = useState(search);

  const update = (changes: Record<string, string | null>) => {
    // Read from the address itself: a change asked while another is on its way starts from it.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any change but a change of page goes back to the first one.
    if (!("page" in changes)) next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (typed.trim() === search) return;
    const timer = window.setTimeout(() => update({ q: typed.trim() || null }), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` reads the current address each time it runs.
  }, [typed, search]);

  const from = isDay(params.get("du")) ? params.get("du")! : "";
  const to = isDay(params.get("au")) ? params.get("au")! : "";

  return {
    get: (key: string) => params.get(key) ?? "",
    search,
    typed,
    setTyped,
    submitSearch: (value: string) => update({ q: value.trim() || null }),
    from,
    to,
    /** A range whose end is before its start is not asked of the server: it would refuse it. */
    rangeError: from && to && to < from ? "La date de fin est avant la date de début." : null,
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: pageSizes.find((size) => size === Number(params.get("lignes"))) ?? pageSizes[0],
    update,
    setPage: (page: number) => update({ page: page > 1 ? String(page) : null }),
    setPageSize: (size: number) => update({ lignes: size === pageSizes[0] ? null : String(size) }),
    reset: (keys: string[]) => {
      setTyped("");
      update(Object.fromEntries(["q", "du", "au", ...keys].map((key) => [key, null])));
    },
  };
}
