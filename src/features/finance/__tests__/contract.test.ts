import { beforeEach, describe, expect, it, vi } from "vitest";

// The contract reaches the HTTP client; isolate from env validation.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1",
    NEXT_PUBLIC_APP_NAME: "SUGU",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_MARKETPLACE_URL: "https://sugu.pro",
    NEXT_PUBLIC_ENABLE_MSW: false,
    NEXT_PUBLIC_REVERB_APP_KEY: "k",
    NEXT_PUBLIC_REVERB_HOST: "localhost",
    NEXT_PUBLIC_REVERB_PORT: 8080,
    NEXT_PUBLIC_REVERB_SCHEME: "https",
  },
}));

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/http/client", () => ({ api: http }));

import { formatMoneyFromCents } from "@/design-system";

import { ApiError } from "@/lib/http/api-error";
import { WithdrawalOutcomeUnknown, createMethod, fetchEntries, fetchMethods, fetchQuote, fetchSummary, fetchWithdrawals, requestWithdrawal, type FinanceScope } from "../api";
import { methodPayload, parseEntryPage, parseMethod, parseQuote, parseSummary, parseWithdrawal, signedAmount } from "../contract";
import { entryTitle, kindWording } from "../wording";

/** An amount as the portal writes it, its no-break spaces made plain. */
const shown = (cents: number, options?: Parameters<typeof formatMoneyFromCents>[1]) => formatMoneyFromCents(cents, options).replace(/\s/g, " ");

// What Laravel answers (`WalletStatementService`, `WithdrawalService`,
// `PayoutSettingService` in ../sugu), and what the portal makes of it.

const summary = (overrides: Record<string, unknown> = {}) => ({
  currency: "XOF",
  amounts_in: "centimes",
  wallet: { exists: true, is_active: true },
  balance: { available: 123_456_700, in_withdrawal: 500_000, withdrawn: 2_000_000 },
  earned: { total: 187_630_000, this_month: 65_050_000, last_30_days: 80_000_000, count_this_month: 6 },
  series: [],
  monthly: [
    { month: "2026-09", amount: 58_550_000 },
    { month: "2026-10", amount: 65_050_000 },
  ],
  period: { month: "2026-10", earned: 65_050_000, count: 6, by_payment: { online: 40_000_000, cod: 20_050_000, cod_mixte: 5_000_000 }, withdrawal_fees: 10_000, withdrawn: 0 },
  limits: { min_amount: 500_000, max_amount: 500_000_000, daily_limit: 1_000_000_000, daily_remaining: 999_500_000, max_pending: 3, pending_count: 1, fee_rate: 0.01 },
  withdrawal: { allowed: true, blocked: null },
  payout_methods: { types: ["mobile_money", "bank_account"], mobile_money_providers: [{ code: "orange_money", label: "Orange Money" }] },
  ...overrides,
});

const payout = (overrides: Record<string, unknown> = {}) => ({
  id: "01hpayout",
  payout_number: "PO-AB12CD34",
  amount: 1_000_000,
  fee_amount: 10_000,
  net_amount: 990_000,
  currency: "XOF",
  status: "pending",
  status_label: "En attente",
  method: "mobile_money",
  destination_masked: "+226******56",
  requested_at: "2026-10-12T14:20:00+00:00",
  approved_at: null,
  paid_at: null,
  failure_code: null,
  note_public: null,
  estimated_date: "24 à 48h ouvrées",
  ...overrides,
});

