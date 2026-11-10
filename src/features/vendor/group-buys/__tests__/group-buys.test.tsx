import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "@/tests/mocks/server";

// Achat groupé, with Laravel played by MSW behind the real HTTP client and
// its relay (/api/proxy/*): what the seller sees of an answer, what a switch
// sends, what is said when a list is empty, and a countdown measured with the
// server's clock.

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/group-buys",
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({ default: () => null }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1", NEXT_PUBLIC_MARKETPLACE_URL: "https://sugu.pro" } }));
vi.mock("@/features/auth/service", () => ({ logout: vi.fn(async () => undefined) }));

const { GroupBuyingSection } = await import("@/features/vendor/settings/group-buying-section");
const { GroupBuysScreen } = await import("../components/screen");
const { TiersEditor } = await import("@/features/vendor/catalog/form/variants-field");
const { formatRemaining, parseGroupBuyPage, serverNowAt } = await import("../contract");

const API = "*/api/proxy/sellers";

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// ── What Laravel answers ────────────────────────────────────

const SERVER_NOW = "2026-11-06T10:00:00+00:00";
/** An instant `minutes` after the server's "now". */
const at = (minutes: number, now = SERVER_NOW) => new Date(Date.parse(now) + minutes * 60_000).toISOString();

const store = (fields: Record<string, unknown> = {}) => ({ id: "s1", name: "Boutique Awa", enabled: true, shared_moq: true, products_with_tiers: 3, ...fields });

/** A group as `SellerGroupBuyController::index` answers it. Amounts in centimes. */
const group = (fields: Record<string, unknown> = {}) => ({
  code: "GB7K2Q9M",
  status: "open",
  reserved_qty: 12,
  members_count: 5,
  max_qty: 200,
  current_unit_price: 170_000,
  current_tier_min_qty: 10,
  saving_percent: 5,
  next_tier: { min_qty: 20, unit_price: 150_000, missing_qty: 8, saving_percent: 16 },
  closes_at: at(150),
  order_deadline_at: null,
  server_now: SERVER_NOW,
  delivery_mode: "individual",
  visibility: "public",
  currency: "XOF",
  base_unit_price: 180_000,
  best_unit_price: 150_000,
  tiers: [
    { min_qty: 10, unit_price: 170_000, saving_percent: 5, reached: true },
    { min_qty: 20, unit_price: 150_000, saving_percent: 16, reached: false },
  ],
  product: { id: "p1", name: "Sac de riz parfumé 25 kg", slug: "sac-de-riz", image_url: null },
  variant_id: "v1",
  store: { name: "Boutique Awa", slug: "boutique-awa" },
  initiator_name: "Awa T.",
  city: "Ouagadougou",
  share_url: "https://sugu.pro/groupe/GB7K2Q9M",
  opens_at: at(-24 * 60),
  ordered_count: 0,
  locked_unit_price: null,
  ...fields,
});

const locked = group({
  code: "GBLOCK42",
  status: "locked",
  reserved_qty: 24,
  members_count: 6,
  current_unit_price: 150_000,
  current_tier_min_qty: 20,
  saving_percent: 16,
  next_tier: null,
  closes_at: at(-60),
  order_deadline_at: at(5 * 60 + 10),
  ordered_count: 2,
  locked_unit_price: 150_000,
  product: { id: "p2", name: "Huile d'arachide 5 L", slug: "huile", image_url: null },
  share_url: "https://sugu.pro/groupe/GBLOCK42",
});

const SUMMARY = { groups_started: 14, groups_locked: 9, running: 2, orders: 31, units: 412, revenue: 61_800_000 };

const page = (items: unknown[], hasMore = false, serverNow = SERVER_NOW) => ({ success: true, data: { items, has_more: hasMore }, server_now: serverNow });

/** The three reads of the page; `lists` answers each list and page asked. */
function serve({ stores = [store()], lists = () => page([]) }: { stores?: ReturnType<typeof store>[]; lists?: (status: string, pageNumber: number) => ReturnType<typeof page> } = {}) {
  const asked: Array<{ status: string; page: number }> = [];
  server.use(
    http.get(`${API}/group-buying/settings`, () => HttpResponse.json({ success: true, data: { stores } })),
    http.get(`${API}/group-buys/summary`, () => HttpResponse.json({ success: true, data: SUMMARY })),
    http.get(`${API}/group-buys`, ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get("status") ?? "";
      const number = Number(url.searchParams.get("page"));
      asked.push({ status, page: number });
      return HttpResponse.json(lists(status, number));
    }),
  );
  return asked;
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
});

