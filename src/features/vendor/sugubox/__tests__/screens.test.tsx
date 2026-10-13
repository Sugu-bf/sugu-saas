import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/http/api-error";
import type { ExpeditionDetail, Movement, Reception, ReceptionDetail, StockItem, Summary } from "../contract";

// The Sugu Box screens, with the server played by their hooks: what they show
// of an answer, of a failure and of nothing, and what a filter asks for.

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/vendor/sugubox/stock",
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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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

type Query<T> = { data: T | undefined; isError: boolean; error: unknown; isFetching: boolean; isPending: boolean; refetch: () => void };
const ok = <T,>(data: T): Query<T> => ({ data, isError: false, error: null, isFetching: false, isPending: false, refetch: vi.fn() });
const failed = <T,>(error: unknown): Query<T> => ({ data: undefined, isError: true, error, isFetching: false, isPending: false, refetch: vi.fn() });
const loading = <T,>(): Query<T> => ({ data: undefined, isError: false, error: null, isFetching: true, isPending: true, refetch: vi.fn() });

const server = vi.hoisted(() => ({
  summary: null as unknown,
  stock: null as unknown,
  stockQuery: null as unknown,
  receptions: null as unknown,
  receptionsQuery: null as unknown,
  reception: null as unknown,
  expedition: null as unknown,
  movements: null as unknown,
}));

vi.mock("../hooks", async (original) => ({
  ...(await original<typeof import("../hooks")>()),
  useSummary: () => server.summary,
  useBoardFilters: () => ({ data: { warehouses: [{ id: "w1", name: "Sugu Ouaga Centre", code: "OUA" }], users: [{ id: "u1", name: "Aminata S." }], cities: ["Koudougou"] } }),
  useStock: (query: unknown) => ((server.stockQuery = query), server.stock),
  useReceptions: (query: unknown) => ((server.receptionsQuery = query), server.receptions),
  useReception: () => server.reception,
  useExpedition: () => server.expedition,
  useMovements: () => server.movements,
}));

const { SuguBoxOverview } = await import("../components/overview");
const { SuguBoxStock } = await import("../components/stock");
const { SuguBoxReceptions } = await import("../components/receptions");
const { SuguBoxMovements } = await import("../components/movements");
const { SuguBoxReceptionDetail, SuguBoxExpeditionDetail } = await import("../components/details");

const pageOf = <Row,>(rows: Row[], extra: object = {}) => ({ rows, page: 1, pageSize: 25, total: rows.length, ...extra });

const item = (fields: Partial<StockItem> = {}): StockItem => ({
  id: "v1", productId: "p1", name: "Baskets urbaines", variant: "Taille 42", sku: "SKU001", imageUrl: null, fulfilledBySugu: true,
  total: 52, reserved: 12, available: 40, threshold: 10, state: "in_stock", bins: [{ code: "A-01-03", warehouse: "Sugu Ouaga Centre", qty: 52 }],
  lastMovement: { type: "outbound", label: "Sortie", at: "2026-10-03T15:00:00Z" }, ...fields,
});

const reception = (fields: Partial<Reception> = {}): Reception => ({
  id: "r1", reference: "REC-2026-00121", status: "completed", warehouse: { id: "w1", name: "Sugu Ouaga Centre", code: "OUA" },
  expectedAt: "2026-09-22", receivedAt: null, lines: 3, unitsExpected: 152, unitsReceived: 150, createdAt: "2026-09-21T09:00:00Z", ...fields,
});

const movement = (fields: Partial<Movement> = {}): Movement => ({
  id: "m1", type: "transfer", typeLabel: "Transfert", quantity: -10, before: 29, after: 19, bin: "A-01-07", name: "T-shirt essentiel", variant: null, sku: "SKU002",
  imageUrl: null, by: "Fatou D.", reason: "Transfert entre casiers", document: null, at: "2026-10-10T16:00:00Z", ...fields,
});

const noTotals = { inbound: { count: 0, units: 0 }, outbound: { count: 0, units: 0 }, adjustment: { count: 0, units: 0 }, transfer: { count: 0, units: 0 } };