describe("summary", () => {
  it("reads every amount as centimes, and shows them in francs", () => {
    const parsed = parseSummary(summary());
    expect(parsed.available).toBe(123_456_700);
    expect(shown(parsed.available)).toBe("1 234 567 FCFA");
    expect(shown(parsed.inWithdrawal)).toBe("5 000 FCFA");
    expect(shown(parsed.limits.max)).toBe("5 000 000 FCFA");
    expect(parsed.period.byPayment).toEqual({ online: 40_000_000, cod: 20_050_000, codMixte: 5_000_000 });
    expect(parsed.limits.feeRate).toBe(0.01);
  });

  it("refuses an answer that does not say its amounts are centimes", () => {
    // A unit read wrong shows a balance a hundred times too large or too small: better no figure at all.
    expect(() => parseSummary(summary({ amounts_in: "francs" }))).toThrow();
    expect(() => parseSummary(summary({ amounts_in: undefined }))).toThrow();
  });

  it("refuses a balance that is not a whole number of centimes, or missing", () => {
    expect(() => parseSummary(summary({ balance: { available: 12.5, in_withdrawal: 0, withdrawn: 0 } }))).toThrow();
    expect(() => parseSummary(summary({ balance: { in_withdrawal: 0, withdrawn: 0 } }))).toThrow();
    expect(() => parseSummary(summary({ balance: { available: "beaucoup", in_withdrawal: 0, withdrawn: 0 } }))).toThrow();
  });

  it("keeps the cash held for others apart, and absent for a vendor", () => {
    expect(parseSummary(summary()).cashHeld).toBeNull();
    expect(parseSummary(summary({ cash_held: 0 })).cashHeld).toBe(0);
    expect(parseSummary(summary({ cash_held: 4_250_000 })).cashHeld).toBe(4_250_000);
  });

  it("says whether a withdrawal can be asked in the server's words", () => {
    expect(parseSummary(summary()).withdrawal).toEqual({ allowed: true, blockedCode: null, blockedMessage: null });
    const blocked = parseSummary(summary({ withdrawal: { allowed: false, blocked: { code: "pending_cap", message: "Vous avez déjà 3 demandes de retrait en attente. Veuillez patienter." } } }));
    expect(blocked.withdrawal).toEqual({ allowed: false, blockedCode: "pending_cap", blockedMessage: "Vous avez déjà 3 demandes de retrait en attente. Veuillez patienter." });
  });

  it("holds amounts of several billions exactly", () => {
    const parsed = parseSummary(summary({ balance: { available: 987_654_321_000, in_withdrawal: 0, withdrawn: 0 } }));
    expect(shown(parsed.available)).toBe("9 876 543 210 FCFA");
  });
});

describe("entries", () => {
  const page = (rows: unknown[]) => ({ success: true, data: rows, meta: { current_page: 2, last_page: 4, per_page: 20, total: 71, counts: { all: 71, sale: 60, withdrawal: 8, adjustment: 3 } } });
  const sale = { id: "e1", direction: "credit", amount: 4_000_000, kind: "sale", booked_at: "2026-10-12T10:00:00+00:00", reference: { type: "order", id: "o1", number: "SU-2026-000123" }, detail: "Vente #SU-2026-000123 - net apres commission 10%", status: "booked", payout: null };
  const hold = { id: "e2", direction: "debit", amount: 1_000_000, kind: "withdrawal", booked_at: "2026-10-12T11:00:00+00:00", reference: { type: "payout", id: "01hpayout", number: "PO-AB12CD34" }, detail: null, status: "pending", payout: payout() };

  it("reads a page as the server paged it", () => {
    const parsed = parseEntryPage(page([sale, hold]));
    expect(parsed).toMatchObject({ page: 2, pageSize: 20, total: 71 });
    expect(parsed.counts).toEqual({ all: 71, sale: 60, withdrawal: 8, adjustment: 3 });
    expect(parsed.rows[1].withdrawal?.net).toBe(990_000);
    expect(parsed.rows[1].status).toBe("pending");
  });

  it("signs an amount by its direction, never by its kind", () => {
    const [credit, debit] = parseEntryPage(page([sale, hold])).rows;
    expect(shown(signedAmount(credit), { showPlus: true })).toBe("+40 000 FCFA");
    expect(shown(signedAmount(debit), { showPlus: true })).toBe("-10 000 FCFA");
  });

  it("names an entry from what it refers to, and a kind it does not know as such", () => {
    const [credit, debit] = parseEntryPage(page([sale, hold])).rows;
    expect(entryTitle(credit, "vendor")).toBe("Vente #SU-2026-000123");
    expect(entryTitle(debit, "vendor")).toBe("Retrait PO-AB12CD34");
    expect(entryTitle({ kind: "delivery", reference: { type: "shipment", id: "s1", number: "SU-2026-000200" } }, "agency")).toBe("Livraison #SU-2026-000200");
    expect(entryTitle({ kind: "delivery", reference: { type: "shipment", id: "s1", number: "SU-2026-000200" } }, "courier")).toBe("Mission #SU-2026-000200");
    expect(entryTitle({ kind: "adjustment", reference: null }, "vendor")).toBe("Ajustement");

    // Never folded into a kind that exists.
    const unknown = parseEntryPage(page([{ ...sale, kind: "loyalty_bonus", reference: null }])).rows[0];
    expect(unknown.kind).toBe("loyalty_bonus");
    expect(kindWording(unknown.kind, "vendor").label).toBe("Opération");
  });

  it("refuses an entry whose direction is not one of the two", () => {
    expect(() => parseEntryPage(page([{ ...sale, direction: "transfer" }]))).toThrow();
  });
});

