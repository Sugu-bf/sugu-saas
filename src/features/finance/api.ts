import type { MoneyCents } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import { api } from "@/lib/http/client";
import {
  methodPayload,
  parseEntryPage,
  parseMethod,
  parseMethods,
  parseQuote,
  parseSummary,
  parseWithdrawal,
  parseWithdrawalPage,
  type EntryKind,
  type EntryPage,
  type MethodDraft,
  type PayoutMethod,
  type WalletSummary,
  type Withdrawal,
  type WithdrawalPage,
  type WithdrawalQuote,
  type WithdrawalState,
} from "./contract";

// ============================================================
// Money of a professional account — HTTP calls. Every call goes
// through the BFF; Laravel authorises each one and resolves the
// owner itself: the store one owns, the agency one owns or
// manages, the courier profile of the account.
// ============================================================

export type FinanceProfile = "vendor" | "agency" | "courier";

/** Whose money: the profile, and the store or the agency it is addressed by. */
export interface FinanceScope {
  profile: FinanceProfile;
  /** Store of a vendor, agency of an agency account; none for a courier. */
  ownerId: string | null;
}

interface Routes {
  wallet: string;
  withdrawals: string;
  request: string;
  methods: string;
  method: (id: string) => string;
}

function routes(scope: FinanceScope): Routes {
  const id = encodeURIComponent(scope.ownerId ?? "");
  switch (scope.profile) {
    case "vendor":
      return {
        wallet: "sellers/wallet",
        withdrawals: "sellers/wallet/payouts",
        request: "sellers/wallet/request-payout",
        methods: `stores/${id}/payout-settings`,
        method: (method) => `stores/payout-settings/${encodeURIComponent(method)}`,
      };
    case "agency":
      return {
        wallet: `agencies/${id}/wallet`,
        withdrawals: `agencies/${id}/withdrawals`,
        request: `agencies/${id}/withdrawals`,
        methods: `agencies/${id}/payout-settings`,
        method: (method) => `agencies/${id}/payout-settings/${encodeURIComponent(method)}`,
      };
    case "courier":
      return {
        wallet: "courier/wallet",
        withdrawals: "courier/withdrawals",
        request: "courier/withdrawals",
        methods: "courier/payout-settings",
        method: (method) => `courier/payout-settings/${encodeURIComponent(method)}`,
      };
  }
}

// ── Reads ───────────────────────────────────────────────────

/** `month`: `2026-10`. The balance is today's whatever the month. */
export async function fetchSummary(scope: FinanceScope, month?: string): Promise<WalletSummary> {
  const response = await api.get<{ data: unknown }>(`${routes(scope).wallet}/summary`, { params: { month } });
  return parseSummary(response.data);
}

