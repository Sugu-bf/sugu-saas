"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MoneyCents } from "@/design-system";
import { once } from "@/features/agency/single-flight";
import { useSession } from "@/features/auth/hooks";
import {
  createMethod,
  deleteMethod,
  fetchEntries,
  fetchMethods,
  fetchQuote,
  fetchSummary,
  fetchWithdrawals,
  lookupWithdrawal,
  requestWithdrawal,
  setDefaultMethod,
  updateMethod,
  type EntryQuery,
  type FinanceProfile,
  type FinanceScope,
  type WithdrawalQuery,
  type WithdrawalRequest,
} from "./api";
import type { MethodDraft } from "./contract";

// ── Whose money ─────────────────────────────────────────────

/**
 * The scope the screens of a profile read: the store of the vendor, the
 * agency of the agency account. `null` while the session has not said which.
 * A courier needs neither: Laravel finds their profile from the account.
 */
export function useFinanceScope(profile: FinanceProfile): FinanceScope | null {
  const { data: user } = useSession();
  if (!user) return null;
  if (profile === "courier") return { profile, ownerId: null };
  const ownerId = profile === "vendor" ? user.store_id : user.delivery_partner_id;
  return ownerId ? { profile, ownerId } : null;
}

// ── Reads ───────────────────────────────────────────────────

const root = (scope: FinanceScope | null) => ["finance", scope?.profile ?? "none", scope?.ownerId ?? "self"] as const;

export const financeKeys = {
  all: root,
  summary: (scope: FinanceScope | null, month?: string) => [...root(scope), "summary", month ?? "current"] as const,
  entries: (scope: FinanceScope | null, query: EntryQuery) => [...root(scope), "entries", query] as const,
  withdrawals: (scope: FinanceScope | null, query: WithdrawalQuery) => [...root(scope), "withdrawals", query] as const,
  methods: (scope: FinanceScope | null) => [...root(scope), "methods"] as const,
  quote: (scope: FinanceScope | null, amount: number) => [...root(scope), "quote", amount] as const,
};

export function useSummary(scope: FinanceScope | null, month?: string) {
  return useQuery({
    queryKey: financeKeys.summary(scope, month),
    queryFn: () => fetchSummary(scope!, month),
    enabled: scope !== null,
    staleTime: 15_000,
    // Another month keeps the figures on screen while it loads.
    placeholderData: keepPreviousData,
  });
}

export function useEntries(scope: FinanceScope | null, query: EntryQuery) {
  return useQuery({ queryKey: financeKeys.entries(scope, query), queryFn: () => fetchEntries(scope!, query), enabled: scope !== null, staleTime: 15_000, placeholderData: keepPreviousData });
}

export function useWithdrawals(scope: FinanceScope | null, query: WithdrawalQuery) {
  return useQuery({ queryKey: financeKeys.withdrawals(scope, query), queryFn: () => fetchWithdrawals(scope!, query), enabled: scope !== null, staleTime: 15_000, placeholderData: keepPreviousData });
}

export function useMethods(scope: FinanceScope | null) {
  return useQuery({ queryKey: financeKeys.methods(scope), queryFn: () => fetchMethods(scope!), enabled: scope !== null, staleTime: 30_000 });
}

/**
 * What an amount costs and pays, asked of the server. `amount` is null while
 * nothing worth asking is typed. The figures of the previous amount are not
 * kept on screen: a net that is not the one of the amount shown is a lie.
 */
export function useQuote(scope: FinanceScope | null, amount: MoneyCents | null) {
  return useQuery({
    queryKey: financeKeys.quote(scope, amount ?? 0),
    queryFn: () => fetchQuote(scope!, amount!),
    enabled: scope !== null && amount !== null && amount > 0,
    staleTime: 10_000,
    retry: 1,
  });
}

// ── Mutations ───────────────────────────────────────────────

/**
 * Asks for a withdrawal. Whatever the answer — recorded, refused, or
 * unknown — every money screen is read again: a refusal often means the
 * balance or the requests moved meanwhile.
 */
export function useRequestWithdrawal(scope: FinanceScope | null) {
  const queryClient = useQueryClient();
  return useMutation({
    // The same request asked again while it is in flight joins the first.
    mutationFn: (request: WithdrawalRequest) => once(["withdrawal", scope, request], () => requestWithdrawal(scope!, request)),
    retry: false,
    onSettled: () => queryClient.invalidateQueries({ queryKey: financeKeys.all(scope) }),
  });
}

/** Asks again whether the withdrawal sent under a key exists, when its answer was lost. */
export function useLookupWithdrawal(scope: FinanceScope | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idempotencyKey: string) => lookupWithdrawal(scope!, idempotencyKey),
    retry: false,
    onSettled: () => queryClient.invalidateQueries({ queryKey: financeKeys.all(scope) }),
  });
}

export type MethodCommand =
  | { type: "create"; draft: MethodDraft }
  | { type: "update"; id: string; draft: MethodDraft }
  | { type: "set_default"; id: string }
  | { type: "delete"; id: string };

function run(scope: FinanceScope, command: MethodCommand): Promise<unknown> {
  switch (command.type) {
    case "create":
      return createMethod(scope, command.draft);
    case "update":
      return updateMethod(scope, command.id, command.draft);
    case "set_default":
      return setDefaultMethod(scope, command.id);
    case "delete":
      return deleteMethod(scope, command.id);
  }
}

/** What an owner does to their payout methods. The list is read again whatever the answer. */
export function useMethodCommand(scope: FinanceScope | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: MethodCommand) => once(["method", scope, command], () => run(scope!, command)),
    retry: false,
    onSettled: () => queryClient.invalidateQueries({ queryKey: financeKeys.methods(scope) }),
  });
}
