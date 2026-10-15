import type { Tone } from "@/design-system";
import type { BoardStockItem, BoardTasks, DashboardBoard, OnboardingStepKey } from "./contract";

// What the dashboard says, read from the board the server answered. Pure:
// every sentence, link and tone below is tested without a screen.

const UNITS = new Intl.NumberFormat("fr-FR");
/** "245 000": a plain no-break space between thousands, as on the mock-up (the narrow one barely shows in the font). */
const NO_BREAK = String.fromCharCode(0xa0);
const NARROW_NO_BREAK = new RegExp(String.fromCharCode(0x202f), "g");
export const formatUnits = (value: number) => UNITS.format(value).replace(NARROW_NO_BREAK, NO_BREAK);
/** "245 000 F", as on the mock-up. */
export const formatFrancs = (value: number) => `${formatUnits(value)}${NO_BREAK}F`;

const counted = (count: number, one: string, other: string) => `${formatUnits(count)} ${count > 1 ? other : one}`;

// ── Routes ──────────────────────────────────────────────────

export const ROUTES = {
  orders: "/vendor/orders",
  ordersToConfirm: "/vendor/orders?status=pending",
  ordersToPrepare: "/vendor/orders?status=confirmed",
  order: (id: string) => `/vendor/orders/${encodeURIComponent(id)}`,
  products: "/vendor/products",
  newProduct: "/vendor/products/new",
  product: (id: string) => `/vendor/products/${encodeURIComponent(id)}`,
  lowStock: "/vendor/products?stock=low_stock",
  outOfStock: "/vendor/inventory?level=out_of_stock",
  messages: "/vendor/messages",
  tickets: "/vendor/tickets",
  ticket: (id: string) => `/vendor/tickets?ticket=${encodeURIComponent(id)}`,
  statistics: "/vendor/statistics",
  marketing: "/vendor/marketing",
  profile: "/vendor/settings?section=profile",
} as const;

/** The store on the marketplace, when it shows it. */
export function storefrontUrl(marketplace: string, store: DashboardBoard["store"]): string | null {
  if (!store?.isPublic || !store.slug) return null;
  return `${marketplace.replace(/\/+$/, "")}/store/${encodeURIComponent(store.slug)}`;
}

// ── What waits for the seller ───────────────────────────────

export type PriorityKind = "orders" | "stock" | "messages" | "tickets";

export interface Priority {
  kind: PriorityKind;
  /** "5 commandes à préparer". */
  title: string;
  /** "Voir les commandes". */
  action: string;
  href: string;
  /** `danger`: it cannot wait (an order unconfirmed for a day, a product out of stock). */
  tone: "danger" | "attention";
}

/** An order waits for its confirmation for a day: the buyer is waiting too. */
export const LATE_CONFIRMATION_HOURS = 24;

/**
 * The cards of "À faire maintenant", only those with something to do, in
 * the order of the mock-up. Each count is the one of the page it opens.
 */
export function priorities(tasks: BoardTasks, now: Date = new Date()): Priority[] {
  const list: Priority[] = [];

  if (tasks.toConfirm > 0) {
    const oldest = tasks.oldestPendingAt ? new Date(tasks.oldestPendingAt).getTime() : NaN;
    const late = Number.isFinite(oldest) && now.getTime() - oldest >= LATE_CONFIRMATION_HOURS * 3_600_000;
    list.push({ kind: "orders", title: `${counted(tasks.toConfirm, "commande", "commandes")} à traiter`, action: "Voir les commandes", href: ROUTES.ordersToConfirm, tone: late ? "danger" : "attention" });
  } else if (tasks.toPrepare > 0) {
    list.push({ kind: "orders", title: `${counted(tasks.toPrepare, "commande", "commandes")} à préparer`, action: "Voir les commandes", href: ROUTES.ordersToPrepare, tone: "attention" });
  }

  if (tasks.outOfStock > 0) {
    list.push({ kind: "stock", title: `${counted(tasks.outOfStock, "produit", "produits")} en rupture`, action: "Voir le stock", href: ROUTES.outOfStock, tone: "danger" });
  } else if (tasks.lowStock > 0) {
    list.push({ kind: "stock", title: `${counted(tasks.lowStock, "produit", "produits")} en stock faible`, action: "Voir le catalogue", href: ROUTES.lowStock, tone: "attention" });
  }

  if (tasks.unreadMessages > 0) {
    list.push({ kind: "messages", title: `${counted(tasks.unreadMessages, "message non lu", "messages non lus")}`, action: "Voir les messages", href: ROUTES.messages, tone: "attention" });
  }

  if (tasks.ticketsAwaiting > 0) {
    list.push({
      kind: "tickets",
      title: tasks.ticketsAwaiting > 1 ? `${formatUnits(tasks.ticketsAwaiting)} tickets en attente` : "1 ticket à traiter",
      action: "Voir le support",
      href: tasks.ticketId ? ROUTES.ticket(tasks.ticketId) : ROUTES.tickets,
      tone: "attention",
    });
  }

  return list;
}

