import { z } from "zod";
import { asCents, type MoneyCents } from "@/design-system";

// ============================================================
// Money of a professional account — what Laravel answers for a
// vendor, a delivery agency and a courier.
//
// Every amount is CENTIMES, an integer, typed `MoneyCents` here
// and shown through `formatMoneyFromCents` only. Nothing in this
// file computes an amount: a balance, a fee, a net are read.
//
//   …/wallet/summary   WalletStatementService::summary
//   …/wallet/entries   WalletStatementService::toApiArray
//   …/wallet/quote     WithdrawalService::quote
//   withdrawals        WithdrawalService::toApiArray
//   payout settings    PayoutSettingService::toApiArray
// ============================================================

const cents = z.coerce.number().int().transform(asCents);
const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

// ── Summary ─────────────────────────────────────────────────

const blockedSchema = z.object({ code: z.string(), message: z.string() });

const summarySchema = z.object({
  amounts_in: z.literal("centimes"),
  wallet: z.object({ exists: z.boolean(), is_active: z.boolean() }),
  balance: z.object({ available: cents, in_withdrawal: cents, withdrawn: cents }),
  earned: z.object({ total: cents, this_month: cents, last_30_days: cents, count_this_month: z.coerce.number().int() }),
  monthly: z.array(z.object({ month: z.string(), amount: cents })),
  period: z.object({
    month: z.string(),
    earned: cents,
    count: z.coerce.number().int(),
    by_payment: z.object({ online: cents, cod: cents, cod_mixte: cents }),
    withdrawal_fees: cents,
    withdrawn: cents,
  }),
  limits: z.object({
    min_amount: cents,
    max_amount: cents,
    daily_limit: cents,
    daily_remaining: cents,
    max_pending: z.coerce.number().int(),
    pending_count: z.coerce.number().int(),
    fee_rate: z.coerce.number(),
  }),
  // Cash collected for others: agencies and couriers only.
  cash_held: cents.optional(),
  withdrawal: z.object({ allowed: z.boolean(), blocked: blockedSchema.nullable() }),
  payout_methods: z.object({
    types: z.array(z.string()),
    mobile_money_providers: z.array(z.object({ code: z.string(), label: z.string() })),
  }),
});

export interface WalletSummary {
  wallet: { exists: boolean; active: boolean };
  /** `wallets.balance_amount`: what a withdrawal is checked against. */
  available: MoneyCents;
  /** Held by the requests still in flight. Already out of `available`. */
  inWithdrawal: MoneyCents;
  /** Actually paid out. */
  withdrawn: MoneyCents;
  /** Credited by settlement, ever: sales or deliveries, nothing else. */
  earnedTotal: MoneyCents;
  /** Credited by settlement in each of the last six months, oldest first. */
  monthly: Array<{ month: string; amount: MoneyCents }>;
  /** One calendar month, the one asked (the current one by default). */
  period: {
    month: string;
    earned: MoneyCents;
    count: number;
    byPayment: { online: MoneyCents; cod: MoneyCents; codMixte: MoneyCents };
    withdrawalFees: MoneyCents;
    withdrawn: MoneyCents;
  };
  limits: {
    min: MoneyCents;
    max: MoneyCents;
    dailyRemaining: MoneyCents;
    maxPending: number;
    pendingCount: number;
    /** 0.01 = 1 %. Shown, never multiplied: the fee of an amount is asked of the server. */
    feeRate: number;
  };
  /** Cash held for others; `null` for a vendor, who holds none. */
  cashHeld: MoneyCents | null;
  /** Whether a withdrawal can be asked now, said by the server, and why not. */
  withdrawal: { allowed: boolean; blockedCode: string | null; blockedMessage: string | null };
  mobileMoneyProviders: Array<{ code: string; label: string }>;
}

export function parseSummary(raw: unknown): WalletSummary {
  const data = summarySchema.parse(raw);
  return {
    wallet: { exists: data.wallet.exists, active: data.wallet.is_active },
    available: data.balance.available,
    inWithdrawal: data.balance.in_withdrawal,
    withdrawn: data.balance.withdrawn,
    earnedTotal: data.earned.total,
    monthly: data.monthly,
    period: {
      month: data.period.month,
      earned: data.period.earned,
      count: data.period.count,
      byPayment: { online: data.period.by_payment.online, cod: data.period.by_payment.cod, codMixte: data.period.by_payment.cod_mixte },
      withdrawalFees: data.period.withdrawal_fees,
      withdrawn: data.period.withdrawn,
    },
    limits: {
      min: data.limits.min_amount,
      max: data.limits.max_amount,
      dailyRemaining: data.limits.daily_remaining,
      maxPending: data.limits.max_pending,
      pendingCount: data.limits.pending_count,
      feeRate: data.limits.fee_rate,
    },
    cashHeld: data.cash_held ?? null,
    withdrawal: { allowed: data.withdrawal.allowed, blockedCode: data.withdrawal.blocked?.code ?? null, blockedMessage: data.withdrawal.blocked?.message ?? null },
    mobileMoneyProviders: data.payout_methods.mobile_money_providers,
  };
}

