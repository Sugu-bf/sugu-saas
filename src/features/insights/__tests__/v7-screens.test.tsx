import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/http/api-error";
import type { Client, ClientSheet as Sheet, ClientSummary } from "@/features/vendor/clients/contract";
import type { MarketingBoard } from "@/features/vendor/marketing/contract";
import type { SalesReport } from "@/features/vendor/statistics/contract";
import type { ActivityReport } from "@/features/agency/statistics/contract";

// The V7 screens, with the server played by their hooks: what they show of an
// answer, of a failure and of nothing, and what a filter or a period asks for.

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), params: new URLSearchParams(), pathname: "/vendor/clients" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
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
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
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

type Query<T> = { data: T | undefined; isError: boolean; error: unknown; isFetching: boolean; isPending: boolean; isPlaceholderData: boolean; refetch: () => void };
const ok = <T,>(data: T): Query<T> => ({ data, isError: false, error: null, isFetching: false, isPending: false, isPlaceholderData: false, refetch: vi.fn() });
const failed = <T,>(error: unknown): Query<T> => ({ data: undefined, isError: true, error, isFetching: false, isPending: false, isPlaceholderData: false, refetch: vi.fn() });

const server = vi.hoisted(() => ({
  clients: null as unknown,
  clientsQuery: null as unknown,
  summary: null as unknown,
  sheet: null as unknown,
  board: null as unknown,
  command: { mutate: null as unknown as ReturnType<typeof vi.fn> },
  sales: null as unknown,
  salesRange: null as unknown,
  activity: null as unknown,
  activityPeriod: null as unknown,
}));

vi.mock("@/features/vendor/clients/hooks", () => ({
  useClients: (query: unknown) => ((server.clientsQuery = query), server.clients),
  useClientSummary: () => server.summary,
  useClient: () => server.sheet,
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/features/vendor/marketing/hooks", () => ({
  useMarketing: () => server.board,
  useMarketingCommand: () => ({ mutate: server.command.mutate, mutateAsync: vi.fn(), isPending: false, variables: undefined }),
  usePromotableProducts: () => ({ data: { rows: [], total: 0 }, isPending: false, isError: false }),
}));
vi.mock("@/features/vendor/statistics/hooks", () => ({ useSalesReport: (range: unknown) => ((server.salesRange = range), server.sales) }));
vi.mock("@/features/agency/hooks", () => ({ useAgencyStats: (period: unknown) => ((server.activityPeriod = period), server.activity) }));

const { ClientList } = await import("@/features/vendor/clients/components/list");
const { ClientSheet } = await import("@/features/vendor/clients/components/sheet");
const { MarketingScreen } = await import("@/features/vendor/marketing/components/screen");
const { StatisticsScreen } = await import("@/features/vendor/statistics/components/screen");
const { AgencyStatisticsScreen } = await import("@/features/agency/statistics/screen");

const client = (fields: Partial<Client> = {}): Client => ({
  id: "c1", name: "Awa Traoré", firstName: "Awa", lastName: "Traoré", phone: "+22670123456", email: "awa@example.com", segment: "vip", city: "Ouagadougou",
  orders: 24, spent: 542000, averageBasket: 22583, lastOrderAt: "2026-10-12T10:00:00Z", since: "2024-01-12T00:00:00Z", fromMarketplace: true, ...fields,
});
const summary: ClientSummary = { total: 1248, segments: { vip: 12, loyal: 186, new: 320, active: 500, inactive: 200, prospect: 30 }, cities: ["Ouagadougou", "Bobo-Dioulasso"], rules: { vipSpent: 100000, vipOrders: 5, loyalOrders: 2, newDays: 30, inactiveDays: 90 } };
const pageOf = (rows: Client[], total = rows.length) => ({ rows, page: 1, pageSize: 10, total });

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
  nav.pathname = "/vendor/clients";
  server.command.mutate = vi.fn();
  server.summary = ok(summary);
});