// ── The state of the page ───────────────────────────────────

export type BoardState = "new" | "alerts" | "active";

/**
 * - `new`: the store has never received an order; the page guides its first steps.
 * - `alerts`: something cannot wait (a late order, a product out of stock).
 * - `active`: the store sells, nothing is urgent.
 */
export function boardState(board: Pick<DashboardBoard, "hasOrders" | "tasks">, now: Date = new Date()): BoardState {
  if (!board.hasOrders) return "new";
  return priorities(board.tasks, now).some((item) => item.tone === "danger") ? "alerts" : "active";
}

export const SUBTITLES: Record<BoardState, string> = {
  new: "Vous êtes prêt à commencer à vendre. Voici les prochaines étapes.",
  alerts: "Plusieurs éléments nécessitent votre attention.",
  active: "Voici l'essentiel de votre activité commerciale.",
};

/** The middle column: the products to restock when one is out, else what sold best. */
export function productsColumn(board: Pick<DashboardBoard, "topProducts" | "stockWatch" | "tasks">): "alerts" | "top" {
  if (board.tasks.outOfStock > 0 && board.stockWatch.length > 0) return "alerts";
  if (board.topProducts.length === 0 && board.stockWatch.length > 0) return "alerts";
  return "top";
}

// ── Orders ──────────────────────────────────────────────────

/** The status of a recent order, in the words of the mock-up. */
export const ORDER_PILLS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "À confirmer", tone: "warning" },
  awaiting_payment: { label: "Paiement attendu", tone: "warning" },
  confirmed: { label: "À préparer", tone: "warning" },
  processing: { label: "En préparation", tone: "info" },
  packed: { label: "Emballée", tone: "info" },
  shipped: { label: "En livraison", tone: "info" },
  delivered: { label: "Livrée", tone: "success" },
  canceled: { label: "Annulée", tone: "neutral" },
  cancelled: { label: "Annulée", tone: "neutral" },
  returned: { label: "Retournée", tone: "neutral" },
  failed: { label: "Échouée", tone: "danger" },
};

export const orderPill = (status: string) => ORDER_PILLS[status] ?? { label: "Statut inconnu", tone: "neutral" as Tone };

/** "À l'instant", "Il y a 5 min", "Il y a 2 h", "Il y a 3 j", then the date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.floor((now.getTime() - then) / 60_000));
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(then));
}

// ── Stock ───────────────────────────────────────────────────

export const stockPill = (item: Pick<BoardStockItem, "level">) =>
  item.level === "out_of_stock" ? { label: "Rupture de stock", tone: "danger" as Tone } : { label: "Stock faible", tone: "warning" as Tone };

export const stockLeft = (stock: number) => (stock <= 0 ? "0 restant" : counted(stock, "restant", "restants"));

// ── Sales chart ─────────────────────────────────────────────

export type ChartMetric = "revenue" | "orders";

const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const MONTH_DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** "Lun 12" for a week, "12 oct." beyond. */
export function chartDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  if (days > 7) return MONTH_DAY.format(date);
  const weekday = WEEKDAY.format(date).replace(".", "");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getUTCDate()}`;
}

// ── First steps ─────────────────────────────────────────────

export interface StepDefinition {
  label: string;
  action: string;
  href: string;
}

export const STEP_DEFINITIONS: Record<Exclude<OnboardingStepKey, "publish">, StepDefinition> = {
  profile: { label: "Compléter votre profil de boutique", action: "Compléter", href: ROUTES.profile },
  product: { label: "Ajouter votre premier produit", action: "Ajouter un produit", href: ROUTES.newProduct },
  delivery: { label: "Définir vos informations de livraison", action: "Configurer", href: ROUTES.profile },
};

export const PUBLISH_STEP_LABEL = "Consulter votre boutique publique";

/** The step to do now: the first one not done. */
export const currentStep = (steps: DashboardBoard["onboarding"]["steps"]) => steps.find((step) => !step.done)?.key ?? null;
