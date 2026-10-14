"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchRecentInvoices, fetchStoreCategories, fetchVendorSessions, fetchVendorSettings } from "./api";

export const vendorSettingsKeys = {
  settings: () => queryKeys.vendor.settings(),
  categories: () => [...queryKeys.vendor.settings(), "categories"] as const,
  sessions: () => [...queryKeys.vendor.settings(), "sessions"] as const,
  invoices: () => [...queryKeys.vendor.settings(), "invoices"] as const,
};

export function useVendorSettingsModel() {
  return useQuery({ queryKey: vendorSettingsKeys.settings(), queryFn: fetchVendorSettings, staleTime: 30_000 });
}

export function useStoreCategoryOptions() {
  return useQuery({ queryKey: vendorSettingsKeys.categories(), queryFn: fetchStoreCategories, staleTime: 60 * 60_000 });
}

export function useVendorSessions() {
  return useQuery({ queryKey: vendorSettingsKeys.sessions(), queryFn: fetchVendorSessions, staleTime: 15_000 });
}

export function useRecentInvoices() {
  return useQuery({ queryKey: vendorSettingsKeys.invoices(), queryFn: () => fetchRecentInvoices(5), staleTime: 60_000 });
}

/** Read the settings again after a change the server accepted. */
export function useRefreshVendorSettings() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: vendorSettingsKeys.settings(), exact: true });
}
