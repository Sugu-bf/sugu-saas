import { describe, expect, it } from "vitest";
import { parseDashboardBoard, type BoardTasks, type DashboardBoard } from "../contract";
import { boardState, chartDay, chartDayCompact, currentStep, formatFrancs, orderPill, priorities, productsColumn, stockLeft, storefrontUrl, timeAgo } from "../model";

const NOW = new Date("2026-10-12T16:00:00Z");

const NO_TASKS: BoardTasks = {
  toConfirm: 0,
  toPrepare: 0,
  oldestPendingAt: null,
  outOfStock: 0,
  lowStock: 0,
  unreadConversations: 0,
  unreadMessages: 0,
  ticketsAwaiting: 0,
  ticketId: null,
};

const tasks = (overrides: Partial<BoardTasks>): BoardTasks => ({ ...NO_TASKS, ...overrides });

export function boardPayload(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      store: { id: "st_1", name: "Boutique Tech", slug: "boutique-tech", isPublic: true },
      period: { key: "7j", from: "2026-10-06", to: "2026-10-12", days: 7, previousFrom: "2026-09-29", previousTo: "2026-10-05", timezone: "UTC" },
      kpis: {
        revenue: { value: 245000, previous: 218750, change: 12 },
        orders: { value: 18, previous: 17, change: 5.9 },
        unitsSold: { value: 32, previous: 27, change: 18.5 },
        toPrepare: 5,
      },
      series: [{ date: "2026-10-12", orders: 3, revenue: 60000 }],
      tasks: { ...NO_TASKS, toPrepare: 5, lowStock: 3, unreadMessages: 2, unreadConversations: 1, ticketsAwaiting: 1, ticketId: "tk_1" },
      recentOrders: [{ id: 41, number: "SU-2026-000123", customer: "Aminata Traoré", amount: 25000, status: "confirmed", createdAt: "2026-10-12T14:00:00Z" }],
      topProducts: [{ productId: "p1", name: "Sac à main", sku: null, image: null, quantity: 24, revenue: 240000 }],
      stockWatch: [{ productId: "p2", name: "Robe fleurie", sku: "RB-1", image: null, stock: 0, level: "out_of_stock" }],
      onboarding: { steps: [{ key: "profile", done: true }, { key: "product", done: true }, { key: "delivery", done: false }, { key: "publish", done: true }], completed: 3, total: 4 },
      hasOrders: true,
      generatedAt: "2026-10-12T16:00:00Z",
      ...overrides,
    },
  };
}

describe("parseDashboardBoard", () => {
  it("reads the board as the server answers it, amounts in francs untouched", () => {
    const board = parseDashboardBoard(boardPayload());
    expect(board.kpis.revenue.value).toBe(245000);
    expect(board.recentOrders[0]).toMatchObject({ id: "41", number: "SU-2026-000123", amount: 25000 });
    expect(board.store?.slug).toBe("boutique-tech");
  });

  it("refuses an answer that is not a board (the former dashboard)", () => {
    expect(() => parseDashboardBoard({ success: true, data: { revenues: [], recentOrders: [] } })).toThrow();
  });
});

describe("priorities", () => {
  it("shows nothing when nothing waits", () => {
    expect(priorities(NO_TASKS, NOW)).toEqual([]);
  });

  it("says the orders to prepare and opens the Confirmée tab", () => {
    expect(priorities(tasks({ toPrepare: 5 }), NOW)).toEqual([
      { kind: "orders", title: "5 commandes à préparer", action: "Voir les commandes", href: "/vendor/orders?status=confirmed", tone: "attention" },
    ]);
  });

  it("puts the orders to confirm first, urgent once one waits for a day", () => {
    const fresh = priorities(tasks({ toConfirm: 1, toPrepare: 4, oldestPendingAt: "2026-10-12T10:00:00Z" }), NOW);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toMatchObject({ title: "1 commande à traiter", href: "/vendor/orders?status=pending", tone: "attention" });

    const late = priorities(tasks({ toConfirm: 8, oldestPendingAt: "2026-10-11T15:00:00Z" }), NOW);
    expect(late[0]).toMatchObject({ title: "8 commandes à traiter", tone: "danger" });
  });

  it("says out of stock before low stock, each with the list that holds them", () => {
    expect(priorities(tasks({ outOfStock: 5, lowStock: 2 }), NOW)).toEqual([
      { kind: "stock", title: "5 produits en rupture", action: "Voir le stock", href: "/vendor/inventory?level=out_of_stock", tone: "danger" },
    ]);
    expect(priorities(tasks({ lowStock: 1 }), NOW)[0]).toMatchObject({ title: "1 produit en stock faible", href: "/vendor/products?stock=low_stock" });
  });

  it("counts unread messages, and opens the one ticket that waits", () => {
    const list = priorities(tasks({ unreadMessages: 2, unreadConversations: 1, ticketsAwaiting: 1, ticketId: "tk 1" }), NOW);
    expect(list.map((item) => item.title)).toEqual(["2 messages non lus", "1 ticket à traiter"]);
    expect(list[1].href).toBe("/vendor/tickets?ticket=tk%201");
    expect(priorities(tasks({ ticketsAwaiting: 2 }), NOW)[0]).toMatchObject({ title: "2 tickets en attente", href: "/vendor/tickets" });
  });

  it("keeps the order of the mock-up", () => {
    const list = priorities(tasks({ toPrepare: 5, lowStock: 3, unreadMessages: 2, ticketsAwaiting: 1 }), NOW);
    expect(list.map((item) => item.kind)).toEqual(["orders", "stock", "messages", "tickets"]);
  });
});