describe("Clients", () => {
  it("affiche les clients et les compteurs de toute la boutique", () => {
    server.clients = ok(pageOf([client(), client({ id: "c2", name: "Moussa Konaté", segment: "loyal", orders: 12, spent: 280000 })], 1248));
    render(<ClientList />);

    const figures = within(screen.getByRole("region", { name: "Vos clients en chiffres" }));
    expect(figures.getByText("1 248")).toBeInTheDocument();
    expect(figures.getByText("320")).toBeInTheDocument();
    expect(figures.getByText("186")).toBeInTheDocument();
    expect(figures.getByText("12")).toBeInTheDocument();
    expect(screen.getAllByText("Awa Traoré").length).toBeGreaterThan(0);
    expect(screen.getAllByText("542 000 FCFA").length).toBeGreaterThan(0);
    // The rules of the segments are the server's, and are stated.
    expect(screen.getByText(/VIP : 100 000 FCFA dépensés ou 5 commandes/)).toBeInTheDocument();
  });

  it("demande au serveur la recherche, le statut, la ville, le tri et la page de l'adresse", () => {
    nav.params = new URLSearchParams("q=awa&statut=inactive&ville=Koudougou&tri=spent&sens=asc&page=3&lignes=25");
    server.clients = ok(pageOf([]));
    render(<ClientList />);

    expect(server.clientsQuery).toEqual({ search: "awa", segment: "inactive", city: "Koudougou", sort: "spent", direction: "asc", page: 3, pageSize: 25 });
  });

  it("n'envoie pas un statut ou un tri que le serveur ne connaît pas", () => {
    nav.params = new URLSearchParams("statut=gold&tri=password");
    server.clients = ok(pageOf([]));
    render(<ClientList />);

    expect(server.clientsQuery).toMatchObject({ segment: "", sort: undefined });
  });

  it("filtre par un indicateur : le statut part dans l'adresse", async () => {
    server.clients = ok(pageOf([client()]));
    render(<ClientList />);

    await userEvent.click(within(screen.getByRole("region", { name: "Vos clients en chiffres" })).getByRole("button", { name: /Clients VIP/ }));
    expect(nav.replace).toHaveBeenCalledWith("/vendor/clients?statut=vip", { scroll: false });
  });

  it("distingue une boutique sans client d'une recherche sans résultat", () => {
    server.clients = ok(pageOf([]));
    const { unmount } = render(<ClientList />);
    expect(screen.getByText("Aucun client pour le moment")).toBeInTheDocument();
    unmount();

    nav.params = new URLSearchParams("q=zzz");
    render(<ClientList />);
    expect(screen.getByText("Aucun client ne correspond")).toBeInTheDocument();
  });

  it("dit l'échec sans montrer de chiffres", () => {
    server.clients = failed(new ApiError({ message: "x", status: 0, code: "NETWORK" }));
    render(<ClientList />);
    expect(screen.getByText("Clients indisponibles")).toBeInTheDocument();
    expect(screen.getByText(/connexion a été interrompue/)).toBeInTheDocument();
  });

  it("ouvre une fiche avec ses commandes, liées à leur détail, et de vrais moyens de contact", () => {
    const sheet: Sheet = { ...client(), deliveredOrders: 20, recentOrders: [{ id: "o1", reference: "SU-2099-00123", amount: 42000, status: "delivered", date: "2026-10-12T10:00:00Z" }] };
    server.sheet = ok(sheet);
    nav.params = new URLSearchParams("statut=vip&client=c1");
    render(<ClientSheet id="c1" />);

    expect(screen.getByRole("heading", { level: 1, name: "Awa Traoré" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour aux clients" })).toHaveAttribute("href", "/vendor/clients?statut=vip");
    expect(screen.getAllByRole("link", { name: /SU-2099-00123/ })[0]).toHaveAttribute("href", "/vendor/orders/o1");
    expect(screen.getByRole("region", { name: "Chiffres du client" })).toHaveTextContent(/542.000.FCFA/);
    expect(screen.getAllByRole("link", { name: "+226 70 12 34 56" })[0]).toHaveAttribute("href", "tel:+22670123456");
    // No messaging of the portal's own, no WhatsApp or SMS button.
    expect(screen.queryByText(/WhatsApp|SMS|Offrir un code/i)).not.toBeInTheDocument();
  });

  it("dit qu'une fiche n'est pas à la boutique plutôt que d'en montrer une autre", () => {
    server.sheet = failed(new ApiError({ message: "Client non trouvé.", status: 404 }));
    render(<ClientSheet id="autre" />);
    expect(screen.getByText("Client introuvable")).toBeInTheDocument();
  });
});

const board = (fields: Partial<MarketingBoard> = {}): MarketingBoard => ({
  summary: {
    coupons: { total: 2, active: 1, scheduled: 0, expired: 1, disabled: 0, exhausted: 0, redemptions: 245, savings: 0 },
    promotions: { total: 1, active: 1, scheduled: 0, expired: 0, disabled: 0, orders: 0, savings: 0 },
    truncated: false,
  },
  couponList: [
    { id: "k1", code: "SUGU10", name: null, type: "percent_off", value: 10, minSubtotal: 10000, usageLimit: 500, perCustomerLimit: 1, redemptions: 245, savings: 0, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-31T23:59:59Z", status: "active", isActive: true, appliedAtCheckout: true },
    { id: "k2", code: "BIENVENUE", name: null, type: "amount_off", value: 5000, minSubtotal: null, usageLimit: null, perCustomerLimit: null, redemptions: 0, savings: 0, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-30T23:59:59Z", status: "expired", isActive: true, appliedAtCheckout: true },
  ],
  promotionList: [
    { id: "p1", name: "Promo", product: { id: "pr1", name: "Baskets Sport", sku: "SKU-001", image: null, status: "active", price: 25000 }, type: "percent_off", value: 20, promoPrice: 20000, discountPercent: 20, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-31T23:59:59Z", status: "active", isActive: true, orders: 0, savings: 0 },
  ],
  ...fields,
});

describe("Marketing", () => {
  beforeEach(() => {
    nav.pathname = "/vendor/marketing";
  });

  it("montre les codes avec leur état réel et leurs montants en francs", () => {
    server.board = ok(board());
    render(<MarketingScreen />);

    expect(screen.getAllByText("SUGU10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("−10 %").length).toBeGreaterThan(0);
    expect(screen.getAllByText("−5 000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Min. 10 000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Expiré").length).toBeGreaterThan(0);
    // No return on investment, no customers "won": only what is counted.
    expect(screen.queryByText(/ROI|clients acquis|augmentation/i)).not.toBeInTheDocument();
  });

  it("désactive un code par une demande au serveur, sans rien afficher d'avance", async () => {
    server.board = ok(board());
    render(<MarketingScreen />);

    await userEvent.click(screen.getAllByRole("button", { name: "Actions pour le code SUGU10" })[0]);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Désactiver" }));

    expect(server.command.mutate).toHaveBeenCalledWith({ type: "toggle-coupon", id: "k1" }, expect.anything());
    expect(screen.getAllByText("Actif").length).toBeGreaterThan(0);
  });

  it("prévient qu'un code de livraison gratuite n'est pas appliqué au paiement", () => {
    const b = board();
    b.couponList[0] = { ...b.couponList[0], code: "FRAISOFF", type: "free_shipping", value: 0, appliedAtCheckout: false };
    server.board = ok(b);
    render(<MarketingScreen />);
    expect(screen.getByText("Le code FRAISOFF n'est pas appliqué au paiement.")).toBeInTheDocument();
  });

  it("montre les promotions de l'onglet de l'adresse, prix du serveur compris", () => {
    nav.params = new URLSearchParams("onglet=promotions");
    server.board = ok(board());
    render(<MarketingScreen />);

    expect(screen.getAllByText("Baskets Sport").length).toBeGreaterThan(0);
    expect(screen.getAllByText("20 000 FCFA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("−20 %").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Créer une promotion" })).toBeInTheDocument();
  });

  it("propose de créer quand il n'y a rien, et dit l'échec", () => {
    server.board = ok(board({ couponList: [], promotionList: [] }));
    const { unmount } = render(<MarketingScreen />);
    expect(screen.getByText("Aucun code promotionnel")).toBeInTheDocument();
    unmount();

    server.board = failed(new ApiError({ message: "x", status: 500 }));
    render(<MarketingScreen />);
    expect(screen.getByText("Marketing indisponible")).toBeInTheDocument();
  });
});

const compared = (value: number, previous = 0, change: number | null = null) => ({ value, previous, change });
const period = { key: "30j", from: "2026-09-13", to: "2026-10-12", days: 30, previousFrom: "2026-08-14", previousTo: "2026-09-12" };

const sales = (fields: Partial<SalesReport> = {}): SalesReport => ({
  period,
  kpis: { revenue: compared(2_450_000, 2_000_000, 22.5), orders: compared(245, 0, null), averageBasket: compared(10000, 9000, 11.1), newCustomers: compared(186, 200, -7), returningCustomers: 40, deliveredOrders: 230, inProgressAmount: 120000, canceledOrders: 3 },
  series: [
    { date: "2026-10-11", orders: 3, revenue: 60000 },
    { date: "2026-10-12", orders: 0, revenue: 0 },
  ],
  topProducts: [{ productId: "pr1", name: "Baskets Sport", sku: "SKU-001", image: null, quantity: 120, revenue: 900000 }],
  categories: [{ name: "Mode", revenue: 1_000_000, percent: 42 }],
  cities: [{ city: "Ouagadougou", orders: 100, percent: 75 }],
  ...fields,
});

describe("Statistiques vendeur", () => {
  beforeEach(() => {
    nav.pathname = "/vendor/statistics";
  });

  it("demande au serveur la période de l'adresse, 30 jours par défaut", () => {
    server.sales = ok(sales());
    const { unmount } = render(<StatisticsScreen />);
    expect(server.salesRange).toEqual({ period: "30j" });
    unmount();

    nav.params = new URLSearchParams("periode=7j");
    render(<StatisticsScreen />);
    expect(server.salesRange).toEqual({ period: "7j" });
  });

  it("change de période par l'adresse : une vraie nouvelle demande", async () => {
    server.sales = ok(sales());
    render(<StatisticsScreen />);

    await userEvent.click(screen.getAllByRole("button", { name: "90 jours" })[0]);
    expect(nav.replace).toHaveBeenCalledWith("/vendor/statistics?periode=90j", { scroll: false });
  });

  it("prend une période choisie, et écarte des dates incohérentes", () => {
    server.sales = ok(sales());
    nav.params = new URLSearchParams("du=2026-10-01&au=2026-10-05");
    const { unmount } = render(<StatisticsScreen />);
    expect(server.salesRange).toEqual({ from: "2026-10-01", to: "2026-10-05" });
    unmount();

    nav.params = new URLSearchParams("du=2026-10-05&au=2026-10-01");
    render(<StatisticsScreen />);
    expect(server.salesRange).toEqual({ period: "30j" });
  });

  it("montre les chiffres du serveur, un taux seulement quand il en donne un", () => {
    server.sales = ok(sales());
    render(<StatisticsScreen />);

    const figures = within(screen.getByRole("region", { name: "Chiffres de la période" }));
    expect(screen.getByRole("region", { name: "Chiffres de la période" })).toHaveTextContent(/2.450.000.FCFA/);
    expect(figures.getByText("+22,5 %")).toBeInTheDocument();
    expect(figures.getByText("−7 %")).toBeInTheDocument();
    // Orders: the period before was empty, so no rate at all.
    expect(figures.queryByText(/\+100/)).not.toBeInTheDocument();
    expect(screen.getByText(/120 000 FCFA de commandes sont encore en cours/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Baskets Sport/ })).toHaveAttribute("href", "/vendor/products/pr1");
  });

  it("n'affiche ni note, ni entonnoir, ni taux de conversion", () => {
    server.sales = ok(sales());
    render(<StatisticsScreen />);
    expect(screen.queryByText(/Note moyenne|4[.,]7|4[.,]5|conversion|entonnoir|Catégorie 1|avis/i)).not.toBeInTheDocument();
  });

  it("dit qu'il n'y a pas de vente plutôt que de dessiner une courbe plate", () => {
    server.sales = ok(sales({ kpis: { revenue: compared(0), orders: compared(0), averageBasket: compared(0), newCustomers: compared(0), returningCustomers: 0, deliveredOrders: 0, inProgressAmount: 0, canceledOrders: 0 }, topProducts: [], categories: [], cities: [] }));
    render(<StatisticsScreen />);

    expect(screen.getByText("Aucune commande sur cette période")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Chiffres de la période" })).getByText("—")).toBeInTheDocument();
  });

  it("dit l'échec", () => {
    server.sales = failed(new ApiError({ message: "x", status: 500 }));
    render(<StatisticsScreen />);
    expect(screen.getByText("Statistiques indisponibles")).toBeInTheDocument();
  });
});

const activity = (fields: Partial<ActivityReport> = {}): ActivityReport => ({
  period,
  kpis: { created: compared(452, 400, 13), delivered: compared(398, 350, 13.7), inProgress: 38, pending: 0, failed: compared(16, 20, -20), successRate: 96.1, averageMinutes: 155, timedDeliveries: 380 },
  series: [{ date: "2026-10-12", created: 12, delivered: 9, failed: 1 }],
  statuses: [
    { key: "delivered", count: 398, percent: 88.1 },
    { key: "in_progress", count: 38, percent: 8.4 },
    { key: "pending", count: 0, percent: 0 },
    { key: "failed", count: 16, percent: 3.5 },
  ],
  couriers: [{ id: "co1", name: "Moussa Kaboré", deliveries: 128, failed: 2, assigned: 131, successRate: 98.5 }],
  failureReasons: [],
  ...fields,
});

describe("Statistiques agence", () => {
  it("demande la période choisie par useAgencyStats(period)", async () => {
    server.activity = ok(activity());
    render(<AgencyStatisticsScreen />);
    expect(server.activityPeriod).toBe("30j");

    await userEvent.click(screen.getAllByRole("button", { name: "7 jours" })[0]);
    expect(server.activityPeriod).toBe("7j");
  });

  it("montre l'activité, sans aucun montant, et un échec en baisse comme une bonne nouvelle", () => {
    server.activity = ok(activity());
    const { container } = render(<AgencyStatisticsScreen />);

    const figures = within(screen.getByRole("region", { name: "Chiffres de la période" }));
    expect(figures.getByText("452")).toBeInTheDocument();
    expect(figures.getByText("398")).toBeInTheDocument();
    expect(figures.getByText("−20 %").closest("span")).toHaveClass("text-success-fg");
    expect(screen.getByText(/Délai moyen entre la collecte et la remise : 2 h 35/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Moussa Kaboré/ })).toHaveAttribute("href", "/agency/drivers/co1");
    expect(container.textContent).not.toMatch(/FCFA|Livreur du mois|Féliciter/);
  });

  it("dit qu'aucun motif n'a été noté plutôt que d'en proposer", () => {
    server.activity = ok(activity());
    render(<AgencyStatisticsScreen />);
    expect(screen.getByText(/Aucun motif n'a été noté pour ces 16 échecs/)).toBeInTheDocument();
    expect(screen.queryByText(/Client absent|Adresse incorrecte|Conseil/)).not.toBeInTheDocument();
  });

  it("ne donne ni taux ni délai quand rien ne les mesure, et dit qu'il n'y a pas de livraison", () => {
    server.activity = ok(activity({ kpis: { created: compared(0), delivered: compared(0), inProgress: 0, pending: 0, failed: compared(0), successRate: null, averageMinutes: null, timedDeliveries: 0 }, couriers: [], statuses: [], series: [] }));
    render(<AgencyStatisticsScreen />);

    expect(screen.getByText("Aucune livraison sur cette période")).toBeInTheDocument();
    expect(screen.getByText(/pas de taux de réussite/)).toBeInTheDocument();
    expect(screen.queryByText(/Délai moyen/)).not.toBeInTheDocument();
  });

  it("dit le refus à qui n'a pas accès à l'agence", () => {
    server.activity = failed(new ApiError({ message: "Accès non autorisé.", status: 403 }));
    render(<AgencyStatisticsScreen />);
    expect(screen.getByText(/n'a pas accès aux statistiques de cette agence/)).toBeInTheDocument();
  });
});