// ── The page ────────────────────────────────────────────────

describe("Achats groupés : la page", () => {
  it("montre les chiffres des 30 jours et les groupes en cours tels que le serveur les compte", async () => {
    serve({ lists: () => page([group(), locked]) });
    wrap(<GroupBuysScreen />);

    const rice = await screen.findByRole("article", { name: "Sac de riz parfumé 25 kg" });
    const band = screen.getByRole("region", { name: "Ces 30 derniers jours" });
    const figures = within(band);
    expect(await figures.findByText("14")).toBeInTheDocument();
    expect(figures.getByText("9")).toBeInTheDocument();
    expect(figures.getByText("31")).toBeInTheDocument();
    expect(figures.getByText("412")).toBeInTheDocument();
    // Centimes, said in francs.
    expect(band).toHaveTextContent(/618.000.FCFA/);
    expect(screen.getByRole("tab", { name: /En cours/ })).toHaveTextContent("2");

    const card = within(rice);
    expect(card.getByText("En cours")).toBeInTheDocument();
    expect(card.getByText("Lancé par Awa T. le 5 nov. 2026 · Ouagadougou")).toBeInTheDocument();
    const gauge = card.getByRole("progressbar", { name: "Quantité réservée" });
    expect(gauge).toHaveAttribute("aria-valuenow", "12");
    expect(gauge).toHaveAttribute("aria-valuemax", "20");
    expect(card.getByText("Prochain palier : 20")).toBeInTheDocument();
    expect(card.getByText("Encore 8 unités pour passer à 1 500 FCFA l'unité.")).toBeInTheDocument();
    expect(card.getByText("5")).toBeInTheDocument();
    expect(card.getByText("Après la clôture")).toBeInTheDocument();
    expect(card.getByText("1 700 FCFA")).toBeInTheDocument();
    expect(card.getByText("−5 % (au lieu de 1 800 FCFA)")).toBeInTheDocument();
    expect(card.getByText("2 h 30 min")).toBeInTheDocument();
    const link = card.getByRole("link", { name: /Voir la page du groupe/ });
    expect(link).toHaveAttribute("href", "https://sugu.pro/groupe/GB7K2Q9M");
    expect(link).toHaveAttribute("target", "_blank");

    const oil = within(screen.getByRole("article", { name: "Huile d'arachide 5 L" }));
    expect(oil.getAllByText("Prix obtenu")).toHaveLength(2);
    expect(oil.getByText("1 500 FCFA")).toBeInTheDocument();
    expect(oil.getByText("2 sur 6")).toBeInTheDocument();
    expect(oil.getByText("Palier de 20 unités atteint.")).toBeInTheDocument();
    expect(oil.getByText("Fin des commandes dans")).toBeInTheDocument();
    expect(oil.getByText("5 h 10 min")).toBeInTheDocument();
  });

  it("mesure le temps restant avec l'heure du serveur, pas celle de l'appareil", async () => {
    // A server far from the device's clock: only its own "now" gives 45 minutes.
    const now = "2031-03-01T08:00:00+00:00";
    serve({ lists: () => page([group({ closes_at: at(45, now) })], false, now) });
    wrap(<GroupBuysScreen />);

    const card = within(await screen.findByRole("article", { name: "Sac de riz parfumé 25 kg" }));
    expect(card.getByText("Clôture dans")).toBeInTheDocument();
    expect(card.getByText("45 min")).toBeInTheDocument();
  });

  it("ouvre l'onglet Terminés de l'adresse, et y mène par l'adresse", async () => {
    nav.params = new URLSearchParams("onglet=termines");
    const asked = serve({ lists: (status) => page(status === "past" ? [group({ code: "GBFAIL01", status: "failed", next_tier: null, current_tier_min_qty: null, current_unit_price: 180_000, saving_percent: 0, reserved_qty: 7, closes_at: at(-120) })] : []) });
    const { unmount } = wrap(<GroupBuysScreen />);

    const card = within(await screen.findByRole("article", { name: "Sac de riz parfumé 25 kg" }));
    expect(asked).toEqual([{ status: "past", page: 1 }]);
    expect(screen.getByRole("tab", { name: "Terminés" })).toHaveAttribute("aria-selected", "true");
    expect(card.getByText("Non atteint", { selector: "span" })).toBeInTheDocument();
    expect(card.getByText("Aucun palier atteint.")).toBeInTheDocument();
    expect(card.getByText("Premier palier : 10")).toBeInTheDocument();
    expect(card.getByText("Prix normal : 1 800 FCFA")).toBeInTheDocument();
    expect(card.getByText("Clos le")).toBeInTheDocument();
    unmount();

    nav.params = new URLSearchParams();
    serve();
    wrap(<GroupBuysScreen />);
    await userEvent.click(screen.getByRole("tab", { name: "Terminés" }));
    expect(nav.replace).toHaveBeenCalledWith("/vendor/group-buys?onglet=termines", { scroll: false });
  });

  it("charge les groupes suivants à la demande", async () => {
    const asked = serve({
      lists: (_status, number) => (number === 1 ? page([group()], true) : page([locked], false)),
    });
    wrap(<GroupBuysScreen />);

    await screen.findByRole("article", { name: "Sac de riz parfumé 25 kg" });
    expect(screen.queryByRole("article", { name: "Huile d'arachide 5 L" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Afficher plus de groupes" }));
    expect(await screen.findByRole("article", { name: "Huile d'arachide 5 L" })).toBeInTheDocument();
    expect(asked).toEqual([
      { status: "running", page: 1 },
      { status: "running", page: 2 },
    ]);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Afficher plus de groupes" })).not.toBeInTheDocument();
  });

  it("dit pourquoi la liste est vide, et ce qui la remplirait", async () => {
    serve();
    const first = wrap(<GroupBuysScreen />);
    expect(await screen.findByText("Aucun groupe en cours")).toBeInTheDocument();
    expect(screen.getByText(/Un client lance un groupe depuis la fiche d'un produit/)).toBeInTheDocument();
    expect(screen.queryByText("L'achat groupé est désactivé")).not.toBeInTheDocument();
    first.unmount();

    // Turned on, but no product has a price per quantity.
    serve({ stores: [store({ products_with_tiers: 0 })] });
    const second = wrap(<GroupBuysScreen />);
    expect(await screen.findByText("Ajoutez des prix par quantité à vos produits pour qu'ils puissent être achetés en groupe.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir mes produits" })).toHaveAttribute("href", "/vendor/products");
    second.unmount();

    // Turned off: the banner says so and leads to the setting.
    serve({ stores: [store({ enabled: false })] });
    wrap(<GroupBuysScreen />);
    expect(await screen.findByText("L'achat groupé est désactivé")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activer l'achat groupé" })).toHaveAttribute("href", "/vendor/settings?section=group-buying");
    expect(await screen.findByText(/vos clients ne peuvent pas encore se regrouper/)).toBeInTheDocument();
  });

  it("dit l'échec d'une liste au lieu de la montrer vide", async () => {
    serve();
    server.use(http.get(`${API}/group-buys`, () => HttpResponse.json({ message: "Forbidden" }, { status: 403 })));
    wrap(<GroupBuysScreen />);

    expect(await screen.findByText("Groupes indisponibles")).toBeInTheDocument();
    expect(screen.getByText("Votre compte n'a pas accès aux achats groupés.")).toBeInTheDocument();
    expect(screen.queryByText("Aucun groupe en cours")).not.toBeInTheDocument();
  });
});

// ── The setting ─────────────────────────────────────────────

/** The setting, kept by the "server" as Laravel would; every PUT body is recorded. */
function serveSetting(initial: Record<string, unknown>, refuse?: { status: number; message: string }) {
  let current = store(initial);
  const sent: unknown[] = [];
  server.use(
    http.get(`${API}/group-buying/settings`, () => HttpResponse.json({ success: true, data: { stores: [current] } })),
    http.put(`${API}/group-buying/settings`, async ({ request }) => {
      const body = (await request.json()) as { store_id: string; enabled: boolean; shared_moq: boolean };
      sent.push(body);
      if (refuse) return HttpResponse.json({ success: false, message: refuse.message, errors: {} }, { status: refuse.status });
      current = { ...current, enabled: body.enabled, shared_moq: body.shared_moq };
      return HttpResponse.json({
        success: true,
        message: body.enabled
          ? "L’achat groupé est activé pour cette boutique."
          : "L’achat groupé est désactivé : les groupes en cours seront arrêtés sans frais pour les acheteurs.",
        data: { id: current.id, enabled: current.enabled, shared_moq: current.shared_moq },
      });
    }),
  );
  return sent;
}

describe("Achat groupé : le réglage de la boutique", () => {
  it("montre chaque boutique, ses deux options et ses produits à prix par quantité", async () => {
    serveSetting({ enabled: false });
    wrap(<GroupBuyingSection />);

    const shop = within(await screen.findByRole("group", { name: "Boutique Awa" }));
    expect(shop.getByRole("switch", { name: "Autoriser l'achat groupé" })).toHaveAttribute("aria-checked", "false");
    // The shared minimum only means something once group buying is on.
    expect(shop.getByRole("switch", { name: "Minimum de commande partagé" })).toBeDisabled();
    expect(shop.getByText("Activez d'abord l'achat groupé.")).toBeInTheDocument();
    expect(shop.getByText("3 produits ont des prix par quantité : ils peuvent être achetés en groupe.")).toBeInTheDocument();
    expect(screen.getByText("Comment ça marche")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les groupes" })).toHaveAttribute("href", "/vendor/group-buys");
  });

  it("active l'option par le serveur et reprend sa phrase", async () => {
    const sent = serveSetting({ enabled: false, shared_moq: false });
    wrap(<GroupBuyingSection />);

    const toggle = await screen.findByRole("switch", { name: "Autoriser l'achat groupé" });
    await userEvent.click(toggle);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("L’achat groupé est activé pour cette boutique."));
    expect(sent).toEqual([{ store_id: "s1", enabled: true, shared_moq: false }]);
    await waitFor(() => expect(screen.getByRole("switch", { name: "Autoriser l'achat groupé" })).toHaveAttribute("aria-checked", "true"));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Minimum de commande partagé" })).toBeEnabled());
  });

  it("demande confirmation avant de désactiver, puis arrête les groupes par le serveur", async () => {
    const sent = serveSetting();
    wrap(<GroupBuyingSection />);

    await userEvent.click(await screen.findByRole("switch", { name: "Autoriser l'achat groupé" }));
    let dialog = await screen.findByRole("alertdialog", { name: "Désactiver l'achat groupé ?" });
    expect(dialog).toHaveTextContent("Les groupes encore ouverts sur les produits de Boutique Awa seront arrêtés, sans frais pour les acheteurs");
    await userEvent.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(sent).toEqual([]);

    await userEvent.click(screen.getByRole("switch", { name: "Autoriser l'achat groupé" }));
    dialog = await screen.findByRole("alertdialog", { name: "Désactiver l'achat groupé ?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Désactiver" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("L’achat groupé est désactivé : les groupes en cours seront arrêtés sans frais pour les acheteurs."));
    // The shared minimum is kept as it was.
    expect(sent).toEqual([{ store_id: "s1", enabled: false, shared_moq: true }]);
    await waitFor(() => expect(screen.getByRole("switch", { name: "Autoriser l'achat groupé" })).toHaveAttribute("aria-checked", "false"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("change le minimum partagé seul, l'option restant active", async () => {
    const sent = serveSetting({ enabled: true, shared_moq: false });
    wrap(<GroupBuyingSection />);

    await userEvent.click(await screen.findByRole("switch", { name: "Minimum de commande partagé" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Le minimum de commande partagé est activé."));
    expect(sent).toEqual([{ store_id: "s1", enabled: true, shared_moq: true }]);
    await waitFor(() => expect(screen.getByRole("switch", { name: "Minimum de commande partagé" })).toHaveAttribute("aria-checked", "true"));
  });

  it("dit le refus du serveur et laisse l'interrupteur comme il était", async () => {
    serveSetting({ enabled: false }, { status: 422, message: "Cette boutique ne vous appartient pas." });
    wrap(<GroupBuyingSection />);

    await userEvent.click(await screen.findByRole("switch", { name: "Autoriser l'achat groupé" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Cette boutique ne vous appartient pas."));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Autoriser l'achat groupé" })).toHaveAttribute("aria-checked", "false");
  });

  it("mène aux produits quand aucun n'a de prix par quantité", async () => {
    serveSetting({ products_with_tiers: 0 });
    wrap(<GroupBuyingSection />);

    const shop = within(await screen.findByRole("group", { name: "Boutique Awa" }));
    expect(shop.getByText("Aucun produit n'a de prix par quantité")).toBeInTheDocument();
    expect(shop.getByText("Ajoutez des prix par quantité à vos produits pour qu'ils puissent être achetés en groupe.")).toBeInTheDocument();
    expect(shop.getByRole("link", { name: "Voir mes produits" })).toHaveAttribute("href", "/vendor/products");
  });
});

// ── Reading and counting ────────────────────────────────────

describe("Achat groupé : lecture et compte à rebours", () => {
  it("compte le temps restant à la minute supérieure, et rien une fois l'échéance passée", () => {
    expect(formatRemaining(30_000)).toBe("1 min");
    expect(formatRemaining(45 * 60_000)).toBe("45 min");
    expect(formatRemaining(60 * 60_000)).toBe("1 h");
    expect(formatRemaining(150 * 60_000 - 5_000)).toBe("2 h 30 min");
    expect(formatRemaining((24 + 4) * 60 * 60_000)).toBe("1 jour 4 h");
    expect(formatRemaining(3 * 24 * 60 * 60_000)).toBe("3 jours");
    expect(formatRemaining(0)).toBeNull();
    expect(formatRemaining(-1)).toBeNull();
  });

  it("garde les montants en centimes, l'heure du serveur, et n'offre qu'un lien web", () => {
    // A device 90 seconds behind the server.
    const received = Date.parse(SERVER_NOW) - 90_000;
    const parsed = parseGroupBuyPage(page([group({ share_url: "javascript:alert(1)" })], true), received);
    expect(parsed.clock).toEqual({ serverNow: Date.parse(SERVER_NOW), receivedAt: received });
    // Time gone on the device is time gone on the server; a reading older than the answer counts as none.
    expect(serverNowAt(parsed.clock, received + 30_000)).toBe(Date.parse(SERVER_NOW) + 30_000);
    expect(serverNowAt(parsed.clock, received - 5_000)).toBe(Date.parse(SERVER_NOW));
    expect(parsed.hasMore).toBe(true);
    expect(parsed.items[0]).toMatchObject({ currentUnitPrice: 170_000, baseUnitPrice: 180_000, nextTier: { minQty: 20, unitPrice: 150_000, missingQty: 8 }, shareUrl: null, grouped: false });
  });

  it("rappelle sous les paliers du formulaire produit qu'ils servent aussi à l'achat groupé", () => {
    render(<TiersEditor tiers={[]} onChange={vi.fn()} legend="Prix par quantité du produit" />);
    expect(screen.getByText("Vos prix par quantité permettent aussi à des clients de se regrouper pour les atteindre (achat groupé).")).toBeInTheDocument();
  });
});
