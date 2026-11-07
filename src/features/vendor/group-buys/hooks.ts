"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchGroupBuySummary, fetchGroupBuyingSettings, fetchGroupBuys, saveStoreGroupBuying } from "./api";
import type { GroupBuyList, GroupBuyingSettings } from "./contract";

export const groupBuyKeys = {
  all: [...queryKeys.vendor.all, "group-buys"] as const,
  settings: () => [...groupBuyKeys.all, "settings"] as const,
  summary: () => [...groupBuyKeys.all, "summary"] as const,
  list: (list: GroupBuyList) => [...groupBuyKeys.all, "list", list] as const,
};

/** The option of each store the seller owns, and how many of its products can be grouped. */
export const useGroupBuyingSettings = () => useQuery({ queryKey: groupBuyKeys.settings(), queryFn: fetchGroupBuyingSettings, staleTime: 30_000 });

/** The last 30 days, counted by the server. */
export const useGroupBuySummary = () => useQuery({ queryKey: groupBuyKeys.summary(), queryFn: fetchGroupBuySummary, staleTime: 60_000 });

/**
 * One list of groups, 20 by 20, the next page on demand. The running groups
 * move while the page is open (people join): they are read again each minute.
 */
export function useGroupBuys(list: GroupBuyList) {
  return useInfiniteQuery({
    queryKey: groupBuyKeys.list(list),
    queryFn: ({ pageParam }) => fetchGroupBuys(list, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, lastPage) => (last.hasMore ? lastPage + 1 : undefined),
    staleTime: 30_000,
    refetchInterval: list === "running" ? 60_000 : false,
  });
}

/**
 * Changes the option of one store. Nothing is shown as done before the
 * server said so: its answer goes in the cache, then everything the option
 * touches (counts, lists) is read again.
 */
export function useSaveStoreGroupBuying() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveStoreGroupBuying,
    onSuccess: ({ store }) => {
      client.setQueryData<GroupBuyingSettings>(groupBuyKeys.settings(), (current) =>
        current ? { stores: current.stores.map((candidate) => (candidate.id === store.id ? { ...candidate, enabled: store.enabled, sharedMoq: store.sharedMoq } : candidate)) } : current,
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: groupBuyKeys.all }),
  });
}