describe("boardState", () => {
  it("is new while the store has never had an order", () => {
    expect(boardState({ hasOrders: false, tasks: tasks({ outOfStock: 2 }) }, NOW)).toBe("new");
  });

  it("is alerts when something cannot wait, active otherwise", () => {
    expect(boardState({ hasOrders: true, tasks: tasks({ outOfStock: 1 }) }, NOW)).toBe("alerts");
    expect(boardState({ hasOrders: true, tasks: tasks({ lowStock: 3, toPrepare: 2 }) }, NOW)).toBe("active");
  });
});

describe("productsColumn", () => {
  const board = parseDashboardBoard(boardPayload()) as DashboardBoard;

  it("shows the products to restock when one is out of stock", () => {
    expect(productsColumn({ ...board, tasks: tasks({ outOfStock: 1 }) })).toBe("alerts");
    expect(productsColumn({ ...board, tasks: tasks({ lowStock: 1 }) })).toBe("top");
    expect(productsColumn({ ...board, topProducts: [], tasks: tasks({ lowStock: 1 }) })).toBe("alerts");
  });
});

describe("words and numbers", () => {
  it("writes amounts as the mock-up, never divided", () => {
    expect(formatFrancs(245000).replace(/\s/g, " ")).toBe("245 000 F");
  });

  it("names the status of an order", () => {
    expect(orderPill("confirmed")).toEqual({ label: "À préparer", tone: "warning" });
    expect(orderPill("shipped").label).toBe("En livraison");
    expect(orderPill("delivered").tone).toBe("success");
    expect(orderPill("mystery").label).toBe("Statut inconnu");
  });

  it("says how long ago", () => {
    expect(timeAgo("2026-10-12T15:59:40Z", NOW)).toBe("À l'instant");
    expect(timeAgo("2026-10-12T15:45:00Z", NOW)).toBe("Il y a 15 min");
    expect(timeAgo("2026-10-12T14:00:00Z", NOW)).toBe("Il y a 2 h");
    expect(timeAgo("2026-10-11T10:00:00Z", NOW)).toBe("Il y a 1 j");
  });

  it("says what is left", () => {
    expect(stockLeft(0)).toBe("0 restant");
    expect(stockLeft(1)).toBe("1 restant");
    expect(stockLeft(3)).toBe("3 restants");
  });

  it("names the days of the chart", () => {
    expect(chartDay("2026-10-12", 7)).toBe("Lun 12");
    expect(chartDay("2026-10-12", 30)).toMatch(/^12 oct/);
    expect(chartDayCompact("2026-10-12", 7)).toBe("Lun");
    expect(chartDayCompact("2026-10-12", 30)).toBe("12/10");
  });
});

describe("first steps and storefront", () => {
  it("does now the first step not done", () => {
    expect(currentStep([{ key: "profile", done: true }, { key: "product", done: false }, { key: "delivery", done: false }, { key: "publish", done: false }])).toBe("product");
    expect(currentStep([{ key: "profile", done: true }])).toBeNull();
  });

  it("links the store on the marketplace only when it shows it", () => {
    expect(storefrontUrl("https://sugu.pro/", { id: "1", name: "B", slug: "boutique-tech", isPublic: true })).toBe("https://sugu.pro/store/boutique-tech");
    expect(storefrontUrl("https://sugu.pro", { id: "1", name: "B", slug: "boutique-tech", isPublic: false })).toBeNull();
    expect(storefrontUrl("https://sugu.pro", null)).toBeNull();
  });
});