describe("withdrawal and quote", () => {
  it("keeps the fee and the net the server computed", () => {
    const parsed = parseWithdrawal(payout({ amount: 123_456_700, fee_amount: 1_234_600, net_amount: 122_222_100 }));
    expect(parsed.fee + parsed.net).toBe(parsed.amount);
    expect(shown(parsed.net)).toBe("1 222 221 FCFA");
    expect(parsed.status).toBe("pending");
  });

  it("reads a quote and what the server would refuse", () => {
    expect(parseQuote({ amount: 1_000_000, fee_amount: 10_000, net_amount: 990_000, fee_rate: 0.01, acceptable: true, refusal: null })).toEqual({ amount: 1_000_000, fee: 10_000, net: 990_000, feeRate: 0.01, acceptable: true, refusal: null });
    const refused = parseQuote({ amount: 100, fee_amount: 0, net_amount: 100, fee_rate: 0, acceptable: false, refusal: "Montant minimum de retrait : 5 000 FCFA." });
    expect(refused).toMatchObject({ acceptable: false, refusal: "Montant minimum de retrait : 5 000 FCFA." });
  });
});

describe("payout methods", () => {
  const method = (overrides: Record<string, unknown> = {}) => ({ id: "m1", type: "mobile_money", provider: "orange_money", provider_label: "Orange Money", account_masked: "+226******56", account_name: "Awa", is_default: true, is_verified: true, is_payable: true, status: 1, ...overrides });

  it("is usable only when the server says it is payable", () => {
    expect(parseMethod(method())).toMatchObject({ kind: "mobile_money", payable: true, state: "verified", account: "+226******56" });
    expect(parseMethod(method({ is_payable: false, is_verified: false, status: 0 })).state).toBe("pending");
    // Verified once, then paused or disabled by an operator: not usable, and said so.
    expect(parseMethod(method({ is_payable: false, is_verified: true, status: 2 })).state).toBe("paused");
    expect(parseMethod(method({ is_payable: false, is_verified: true, status: 3 })).state).toBe("disabled");
    // `is_verified` alone opens nothing.
    expect(parseMethod(method({ is_payable: false, is_verified: true, status: 0 })).payable).toBe(false);
  });

  it("reads a bank account under both names the routes give it", () => {
    expect(parseMethod(method({ type: "bank_transfer", provider: "coris_bank", provider_label: "Coris Bank", account_masked: "****1234" })).kind).toBe("bank");
    expect(parseMethod(method({ type: "bank_account", provider_label: "Coris Bank", account_masked: "****1234" })).kind).toBe("bank");
  });

  it("sends what the owner typed and nothing that would verify it", () => {
    const mobile = methodPayload({ kind: "mobile_money", provider: "moov_money", phone: "+22660112233", holder: " Awa Ouédraogo ", isDefault: false });
    expect(mobile).toEqual({ type: "mobile_money", mm_provider: "moov_money", mm_msisdn_e164: "+22660112233", mm_account_name: "Awa Ouédraogo", is_default: false });

    const bank = methodPayload({ kind: "bank", bank: "Coris Bank", holder: "Awa SARL", accountNumber: "", iban: "bf42 bf08 4010 1300 4635 7400 0390", isDefault: true });
    expect(bank).toEqual({ type: "bank_account", bank_name: "Coris Bank", account_holder_name: "Awa SARL", account_number: undefined, iban: "BF42BF0840101300463574000390", is_default: true });
    for (const payload of [mobile, bank]) expect(Object.keys(payload)).not.toEqual(expect.arrayContaining(["status", "verified_at", "is_verified", "is_payable"]));
  });
});

