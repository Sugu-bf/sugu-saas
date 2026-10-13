"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, fetchClient, fetchClientSummary, fetchClients, type ClientQuery } from "./api";
import type { NewClient } from "./contract";

export const clientKeys = {
  all: ["clients"] as const,
  list: (query: ClientQuery) => ["clients", "list", query] as const,
  summary: () => ["clients", "summary"] as const,
  sheet: (id: string) => ["clients", "sheet", id] as const,
};

// Orders come in while the seller looks: a list is asked again when the page
// is opened again, and kept on screen while its next page loads.
export const useClients = (query: ClientQuery) => useQuery({ queryKey: clientKeys.list(query), queryFn: () => fetchClients(query), placeholderData: keepPreviousData, staleTime: 30_000 });

export const useClientSummary = () => useQuery({ queryKey: clientKeys.summary(), queryFn: fetchClientSummary, staleTime: 30_000 });

export const useClient = (id: string) => useQuery({ queryKey: clientKeys.sheet(id), queryFn: () => fetchClient(id), retry: false, staleTime: 30_000 });

/** A new customer changes the list and every counter. */
export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: NewClient) => createClient(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
}