// ── Withdrawals ─────────────────────────────────────────────

const withdrawalSchema = z.object({
  id: z.string(),
  payout_number: text,
  amount: cents,
  fee_amount: cents,
  net_amount: cents,
  status: z.string(),
  method: text,
  destination_masked: text,
  requested_at: text,
  approved_at: text,
  paid_at: text,
  note_public: text,
  estimated_date: text,
});

export interface Withdrawal {
  id: string;
  number: string | null;
  amount: MoneyCents;
  fee: MoneyCents;
  net: MoneyCents;
  /** Raw `PayoutStatus`, shown through the `payout` registry. */
  status: string;
  /** `mobile_money`, `bank` or `cash`. */
  method: string | null;
  destination: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  /** What the operator wrote for the beneficiary, e.g. why it was refused. */
  note: string | null;
  /** The usual delay, in the server's words ("24 à 48h ouvrées"). */
  delay: string | null;
}

export function parseWithdrawal(raw: unknown): Withdrawal {
  const data = withdrawalSchema.parse(raw);
  return {
    id: data.id,
    number: data.payout_number,
    amount: data.amount,
    fee: data.fee_amount,
    net: data.net_amount,
    status: data.status,
    method: data.method,
    destination: data.destination_masked,
    requestedAt: data.requested_at,
    approvedAt: data.approved_at,
    paidAt: data.paid_at,
    note: data.note_public,
    delay: data.estimated_date,
  };
}

export const WITHDRAWAL_STATES = ["in_progress", "paid", "closed"] as const;
export type WithdrawalState = (typeof WITHDRAWAL_STATES)[number];

const pageMeta = z.object({
  current_page: z.coerce.number().catch(1),
  per_page: z.coerce.number().catch(20),
  total: z.coerce.number().catch(0),
});

const withdrawalPageSchema = z.object({
  data: z.array(withdrawalSchema),
  meta: pageMeta.extend({
    counts: z.object({ all: z.coerce.number(), in_progress: z.coerce.number(), paid: z.coerce.number(), closed: z.coerce.number() }),
  }),
});

export interface WithdrawalPage {
  rows: Withdrawal[];
  counts: Record<"all" | WithdrawalState, number>;
  page: number;
  pageSize: number;
  total: number;
}

export function parseWithdrawalPage(raw: unknown): WithdrawalPage {
  const body = withdrawalPageSchema.parse(raw);
  return { rows: body.data.map(parseWithdrawal), counts: body.meta.counts, page: body.meta.current_page, pageSize: body.meta.per_page, total: body.meta.total };
}

// ── Entries ─────────────────────────────────────────────────