beforeEach(() => {
  nav.replace.mockClear();
  nav.push.mockClear();
  nav.params = new URLSearchParams();
});

describe("overview", () => {
  const summary: Summary = { stockUnits: 371, stockVariants: 8, receivedToday: 12, toPrepare: 2, ordersThisMonth: 7, alerts: 3, receptions: [reception()], expeditions: [], stockAlerts: [item({ state: "out_of_stock", available: 0 })], activity: [movement()] };

  it("shows the figures of the server, each with the list behind it", () => {
    server.summary = ok(summary);
    render(<SuguBoxOverview />);
    const figures = screen.getByRole("region", { name: "Chiffres clés de Sugu Box" });
    for (const value of ["371", "12", "2", "7", "3"]) expect(within(figures).getByText(value)).toBeInTheDocument();
    expect(within(figures).getByRole("link", { name: /Voir les alertes/ })).toHaveAttribute("href", "/vendor/sugubox/stock?etat=alertes");
    expect(within(figures).getByRole("link", { name: /Voir les expéditions/ })).toHaveAttribute("href", "/vendor/sugubox/outbound?statut=a-preparer");
    expect(screen.getByText("Transfert de −10 unités")).toBeInTheDocument();
    // A panel with nothing in it says so; it does not disappear.
    expect(screen.getByText("Aucune expédition")).toBeInTheDocument();
  });

  it("says a failure as a failure, with a retry", async () => {
    const query = failed<Summary>(new ApiError({ message: "Server Error", status: 500 }));
    server.summary = query;
    render(<SuguBoxOverview />);
    expect(screen.getByRole("alert")).toHaveTextContent("Le service Sugu Box ne répond pas");
    expect(screen.queryByText("371")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(query.refetch).toHaveBeenCalled();
  });

  it("tells an account without a store that the space is not theirs", () => {
    server.summary = failed<Summary>(new ApiError({ message: "Forbidden", status: 403 }));
    render(<SuguBoxOverview />);
    expect(screen.getByText("Accès réservé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Réessayer" })).not.toBeInTheDocument();
  });

  it("draws no figure while it loads", () => {
    server.summary = loading<Summary>();
    render(<SuguBoxOverview />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

describe("stock", () => {
  it("reads the filters of the address and asks the server for them", () => {
    nav.params = new URLSearchParams("q=mug&etat=rupture&entrepot=w1&tri=disponible-desc&page=2&lignes=50");
    server.stock = ok(pageOf([item()]));
    render(<SuguBoxStock />);
    expect(server.stockQuery).toEqual({ search: "mug", state: "out_of_stock", warehouseId: "w1", sort: "-available", page: 2, pageSize: 50 });
  });

  it("ignores a filter the address spells wrong, instead of sending it", () => {
    nav.params = new URLSearchParams("etat=perdu&tri=prix&lignes=7");
    server.stock = ok(pageOf([item()]));
    render(<SuguBoxStock />);
    expect(server.stockQuery).toEqual({ search: "", state: undefined, warehouseId: undefined, sort: undefined, page: 1, pageSize: 25 });
  });

  it("writes a chosen filter in the address, back on the first page", async () => {
    nav.params = new URLSearchParams("page=3");
    window.history.replaceState(null, "", "/vendor/sugubox/stock?page=3");
    server.stock = ok(pageOf([item()]));
    render(<SuguBoxStock />);
    await userEvent.selectOptions(screen.getAllByRole("combobox", { name: "Statut du stock" })[0], "Rupture");
    expect(nav.replace).toHaveBeenCalledWith("/vendor/sugubox/stock?etat=rupture", { scroll: false });
  });

  it("shows a state it does not know as unknown, never as in stock", () => {
    server.stock = ok(pageOf([item({ state: "quarantined" })]));
    render(<SuguBoxStock />);
    const table = screen.getByRole("table", { name: "Stock en entrepôt Sugu Box" });
    expect(within(table).getByText("Statut inconnu")).toBeInTheDocument();
    expect(within(table).queryByText("En stock")).not.toBeInTheDocument();
  });

  it("tells an empty warehouse from a search that finds nothing", () => {
    server.stock = ok(pageOf<StockItem>([]));
    const { unmount } = render(<SuguBoxStock />);
    expect(screen.getByText("Aucun stock en entrepôt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter CSV" })).toBeDisabled();
    unmount();

    nav.params = new URLSearchParams("q=zzz");
    render(<SuguBoxStock />);
    expect(screen.getByText("Aucun article ne correspond")).toBeInTheDocument();
  });
});

describe("receptions", () => {
  const counts = { pending: 1, inProgress: 1, completedLast30Days: 2 };

  it("does not ask the server for a range that ends before it starts", () => {
    nav.params = new URLSearchParams("du=2026-10-10&au=2026-10-01&statut=en-controle&tri=prevue");
    server.receptions = ok(pageOf([reception()], { counts }));
    render(<SuguBoxReceptions />);
    expect(server.receptionsQuery).toMatchObject({ status: "in_progress", sort: "expected_at", from: undefined, to: undefined });
    expect(screen.getByText("La date de fin est avant la date de début.")).toBeInTheDocument();
  });

  it("filters by a counter, and offers no action of the warehouse", async () => {
    server.receptions = ok(pageOf([reception()], { counts }));
    window.history.replaceState(null, "", "/vendor/sugubox/inbound");
    render(<SuguBoxReceptions />);
    await userEvent.click(screen.getByRole("button", { name: "En attente" }));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining("statut=en-attente"), { scroll: false });
    expect(screen.queryByRole("button", { name: /Nouvelle réception/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Nouvelle réception/ })).not.toBeInTheDocument();
  });
});

describe("movements", () => {
  it("shows the quantity before and after as read, and a dash outside any bin", () => {
    server.movements = ok(pageOf([movement(), movement({ id: "m2", type: "adjustment", quantity: 3, before: null, after: null, bin: null, by: null, reason: null })], { totals: { ...noTotals, transfer: { count: 2, units: 10 } } }));
    render(<SuguBoxMovements />);
    const table = screen.getByRole("table", { name: "Mouvements de stock" });
    const [first, second] = within(table).getAllByRole("row").slice(1);
    expect(first).toHaveTextContent("−10");
    expect(first).toHaveTextContent("29");
    expect(first).toHaveTextContent("19");
    expect(second).toHaveTextContent("+3");
    expect(within(second).getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("10 articles déplacés")).toBeInTheDocument();
  });

  it("links a movement to the reception or the expedition it comes from", () => {
    server.movements = ok(pageOf([movement({ type: "inbound", quantity: 12, document: { kind: "inbound", id: "r9", reference: "REC-2026-00124" } }), movement({ id: "m2", type: "outbound", document: { kind: "outbound", id: "o9", reference: "EXP-2026-00086" } })], { totals: noTotals }));
    render(<SuguBoxMovements />);
    const table = screen.getByRole("table", { name: "Mouvements de stock" });
    expect(within(table).getByRole("link", { name: "REC-2026-00124" })).toHaveAttribute("href", "/vendor/sugubox/inbound/r9");
    expect(within(table).getByRole("link", { name: "EXP-2026-00086" })).toHaveAttribute("href", "/vendor/sugubox/outbound/o9");
  });
});

describe("the page of a reception", () => {
  const detail = (fields: Partial<ReceptionDetail> = {}): ReceptionDetail => ({
    ...reception(), notes: null, storeName: "Boutique Awa", createdBy: "Koffi B.",
    timeline: { createdAt: "2026-09-21T09:00:00Z", firstReceivedAt: "2026-09-22T10:00:00Z", completedAt: "2026-09-22T10:40:00Z", cancelledAt: null },
    items: [
      { id: "l1", name: "Sac en toile", variant: null, sku: "SKU005", imageUrl: null, expected: 20, received: 18, bin: "C-03-02" },
      { id: "l2", name: "Mug Sugu", variant: null, sku: "SKU006", imageUrl: null, expected: 120, received: 120, bin: "C-03-06" },
    ],
    ...fields,
  });

  it("says a shortfall only once the check is over", () => {
    server.reception = ok(detail());
    const { unmount } = render(<SuguBoxReceptionDetail id="r1" />);
    expect(screen.getAllByText("Écart (−2)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Conforme").length).toBeGreaterThan(0);
    expect(screen.getByText("L'entrepôt n'a laissé aucune note sur cette réception.")).toBeInTheDocument();
    unmount();

    server.reception = ok(detail({ status: "in_progress", timeline: { createdAt: "2026-09-21T09:00:00Z", firstReceivedAt: "2026-09-22T10:00:00Z", completedAt: null, cancelledAt: null } }));
    render(<SuguBoxReceptionDetail id="r1" />);
    expect(screen.queryByText("Écart (−2)")).not.toBeInTheDocument();
    expect(screen.getAllByText("Reçu en partie").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("list", { name: "Étapes de la réception" })).getByText("Contrôle").closest("li")).toHaveTextContent("en cours");
  });

  it("says a reception of another store is not found, and a cancelled one is cancelled", () => {
    server.reception = failed<ReceptionDetail>(new ApiError({ message: "Réception introuvable.", status: 404 }));
    const { unmount } = render(<SuguBoxReceptionDetail id="nope" />);
    expect(screen.getByText("Réception introuvable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour aux réceptions" })).toHaveAttribute("href", "/vendor/sugubox/inbound");
    unmount();

    server.reception = ok(detail({ status: "cancelled" }));
    render(<SuguBoxReceptionDetail id="r1" />);
    expect(screen.getByText("Réception annulée")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Étapes de la réception" })).not.toBeInTheDocument();
  });
});

describe("the page of an expedition", () => {
  const detail = (fields: Partial<ExpeditionDetail> = {}): ExpeditionDetail => ({
    id: "o1", reference: "EXP-2026-00085", status: "packed", warehouse: { id: "w1", name: "Sugu Ouaga Centre", code: "OUA" },
    order: { id: "ord85", number: "SU-2026-004585", placedAt: "2026-10-11T10:54:00Z", customer: "Mamadou Diop" }, destination: { city: "Ouagadougou", zone: "Ouaga 2000" },
    lines: 1, unitsRequested: 2, unitsPicked: 2, thumbnails: [], packedAt: "2026-10-11T17:00:00Z", shippedAt: null, createdAt: "2026-10-11T11:00:00Z",
    recipient: { name: "Mamadou Diop", city: "Ouagadougou", zone: "Ouaga 2000" },
    timeline: { createdAt: "2026-10-11T11:00:00Z", pickingStartedAt: "2026-10-11T15:00:00Z", packedAt: "2026-10-11T17:00:00Z", shippedAt: null, cancelledAt: null },
    items: [{ id: "l1", name: "Mug Sugu", variant: null, sku: "SKU006", imageUrl: null, requested: 2, picked: 2, bin: "C-03-06" }],
    ...fields,
  });

  it("stands at the last step reached, and opens the order it serves", () => {
    server.expedition = ok(detail());
    render(<SuguBoxExpeditionDetail id="o1" />);
    const steps = within(screen.getByRole("list", { name: "Étapes de l'expédition" })).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([expect.stringContaining("fait"), expect.stringContaining("fait"), expect.stringContaining("en cours"), expect.stringContaining("à venir")]);
    expect(screen.getByRole("link", { name: "SU-2026-004585" })).toHaveAttribute("href", "/vendor/orders/ord85");
    expect(screen.queryByRole("button", { name: /Marquer comme expédiée/ })).not.toBeInTheDocument();
  });

  it("says so when an expedition serves no order of the marketplace, or holds a status it does not know", () => {
    server.expedition = ok(detail({ order: null, recipient: null, status: "on_hold" }));
    render(<SuguBoxExpeditionDetail id="o1" />);
    expect(screen.getByText("Cette sortie de stock ne vient pas d'une commande de la marketplace.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voir la commande" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Statut inconnu").length).toBeGreaterThan(0);
    expect(screen.getByText("L'entrepôt n'a pas précisé où en est cette expédition.")).toBeInTheDocument();
  });
});
