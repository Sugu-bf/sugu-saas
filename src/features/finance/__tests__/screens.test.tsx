import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/http/api-error";
import type { FinanceProfile } from "../api";
import type { PayoutMethod, WalletSummary, Withdrawal, WithdrawalQuote } from "../contract";

// The money screens, with the server played by their hooks: what they show
// of an answer, of a refusal and of a failure, and what they send.

const nav = vi.hoisted(() => ({ replace: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/wallet",
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// The screens reach the HTTP client through `../api`; isolate from env validation.
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

type Query<T> = { data: T | undefined; isError: boolean; error: unknown; isFetching: boolean; refetch: () => void };
const ok = <T,>(data: T): Query<T> => ({ data, isError: false, error: null, isFetching: false, refetch: vi.fn() });
const failed = <T,>(error: unknown): Query<T> => ({ data: undefined, isError: true, error, isFetching: false, refetch: vi.fn() });
const loading = <T,>(): Query<T> => ({ data: undefined, isError: false, error: null, isFetching: true, refetch: vi.fn() });

const server = vi.hoisted(() => ({
  profile: "vendor" as "vendor" | "agency" | "courier",
  summary: null as unknown,
  entries: null as unknown,
  methods: null as unknown,
  withdrawals: null as unknown,
  quote: (() => null) as (amount: number | null) => unknown,
  request: { mutateAsync: vi.fn(), isPending: false },
  lookup: { mutateAsync: vi.fn(), isPending: false },
  command: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("../hooks", () => ({
  useFinanceScope: (profile: string) => ({ profile, ownerId: profile === "courier" ? null : "owner-1" }),
  useSummary: () => server.summary,
  useEntries: () => server.entries,
  useMethods: () => server.methods,
  useWithdrawals: () => server.withdrawals,
  useQuote: (_scope: unknown, amount: number | null) => server.quote(amount),
  useRequestWithdrawal: () => server.request,
  useLookupWithdrawal: () => server.lookup,
  useMethodCommand: () => server.command,
}));

const { WithdrawalOutcomeUnknown } = await import("../api");
const { FinanceOverview } = await import("../components/overview");
const { FinanceWithdraw } = await import("../components/withdraw");
const { FinanceMethods } = await import("../components/methods");
const { FinanceWithdrawals } = await import("../components/withdrawals");

const cents = (value: number) => value as never;

function summaryOf(overrides: Partial<WalletSummary> = {}): WalletSummary {
  return {
    wallet: { exists: true, active: true },
    available: cents(85_620_000),
    inWithdrawal: cents(500_000),
    withdrawn: cents(2_000_000),
    earnedTotal: cents(187_630_000),
    monthly: [
      { month: "2026-09", amount: cents(58_550_000) },
      { month: "2026-10", amount: cents(65_050_000) },
    ],
    period: { month: "2026-10", earned: cents(65_050_000), count: 6, byPayment: { online: cents(40_000_000), cod: cents(20_050_000), codMixte: cents(5_000_000) }, withdrawalFees: cents(0), withdrawn: cents(0) },
    limits: { min: cents(500_000), max: cents(500_000_000), dailyRemaining: cents(999_500_000), maxPending: 3, pendingCount: 1, feeRate: 0.01 },
    cashHeld: null,
    withdrawal: { allowed: true, blockedCode: null, blockedMessage: null },
    mobileMoneyProviders: [
      { code: "orange_money", label: "Orange Money" },
      { code: "moov_money", label: "Moov Money" },
    ],
    ...overrides,
  };
}

const method = (overrides: Partial<PayoutMethod> = {}): PayoutMethod => ({ id: "m1", kind: "mobile_money", provider: "orange_money", label: "Orange Money", account: "+226******56", holder: "Awa Ouédraogo", isDefault: true, payable: true, state: "verified", ...overrides });

const withdrawal = (overrides: Partial<Withdrawal> = {}): Withdrawal => ({
  id: "p1",
  number: "PO-AB12CD34",
  amount: cents(123_456_700),
  fee: cents(1_234_600),
  net: cents(122_222_100),
  status: "pending",
  method: "mobile_money",
  destination: "+226******56",
  requestedAt: "2026-10-12T14:20:00+00:00",
  approvedAt: null,
  paidAt: null,
  note: null,
  delay: "24 à 48h ouvrées",
  ...overrides,
});

/** What the server answers for an amount: its own fee, not the rate times the amount. */
const quoteOf = (amount: number, overrides: Partial<WithdrawalQuote> = {}): WithdrawalQuote => ({ amount: cents(amount), fee: cents(1_234_600), net: cents(amount - 1_234_600), feeRate: 0.01, acceptable: true, refusal: null, ...overrides });

const text = (element: HTMLElement) => (element.textContent ?? "").replace(/\s/g, " ");

beforeEach(() => {
  server.summary = ok(summaryOf());
  server.entries = ok({ rows: [], counts: { all: 0 }, page: 1, pageSize: 5, total: 0 });
  server.methods = ok([method()]);
  server.withdrawals = ok({ rows: [], counts: { all: 0, in_progress: 0, paid: 0, closed: 0 }, page: 1, pageSize: 20, total: 0 });
  server.quote = (amount) => (amount ? ok(quoteOf(amount)) : loading());
  server.request = { mutateAsync: vi.fn(), isPending: false };
  server.lookup = { mutateAsync: vi.fn(), isPending: false };
  server.command = { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false };
  nav.params = new URLSearchParams();
  nav.replace.mockReset();
});

// ── Overview ────────────────────────────────────────────────

describe("overview", () => {
  it("shows the figures of the server, in francs, the balance first", () => {
    render(<FinanceOverview profile="vendor" />);
    const figures = screen.getByRole("region", { name: "Chiffres clés" });
    expect(text(figures)).toContain("856 200 FCFA");
    expect(text(figures)).toContain("5 000 FCFA");
    expect(text(figures)).toContain("1 876 300 FCFA");
    expect(text(figures)).toContain("650 500 FCFA");
    // The balance is the first thing of the region, and leads to the history.
    expect(within(figures).getAllByRole("link")[0]).toHaveAttribute("href", "/vendor/wallet/history");
    expect(within(figures).queryByText("Espèces à reverser")).toBeNull();
  });

  it("never draws a failure as a balance of zero", () => {
    server.summary = failed(new ApiError({ message: "HTTP 500", status: 500 }));
    render(<FinanceOverview profile="vendor" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible d'afficher vos finances");
    expect(screen.queryByRole("region", { name: "Chiffres clés" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/0\s?FCFA/);
    expect(screen.getByRole("button", { name: /Réessayer/ })).toBeInTheDocument();
  });

  it("says that the account may not read this money, when the server says so", () => {
    server.summary = failed(new ApiError({ message: "Agence introuvable ou accès refusé.", status: 403 }));
    render(<FinanceOverview profile="agency" />);
    expect(screen.getByText("Accès réservé")).toBeInTheDocument();
    expect(screen.getByText("Agence introuvable ou accès refusé.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Demander un retrait" })).toBeNull();
  });

  it("offers the withdrawal only when the server says it can be asked", () => {
    const { unmount } = render(<FinanceOverview profile="vendor" />);
    expect(screen.getByRole("link", { name: "Demander un retrait" })).toHaveAttribute("href", "/vendor/wallet/withdraw");
    unmount();

    server.summary = ok(summaryOf({ withdrawal: { allowed: false, blockedCode: "pending_cap", blockedMessage: "Vous avez déjà 3 demandes de retrait en attente. Veuillez patienter." } }));
    render(<FinanceOverview profile="vendor" />);
    expect(screen.queryByRole("link", { name: "Demander un retrait" })).toBeNull();
    expect(screen.getByRole("button", { name: "Demander un retrait" })).toBeDisabled();
    expect(screen.getByText("Vous avez déjà 3 demandes de retrait en attente. Veuillez patienter.")).toBeInTheDocument();
  });

  it("keeps the cash held for others out of the balance, and names it for what it is", () => {
    server.profile = "agency";
    server.summary = ok(summaryOf({ cashHeld: cents(112_000_000) }));
    render(<FinanceOverview profile="agency" />);
    const figures = screen.getByRole("region", { name: "Chiffres clés" });
    expect(text(figures)).toContain("1 120 000 FCFA");
    expect(within(figures).getByText("Espèces à reverser")).toBeInTheDocument();
    expect(within(figures).getByText("Encaissées pour des tiers, hors de votre solde")).toBeInTheDocument();
    // The balance is still the wallet's.
    expect(within(figures).getAllByRole("link")[0]).toHaveAccessibleName(/856\s200\sFCFA/);
  });

  it("writes an amount of billions in full", () => {
    server.summary = ok(summaryOf({ available: cents(987_654_321_000), earnedTotal: cents(1_234_567_890_100) }));
    render(<FinanceOverview profile="vendor" />);
    const figures = text(screen.getByRole("region", { name: "Chiffres clés" }));
    expect(figures).toContain("9 876 543 210 FCFA");
    expect(figures).toContain("12 345 678 901 FCFA");
  });

  it("says a suspended wallet is suspended", () => {
    server.summary = ok(summaryOf({ wallet: { exists: true, active: false }, withdrawal: { allowed: false, blockedCode: "wallet_suspended", blockedMessage: "Ce portefeuille est suspendu. Aucune opération n'est autorisée." } }));
    render(<FinanceOverview profile="courier" />);
    expect(screen.getByText("Portefeuille suspendu")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Demander un retrait" })).toBeNull();
  });

  it("asks the server for another month through the address", async () => {
    render(<FinanceOverview profile="vendor" />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Mois affiché" }), "2026-09");
    expect(nav.replace).toHaveBeenCalledWith("/vendor/wallet?mois=2026-09", { scroll: false });
  });
});

// ── Withdrawal ──────────────────────────────────────────────

describe("asking for a withdrawal", () => {
  const amountField = () => screen.getByLabelText(/Montant à retirer/);
  const next = () => screen.getByRole("button", { name: "Continuer" });

  async function toReview(profile: FinanceProfile = "vendor") {
    render(<FinanceWithdraw profile={profile} />);
    await userEvent.type(amountField(), "1234567", { delay: null });
    await waitFor(() => expect(next()).toBeEnabled());
    await userEvent.click(next());
    await userEvent.click(next());
    return screen.getByRole("button", { name: "Confirmer le retrait" });
  }

  it("shows the fee and the net the server quoted, not the rate times the amount", async () => {
    render(<FinanceWithdraw profile="agency" />);
    expect(next()).toBeDisabled();
    await userEvent.type(amountField(), "1234567", { delay: null });

    const recap = screen.getByRole("region", { name: "Récapitulatif" });
    // 1 % of 1 234 567 F would be 12 345,67 F: the server rounds the fee up so that the net is whole francs.
    await waitFor(() => expect(text(recap)).toContain("12 346 FCFA"));
    expect(text(recap)).toContain("1 222 221 FCFA");
    expect(text(recap)).not.toContain("12 345,67");
    expect(next()).toBeEnabled();
  });

  it("does not go on while the fee of the amount on screen is not known", async () => {
    server.quote = () => loading();
    render(<FinanceWithdraw profile="vendor" />);
    await userEvent.type(amountField(), "50000", { delay: null });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(next()).toBeDisabled();
    expect(text(screen.getByRole("region", { name: "Récapitulatif" }))).not.toMatch(/\d FCFA/);
  });

  it("says the fee could not be computed, instead of guessing it", async () => {
    server.quote = (amount) => (amount ? failed(new ApiError({ message: "HTTP 503", status: 503 })) : loading());
    render(<FinanceWithdraw profile="courier" />);
    await userEvent.type(amountField(), "50000", { delay: null });
    expect(await screen.findByText("Les frais n'ont pas pu être calculés.")).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it("shows the refusal of the server under the field, and stops there", async () => {
    server.quote = (amount) => (amount ? ok(quoteOf(amount, { acceptable: false, refusal: "Solde insuffisant. Disponible : 856 200 FCFA." })) : loading());
    render(<FinanceWithdraw profile="vendor" />);
    await userEvent.type(amountField(), "9000000", { delay: null });
    expect(await screen.findByText("Solde insuffisant. Disponible : 856 200 FCFA.")).toBeInTheDocument();
    expect(amountField()).toHaveAttribute("aria-invalid", "true");
    expect(next()).toBeDisabled();
  });

  it("takes no amount that is not a whole number of francs", async () => {
    const asked: Array<number | null> = [];
    server.quote = (amount) => {
      asked.push(amount);
      return amount ? ok(quoteOf(amount)) : loading();
    };
    render(<FinanceWithdraw profile="vendor" />);
    for (const typed of ["12,5", "-500", "abc", "1e6"]) {
      await userEvent.clear(amountField());
      await userEvent.type(amountField(), typed, { delay: null });
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(next()).toBeDisabled();
      expect(screen.getByText("Saisissez un montant en francs CFA, sans décimales.")).toBeInTheDocument();
    }
    await userEvent.clear(amountField());
    await userEvent.type(amountField(), "0", { delay: null });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(next()).toBeDisabled();
    // Nothing but null was ever asked of the server.
    expect(asked.every((amount) => amount === null)).toBe(true);
  });

  it("offers only the methods the server says can be paid", async () => {
    server.methods = ok([method(), method({ id: "m2", label: "Moov Money", account: "+226******33", isDefault: false, payable: false, state: "pending" })]);
    render(<FinanceWithdraw profile="vendor" />);
    await userEvent.type(amountField(), "50000", { delay: null });
    await waitFor(() => expect(next()).toBeEnabled());
    await userEvent.click(next());

    const choice = screen.getByRole("group", { name: "Méthode de paiement" });
    expect(within(choice).getAllByRole("radio")).toHaveLength(1);
    expect(within(choice).getByRole("radio")).toBeChecked();
    expect(within(choice).queryByText("Moov Money")).toBeNull();
    expect(within(choice).getByText(/Une autre méthode attend la vérification de SUGU/)).toBeInTheDocument();
  });

  it("leads to the methods when none can be paid, and tells an outage from an absence", async () => {
    server.methods = ok([]);
    const first = render(<FinanceWithdraw profile="courier" />);
    await userEvent.type(amountField(), "50000", { delay: null });
    await waitFor(() => expect(next()).toBeEnabled());
    await userEvent.click(next());
    expect(screen.getByText("Aucune méthode de paiement")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajouter une méthode" })).toHaveAttribute("href", "/driver/earnings/methods");
    expect(next()).toBeDisabled();
    first.unmount();

    server.methods = failed(new ApiError({ message: "HTTP 500", status: 500 }));
    render(<FinanceWithdraw profile="courier" />);
    await userEvent.type(amountField(), "50000", { delay: null });
    await waitFor(() => expect(next()).toBeEnabled());
    await userEvent.click(next());
    expect(screen.getByText("Méthodes de paiement indisponibles")).toBeInTheDocument();
    expect(screen.queryByText("Aucune méthode de paiement")).toBeNull();
  });

  it("sends centimes, the method and a key, once, and shows what the server recorded", async () => {
    let release: (value: Withdrawal) => void = () => {};
    server.request.mutateAsync.mockImplementation(() => new Promise<Withdrawal>((resolve) => (release = resolve)));
    const confirm = await toReview("agency");

    const review = screen.getByRole("heading", { name: "Vérifiez avant de confirmer" }).parentElement!;
    expect(text(review)).toContain("1 234 567 FCFA");
    expect(text(review)).toContain("12 346 FCFA");
    expect(text(review)).toContain("1 222 221 FCFA");
    expect(text(review)).toContain("+226******56");
    // Nothing is announced before the server answered.
    expect(screen.queryByText("Demande enregistrée")).toBeNull();

    // A double click is one request.
    await userEvent.dblClick(confirm);
    expect(server.request.mutateAsync).toHaveBeenCalledTimes(1);
    const sent = server.request.mutateAsync.mock.calls[0][0];
    expect(sent).toMatchObject({ amount: 123_456_700, methodId: "m1" });
    expect(sent.idempotencyKey).toMatch(/.{10,}/);
    expect(screen.queryByText("Demande enregistrée")).toBeNull();

    release(withdrawal());
    expect(await screen.findByText("Demande enregistrée")).toBeInTheDocument();
    const main = document.body;
    expect(text(main)).toContain("PO-AB12CD34");
    expect(text(main)).toContain("1 222 221 FCFA");
    // Recorded is not paid.
    expect(main.querySelector("[data-status]")).toHaveAttribute("data-status", "pending");
    expect(screen.queryByText("Payé")).toBeNull();
    expect(screen.getByRole("link", { name: "Voir mes demandes" })).toHaveAttribute("href", "/agency/earnings/withdrawals");
  });

  it("shows a refusal as a refusal, and sends again under the same key", async () => {
    server.request.mutateAsync.mockRejectedValueOnce(new ApiError({ message: "SUGU-PAYOUT-DAILY-LIMIT-EXCEEDED: Limite journalière de retrait atteinte. Maximum restant : 0 FCFA.", status: 422 }));
    const confirm = await toReview();
    await userEvent.click(confirm);

    expect(await screen.findByText("Limite journalière de retrait atteinte. Maximum restant : 0 FCFA.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("SUGU-PAYOUT");
    expect(screen.queryByText("Demande enregistrée")).toBeNull();

    server.request.mutateAsync.mockResolvedValueOnce(withdrawal());
    await userEvent.click(screen.getByRole("button", { name: "Confirmer le retrait" }));
    expect(await screen.findByText("Demande enregistrée")).toBeInTheDocument();
    const [first, second] = server.request.mutateAsync.mock.calls.map((call) => call[0].idempotencyKey);
    expect(second).toBe(first);
  });

  it("does not call a lost answer a failure: it looks for the request, and does not send it again", async () => {
    server.request.mutateAsync.mockImplementation(async (request: { idempotencyKey: string }) => {
      throw new WithdrawalOutcomeUnknown(request.idempotencyKey);
    });
    const confirm = await toReview("courier");
    await userEvent.click(confirm);

    expect(await screen.findByText("Nous n'avons pas pu confirmer votre demande.")).toBeInTheDocument();
    expect(screen.queryByText(/a échoué|n'a pas été enregistrée|Aucune demande n'a été enregistrée/i)).toBeNull();
    // The request is not sent a second time from here.
    expect(screen.getByRole("button", { name: "Confirmer le retrait" })).toBeDisabled();

    const key = server.request.mutateAsync.mock.calls[0][0].idempotencyKey;
    server.lookup.mutateAsync.mockResolvedValueOnce(withdrawal({ number: "PO-FOUND001" }));
    await userEvent.click(screen.getByRole("button", { name: "Vérifier l'état de la demande" }));

    expect(server.lookup.mutateAsync).toHaveBeenCalledWith(key);
    expect(await screen.findByText("Demande enregistrée")).toBeInTheDocument();
    expect(text(document.body)).toContain("PO-FOUND001");
    expect(server.request.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("says so when the check finds no request, and lets it be sent again", async () => {
    server.request.mutateAsync.mockImplementationOnce(async (request: { idempotencyKey: string }) => {
      throw new WithdrawalOutcomeUnknown(request.idempotencyKey);
    });
    const confirm = await toReview();
    await userEvent.click(confirm);
    server.lookup.mutateAsync.mockResolvedValueOnce(null);
    await userEvent.click(await screen.findByRole("button", { name: "Vérifier l'état de la demande" }));

    expect(await screen.findByText(/Aucune demande n'a été enregistrée : votre solde n'a pas bougé/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmer le retrait" })).toBeEnabled();
  });

  it("offers no form when the server says a withdrawal cannot be asked", () => {
    server.summary = ok(summaryOf({ withdrawal: { allowed: false, blockedCode: "store_inactive", blockedMessage: "Votre boutique doit être active pour effectuer un retrait." } }));
    render(<FinanceWithdraw profile="vendor" />);
    expect(screen.getByText("Votre boutique doit être active pour effectuer un retrait.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Montant à retirer/)).toBeNull();
  });
});

// ── Requests ────────────────────────────────────────────────

describe("the requests", () => {
  it("shows each request with the state of the server, and a state it does not know as unknown", () => {
    server.withdrawals = ok({
      rows: [withdrawal(), withdrawal({ id: "p2", number: "PO-PAID0001", status: "paid" }), withdrawal({ id: "p3", number: "PO-ODD00001", status: "on_hold_by_bank" })],
      counts: { all: 3, in_progress: 1, paid: 1, closed: 0 },
      page: 1,
      pageSize: 20,
      total: 3,
    });
    render(<FinanceWithdrawals profile="vendor" />);
    const rows = within(screen.getByRole("list", { name: "Demandes de retrait" })).getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("[data-status]")?.getAttribute("data-status"))).toEqual(["pending", "paid", "on_hold_by_bank"]);
    expect(within(rows[0]).getByText("En attente")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Payé")).toBeInTheDocument();
    // Never folded into "En attente".
    expect(within(rows[2]).getByText("Statut inconnu")).toBeInTheDocument();
  });

  it("tells a failure from an empty list", () => {
    server.withdrawals = failed(new ApiError({ message: "HTTP 500", status: 500 }));
    render(<FinanceWithdrawals profile="vendor" />);
    expect(screen.queryByText("Aucune demande de retrait")).toBeNull();
    expect(screen.getByRole("button", { name: /Réessayer/ })).toBeInTheDocument();
  });

  it("says what a refused request did to the money", async () => {
    server.withdrawals = ok({ rows: [withdrawal({ status: "rejected", note: "Le nom du titulaire ne correspond pas." })], counts: { all: 1, in_progress: 0, paid: 0, closed: 1 }, page: 1, pageSize: 20, total: 1 });
    render(<FinanceWithdrawals profile="courier" />);
    await userEvent.click(screen.getByRole("button", { name: /Retrait PO-AB12CD34/ }));
    const sheet = await screen.findByRole("dialog", { name: "Détail du retrait" });
    expect(within(sheet).getByText("La demande a été refusée. Le montant a été restitué à votre solde.")).toBeInTheDocument();
    expect(within(sheet).getByText("Le nom du titulaire ne correspond pas.")).toBeInTheDocument();
  });
});

// ── Methods ─────────────────────────────────────────────────

describe("payout methods", () => {
  const pending = method({ id: "m2", kind: "bank", provider: "coris_bank", label: "Coris Bank", account: "****0501", isDefault: false, payable: false, state: "pending" });

  it("marks a method the server has not verified, and only that one", () => {
    server.methods = ok([method(), pending]);
    render(<FinanceMethods profile="vendor" />);
    const [verified, waiting] = within(screen.getByRole("list", { name: "Méthodes de paiement" })).getAllByRole("listitem");
    expect(within(verified).getByText("Par défaut")).toBeInTheDocument();
    expect(verified.querySelector("[data-status]")).toBeNull();
    expect(waiting.querySelector("[data-status]")).toHaveAttribute("data-status", "pending");
    expect(within(waiting).getByText("En vérification")).toBeInTheDocument();
    expect(text(waiting)).toContain("****0501");
  });

  it("offers to modify a method to a vendor only: the two others have no such route", async () => {
    const vendor = render(<FinanceMethods profile="vendor" />);
    await userEvent.click(screen.getByRole("button", { name: /^Actions pour Orange Money/ }));
    expect(await screen.findByRole("menuitem", { name: "Modifier" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Supprimer" })).toBeInTheDocument();
    // Already the default one.
    expect(screen.queryByRole("menuitem", { name: "Définir par défaut" })).toBeNull();
    vendor.unmount();

    render(<FinanceMethods profile="agency" />);
    await userEvent.click(screen.getByRole("button", { name: /^Actions pour Orange Money/ }));
    expect(await screen.findByRole("menuitem", { name: "Supprimer" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Modifier" })).toBeNull();
  });

  it("tells an outage from having no method", () => {
    server.methods = failed(new ApiError({ message: "HTTP 500", status: 500 }));
    render(<FinanceMethods profile="courier" />);
    expect(screen.getByText("Méthodes de paiement indisponibles")).toBeInTheDocument();
    expect(screen.queryByText("Aucune méthode de paiement")).toBeNull();
    // Nothing is added while the list is unknown.
    expect(screen.queryByRole("button", { name: "Ajouter" })).toBeNull();
  });

  it("checks a number before sending it, then sends what was typed and nothing that verifies it", async () => {
    server.methods = ok([]);
    render(<FinanceMethods profile="courier" />);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    const dialog = await screen.findByRole("dialog", { name: "Ajouter une méthode de paiement" });

    await userEvent.click(within(dialog).getByRole("button", { name: "Ajouter la méthode" }));
    expect(within(dialog).getByText("Choisissez l'opérateur.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Saisissez le numéro au format international/)).toBeInTheDocument();
    expect(within(dialog).getByText("Indiquez le nom du titulaire du compte.")).toBeInTheDocument();
    expect(server.command.mutateAsync).not.toHaveBeenCalled();

    // The operators are the server's.
    const operator = within(dialog).getByLabelText(/Opérateur/);
    expect(within(operator).getAllByRole("option").map((option) => option.textContent)).toEqual(["Choisir un opérateur", "Orange Money", "Moov Money"]);
    await userEvent.selectOptions(operator, "moov_money");
    const phone = within(dialog).getByLabelText(/Numéro mobile money/);
    await userEvent.clear(phone);
    await userEvent.type(phone, "+226 60 11 22 33", { delay: null });
    await userEvent.type(within(dialog).getByLabelText(/Titulaire du compte/), "Moussa Kaboré", { delay: null });
    await userEvent.click(within(dialog).getByRole("button", { name: "Ajouter la méthode" }));

    await waitFor(() => expect(server.command.mutateAsync).toHaveBeenCalledTimes(1));
    expect(server.command.mutateAsync).toHaveBeenCalledWith({ type: "create", draft: { kind: "mobile_money", provider: "moov_money", phone: "+22660112233", holder: "Moussa Kaboré", isDefault: false } });
  });

  it("puts the refusal of the server on the field it is about", async () => {
    server.methods = ok([]);
    server.command.mutateAsync.mockRejectedValueOnce(new ApiError({ message: "Données invalides.", status: 422, errors: { mm_msisdn_e164: ["Le numéro Mobile Money doit être au format international (ex : +22670000000)."] } }));
    render(<FinanceMethods profile="agency" />);
    await userEvent.click(screen.getByRole("button", { name: "Ajouter une méthode" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText(/Opérateur/), "orange_money");
    await userEvent.type(within(dialog).getByLabelText(/Numéro mobile money/), "70123456", { delay: null });
    await userEvent.type(within(dialog).getByLabelText(/Titulaire du compte/), "Agence Ouaga", { delay: null });
    await userEvent.click(within(dialog).getByRole("button", { name: "Ajouter la méthode" }));

    expect(await within(dialog).findByText("Le numéro Mobile Money doit être au format international (ex : +22670000000).")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Numéro mobile money/)).toHaveAttribute("aria-invalid", "true");
    // The form stays open with what was typed.
    expect(within(dialog).getByLabelText(/Titulaire du compte/)).toHaveValue("Agence Ouaga");
  });

  it("asks before deleting, and says what the server refused", async () => {
    const { toast } = await import("sonner");
    server.command.mutateAsync.mockRejectedValueOnce(new ApiError({ message: "Un retrait est en cours sur ce compte. Suppression impossible.", status: 409 }));
    render(<FinanceMethods profile="courier" />);
    await userEvent.click(screen.getByRole("button", { name: /^Actions pour Orange Money/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Supprimer" }));
    expect(server.command.mutateAsync).not.toHaveBeenCalled();

    const confirm = await screen.findByRole("alertdialog");
    await userEvent.click(within(confirm).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(server.command.mutateAsync).toHaveBeenCalledWith({ type: "delete", id: "m1" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Un retrait est en cours sur ce compte. Suppression impossible."));
  });
});