export const ENTRY_KINDS = ["sale", "delivery", "withdrawal", "withdrawal_released", "dispute", "adjustment"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

const entrySchema = z.object({
  id: z.string(),
  direction: z.enum(["credit", "debit"]),
  amount: cents,
  kind: z.string(),
  booked_at: text,
  reference: z.object({ type: z.string(), id: z.string(), number: text }).nullable(),
  detail: text,
  status: z.string(),
  payout: withdrawalSchema.nullable(),
});

export interface WalletEntry {
  id: string;
  direction: "credit" | "debit";
  /** Always positive: the direction says which way it went. */
  amount: MoneyCents;
  /** One of `ENTRY_KINDS`, or what the server sent when it is not. */
  kind: string;
  bookedAt: string | null;
  /** What it comes from: an order, a delivery, a withdrawal, a dispute. */
  reference: { type: string; id: string; number: string | null } | null;
  /** The sentence settlement wrote on it, when there is one. */
  detail: string | null;
  /** `booked`, or the state of the withdrawal the entry holds the money of. */
  status: string;
  withdrawal: Withdrawal | null;
}

const entryPageSchema = z.object({
  data: z.array(entrySchema),
  meta: pageMeta.extend({ counts: z.record(z.string(), z.coerce.number()) }),
});

export interface EntryPage {
  rows: WalletEntry[];
  counts: Record<string, number>;
  page: number;
  pageSize: number;
  total: number;
}

export function parseEntryPage(raw: unknown): EntryPage {
  const body = entryPageSchema.parse(raw);
  return {
    rows: body.data.map((row) => ({
      id: row.id,
      direction: row.direction,
      amount: row.amount,
      kind: row.kind,
      bookedAt: row.booked_at,
      reference: row.reference,
      detail: row.detail,
      status: row.status,
      withdrawal: row.payout ? parseWithdrawal(row.payout) : null,
    })),
    counts: body.meta.counts,
    page: body.meta.current_page,
    pageSize: body.meta.per_page,
    total: body.meta.total,
  };
}

/** The amount of an entry with its sign: what it did to the balance. */
export const signedAmount = (entry: Pick<WalletEntry, "direction" | "amount">): MoneyCents => asCents(entry.direction === "debit" ? -entry.amount : entry.amount);

// ── Quote ───────────────────────────────────────────────────

const quoteSchema = z.object({
  amount: cents,
  fee_amount: cents,
  net_amount: cents,
  fee_rate: z.coerce.number(),
  acceptable: z.boolean(),
  refusal: text,
});

export interface WithdrawalQuote {
  amount: MoneyCents;
  fee: MoneyCents;
  net: MoneyCents;
  feeRate: number;
  /** False when the server would refuse this amount now; `refusal` says why. */
  acceptable: boolean;
  refusal: string | null;
}

export function parseQuote(raw: unknown): WithdrawalQuote {
  const data = quoteSchema.parse(raw);
  return { amount: data.amount, fee: data.fee_amount, net: data.net_amount, feeRate: data.fee_rate, acceptable: data.acceptable, refusal: data.refusal };
}

// ── Payout methods ──────────────────────────────────────────

const methodSchema = z.object({
  id: z.string(),
  // `bank_transfer` in the shared shape, `bank_account` on the vendor routes.
  type: z.string(),
  provider: text,
  provider_label: text,
  account_masked: text,
  account_name: text,
  is_default: z.boolean().catch(false),
  is_verified: z.boolean().catch(false),
  is_payable: z.boolean().catch(false),
  status: z.union([z.number(), z.string()]).nullish(),
});

export type MethodKind = "mobile_money" | "bank";

/** Where a method stands: only `verified` can receive a withdrawal. */
export type MethodState = "verified" | "pending" | "paused" | "disabled";

export interface PayoutMethod {
  id: string;
  kind: MethodKind;
  /** `orange_money`, `moov_money`…, or the name of the bank, lower-cased. */
  provider: string | null;
  label: string;
  /** Masked by the server: the portal never holds the number. */
  account: string | null;
  holder: string | null;
  isDefault: boolean;
  /** `StorePayoutSetting::isPayable`: verified by an operator and active. */
  payable: boolean;
  state: MethodState;
}

function methodState(payable: boolean, status: number | string | null | undefined): MethodState {
  if (payable) return "verified";
  // StorePayoutSetting::STATUS_PAUSED / STATUS_DISABLED.
  if (Number(status) === 2) return "paused";
  if (Number(status) === 3) return "disabled";
  return "pending";
}

export function parseMethod(raw: unknown): PayoutMethod {
  const data = methodSchema.parse(raw);
  const kind: MethodKind = data.type === "mobile_money" ? "mobile_money" : "bank";
  return {
    id: data.id,
    kind,
    provider: data.provider,
    label: data.provider_label ?? (kind === "bank" ? "Compte bancaire" : "Mobile money"),
    account: data.account_masked && data.account_masked !== "—" ? data.account_masked : null,
    holder: data.account_name,
    isDefault: data.is_default,
    payable: data.is_payable,
    state: methodState(data.is_payable, data.status),
  };
}

export const parseMethods = (raw: unknown): PayoutMethod[] => z.array(z.unknown()).parse(raw).map(parseMethod);

/** What the form of a method sends. The server makes it a draft, whatever is sent. */
export type MethodDraft =
  | { kind: "mobile_money"; provider: string; phone: string; holder: string; isDefault: boolean }
  | { kind: "bank"; bank: string; holder: string; accountNumber: string; iban: string; isDefault: boolean };

export function methodPayload(draft: MethodDraft): Record<string, unknown> {
  if (draft.kind === "mobile_money") {
    return { type: "mobile_money", mm_provider: draft.provider, mm_msisdn_e164: draft.phone, mm_account_name: draft.holder.trim(), is_default: draft.isDefault };
  }
  return {
    type: "bank_account",
    bank_name: draft.bank.trim(),
    account_holder_name: draft.holder.trim(),
    account_number: draft.accountNumber.trim() || undefined,
    iban: draft.iban.replace(/\s+/g, "").toUpperCase() || undefined,
    is_default: draft.isDefault,
  };
}