export interface EntryQuery {
  kind?: EntryKind;
  search?: string;
  /** Days, both included: `2026-10-12`. */
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export async function fetchEntries(scope: FinanceScope, query: EntryQuery): Promise<EntryPage> {
  const response = await api.get<unknown>(`${routes(scope).wallet}/entries`, {
    params: {
      kind: query.kind,
      search: query.search?.trim() || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      page: query.page,
      per_page: query.pageSize,
    },
  });
  return parseEntryPage(response);
}

export interface WithdrawalQuery {
  state?: WithdrawalState;
  page: number;
  pageSize: number;
}

export async function fetchWithdrawals(scope: FinanceScope, query: WithdrawalQuery): Promise<WithdrawalPage> {
  const response = await api.get<unknown>(routes(scope).withdrawals, { params: { state: query.state, page: query.page, per_page: query.pageSize } });
  return parseWithdrawalPage(response);
}

/** What a withdrawal of `amount` costs and pays, and whether it would be accepted now. */
export async function fetchQuote(scope: FinanceScope, amount: MoneyCents): Promise<WithdrawalQuote> {
  const response = await api.get<{ data: unknown }>(`${routes(scope).wallet}/quote`, { params: { amount } });
  return parseQuote(response.data);
}

/** The withdrawal recorded under a key, or `null` when none was. */
export async function lookupWithdrawal(scope: FinanceScope, idempotencyKey: string): Promise<Withdrawal | null> {
  const response = await api.get<{ data: unknown }>(`${routes(scope).wallet}/lookup`, { params: { idempotency_key: idempotencyKey } });
  return response.data ? parseWithdrawal(response.data) : null;
}

// ── Withdrawal ──────────────────────────────────────────────

/**
 * The request left, and nobody knows whether the server recorded it: its
 * answer was lost, and asking for it by its key failed too. Neither a
 * success nor a failure — the screen says so and offers to check again.
 */
export class WithdrawalOutcomeUnknown extends Error {
  constructor(public readonly idempotencyKey: string) {
    super("L'état de la demande de retrait n'a pas pu être confirmé.");
    this.name = "WithdrawalOutcomeUnknown";
  }
}

/** An answer that says nothing of what the server did: no answer, or a 5xx. */
const saysNothing = (error: unknown) => error instanceof ApiError && (error.status === 0 || error.status >= 500);

export interface WithdrawalRequest {
  amount: MoneyCents;
  methodId: string;
  /** One key for one intention: sent again, it finds the same withdrawal. */
  idempotencyKey: string;
}

/**
 * Asks for a withdrawal. Nothing is assumed: the withdrawal returned is the
 * one the server recorded.
 *
 * When the answer is lost (network, 5xx), the request may have been recorded
 * all the same. It is looked for by its key before anything is said: found,
 * it is returned as the success it is; not found, the first error stands and
 * sending again — under the same key — is safe.
 */
export async function requestWithdrawal(scope: FinanceScope, request: WithdrawalRequest): Promise<Withdrawal> {
  try {
    const response = await api.post<{ data: { payout?: unknown } | unknown }>(routes(scope).request, {
      amount: request.amount,
      payout_setting_id: request.methodId,
      idempotency_key: request.idempotencyKey,
    });
    const data = response.data as { payout?: unknown };
    // The vendor route wraps it (`data.payout`); the two others answer it as `data`.
    return parseWithdrawal(scope.profile === "vendor" ? data.payout : data);
  } catch (error) {
    if (!saysNothing(error)) throw error;

    let recorded: Withdrawal | null;
    try {
      recorded = await lookupWithdrawal(scope, request.idempotencyKey);
    } catch {
      throw new WithdrawalOutcomeUnknown(request.idempotencyKey);
    }
    if (recorded) return recorded;
    throw error;
  }
}

// ── Payout methods ──────────────────────────────────────────

export async function fetchMethods(scope: FinanceScope): Promise<PayoutMethod[]> {
  const response = await api.get<{ data: unknown }>(routes(scope).methods);
  // The vendor route wraps the list (`data.payout_settings`).
  return parseMethods(scope.profile === "vendor" ? (response.data as { payout_settings?: unknown }).payout_settings ?? [] : response.data);
}

const one = (scope: FinanceScope, data: unknown) => parseMethod(scope.profile === "vendor" ? (data as { payout_setting?: unknown }).payout_setting : data);

export async function createMethod(scope: FinanceScope, draft: MethodDraft): Promise<PayoutMethod> {
  const response = await api.post<{ data: unknown }>(routes(scope).methods, methodPayload(draft));
  return one(scope, response.data);
}

/** Vendor only: agencies and couriers have no such route, they delete and declare again. */
export async function updateMethod(scope: FinanceScope, id: string, draft: MethodDraft): Promise<PayoutMethod> {
  const response = await api.put<{ data: unknown }>(routes(scope).method(id), methodPayload(draft));
  return one(scope, response.data);
}

export const canEditMethods = (scope: FinanceScope) => scope.profile === "vendor";

export async function setDefaultMethod(scope: FinanceScope, id: string): Promise<void> {
  await api.post(`${routes(scope).method(id)}/set-default`);
}

export async function deleteMethod(scope: FinanceScope, id: string): Promise<void> {
  await api.delete(routes(scope).method(id));
}