describe("HTTP calls", () => {
  const vendor: FinanceScope = { profile: "vendor", ownerId: "store-1" };
  const agency: FinanceScope = { profile: "agency", ownerId: "agency-1" };
  const courier: FinanceScope = { profile: "courier", ownerId: null };

  beforeEach(() => Object.values(http).forEach((mock) => mock.mockReset()));

  it("addresses each profile by its own routes", async () => {
    http.get.mockResolvedValue({ data: summary() });
    await fetchSummary(vendor, "2026-09");
    await fetchSummary(agency);
    await fetchSummary(courier);
    expect(http.get.mock.calls.map((call) => call[0])).toEqual(["sellers/wallet/summary", "agencies/agency-1/wallet/summary", "courier/wallet/summary"]);
    expect(http.get.mock.calls[0][1]).toEqual({ params: { month: "2026-09" } });

    http.get.mockResolvedValue({ data: [], meta: { current_page: 1, per_page: 20, total: 0, counts: { all: 0, in_progress: 0, paid: 0, closed: 0 } } });
    await fetchWithdrawals(vendor, { state: "paid", page: 2, pageSize: 20 });
    await fetchWithdrawals(courier, { page: 1, pageSize: 20 });
    expect(http.get).toHaveBeenCalledWith("sellers/wallet/payouts", { params: { state: "paid", page: 2, per_page: 20 } });
    expect(http.get).toHaveBeenCalledWith("courier/withdrawals", { params: { state: undefined, page: 1, per_page: 20 } });
  });

  it("asks the server for the page, the kind, the days and the search — never filters itself", async () => {
    http.get.mockResolvedValue({ data: [], meta: { current_page: 3, per_page: 50, total: 0, counts: { all: 0 } } });
    await fetchEntries(agency, { kind: "delivery", search: "  000123 ", from: "2026-10-01", to: "2026-10-12", page: 3, pageSize: 50 });
    expect(http.get).toHaveBeenCalledWith("agencies/agency-1/wallet/entries", { params: { kind: "delivery", search: "000123", from: "2026-10-01", to: "2026-10-12", page: 3, per_page: 50 } });
  });

  it("asks the fee of an amount in centimes", async () => {
    http.get.mockResolvedValue({ data: { amount: 1_000_000, fee_amount: 10_000, net_amount: 990_000, fee_rate: 0.01, acceptable: true, refusal: null } });
    const quote = await fetchQuote(courier, 1_000_000 as never);
    expect(http.get).toHaveBeenCalledWith("courier/wallet/quote", { params: { amount: 1_000_000 } });
    expect(quote.net).toBe(990_000);
  });

  it("reads the list of methods under the shape of each profile", async () => {
    const row = { id: "m1", type: "mobile_money", provider: "orange_money", provider_label: "Orange Money", account_masked: "+226******56", account_name: "Awa", is_default: true, is_verified: true, is_payable: true, status: 1 };
    http.get.mockResolvedValueOnce({ data: { payout_settings: [row] } });
    expect(await fetchMethods(vendor)).toHaveLength(1);
    expect(http.get).toHaveBeenLastCalledWith("stores/store-1/payout-settings");
    http.get.mockResolvedValueOnce({ data: [row] });
    expect(await fetchMethods(agency)).toHaveLength(1);

    http.post.mockResolvedValueOnce({ data: { payout_setting: row } });
    await createMethod(vendor, { kind: "mobile_money", provider: "orange_money", phone: "+22670123456", holder: "Awa", isDefault: true });
    expect(http.post.mock.calls[0][0]).toBe("stores/store-1/payout-settings");
  });

  describe("asking for a withdrawal", () => {
    const request = { amount: 1_000_000 as never, methodId: "m1", idempotencyKey: "key-1" };

    it("sends centimes, the method and its key, and returns what the server recorded", async () => {
      http.post.mockResolvedValueOnce({ data: { payout: payout() } });
      const recorded = await requestWithdrawal(vendor, request);
      expect(http.post).toHaveBeenCalledWith("sellers/wallet/request-payout", { amount: 1_000_000, payout_setting_id: "m1", idempotency_key: "key-1" });
      expect(recorded).toMatchObject({ id: "01hpayout", status: "pending", net: 990_000 });

      http.post.mockResolvedValueOnce({ data: payout({ id: "01hagency" }) });
      expect((await requestWithdrawal(agency, request)).id).toBe("01hagency");
      expect(http.post).toHaveBeenLastCalledWith("agencies/agency-1/withdrawals", expect.anything());
    });

    it("looks for the withdrawal by its key when the answer is lost, and returns it when it exists", async () => {
      http.post.mockRejectedValueOnce(new ApiError({ message: "Network error", status: 0 }));
      http.get.mockResolvedValueOnce({ data: payout() });
      const recorded = await requestWithdrawal(courier, request);
      expect(http.get).toHaveBeenCalledWith("courier/wallet/lookup", { params: { idempotency_key: "key-1" } });
      expect(recorded.id).toBe("01hpayout");
      // Found, not sent again.
      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it("says the request was not recorded when the server holds none under its key", async () => {
      const lost = new ApiError({ message: "HTTP 502", status: 502 });
      http.post.mockRejectedValueOnce(lost);
      http.get.mockResolvedValueOnce({ data: null });
      await expect(requestWithdrawal(vendor, request)).rejects.toBe(lost);
    });

    it("says it does not know when neither the answer nor the check came back", async () => {
      http.post.mockRejectedValueOnce(new ApiError({ message: "Network error", status: 0 }));
      http.get.mockRejectedValueOnce(new ApiError({ message: "Network error", status: 0 }));
      const failure = await requestWithdrawal(vendor, request).catch((error) => error);
      expect(failure).toBeInstanceOf(WithdrawalOutcomeUnknown);
      expect((failure as WithdrawalOutcomeUnknown).idempotencyKey).toBe("key-1");
    });

    it("takes a refusal for what it is, without looking further", async () => {
      for (const status of [401, 403, 409, 422, 429]) {
        const refusal = new ApiError({ message: "Solde insuffisant. Disponible : 2 000 FCFA.", status });
        http.post.mockRejectedValueOnce(refusal);
        await expect(requestWithdrawal(vendor, request)).rejects.toBe(refusal);
      }
      expect(http.get).not.toHaveBeenCalled();
    });
  });
});
