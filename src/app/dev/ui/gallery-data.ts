/**
 * Synthetic data for the gallery. Every name, reference and amount is
 * invented; nothing here comes from a real account, and nothing is fetched.
 */

export interface DemoOrder {
  id: string;
  reference: string;
  customer: string;
  city: string;
  /** ISO date. */
  placedAt: string;
  status: string;
  paymentStatus: string;
  /** Seller order totals are returned in francs by the API. */
  totalFrancs: number;
  /** COD fees are returned in centimes by the API. */
  deliveryFeeCents: number;
}

const CUSTOMERS = [
  "Awa Démo",
  "Issouf Exemple",
  "Mariam Test",
  "Boukary Fictif",
  "Salimata Modèle",
  "Adama Essai",
  "Fatoumata Démo",
  "Ousmane Exemple",
];
const CITIES = ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"];
const STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "delivered", "canceled", "returned"];
const PAYMENTS = ["cod_pending", "paid", "partial", "pending", "paid", "paid", "refunded", "hold"];

export const DEMO_ORDERS: DemoOrder[] = Array.from({ length: 57 }, (_, index) => {
  const day = 1 + (index % 28);
  return {
    id: `demo-${index + 1}`,
    reference: `SU-2026-${String(4100 + index).padStart(6, "0")}`,
    customer: CUSTOMERS[index % CUSTOMERS.length],
    city: CITIES[index % CITIES.length],
    placedAt: `2026-09-${String(day).padStart(2, "0")}T${String(8 + (index % 10)).padStart(2, "0")}:30:00Z`,
    status: STATUSES[index % STATUSES.length],
    paymentStatus: PAYMENTS[index % PAYMENTS.length],
    totalFrancs: 2500 + ((index * 7919) % 190) * 500,
    deliveryFeeCents: (1000 + (index % 4) * 500) * 100,
  };
});

export interface DemoQuery {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  sort: { columnId: string; direction: "asc" | "desc" } | null;
}

/**
 * Stands in for the API: filtering, sorting and paging happen here, over the
 * whole dataset — exactly what a real endpoint does. The table only displays
 * the page it is given.
 */
export function queryDemoOrders(query: DemoQuery): { rows: DemoOrder[]; total: number } {
  const needle = query.search.trim().toLowerCase();
  let result = DEMO_ORDERS.filter(
    (order) =>
      (query.status === "" || order.status === query.status) &&
      (needle === "" ||
        order.reference.toLowerCase().includes(needle) ||
        order.customer.toLowerCase().includes(needle)),
  );
  if (query.sort) {
    const { columnId, direction } = query.sort;
    const factor = direction === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (columnId === "total") return (a.totalFrancs - b.totalFrancs) * factor;
      if (columnId === "placedAt") return a.placedAt.localeCompare(b.placedAt) * factor;
      return a.reference.localeCompare(b.reference) * factor;
    });
  }
  const start = (query.page - 1) * query.pageSize;
  return { rows: result.slice(start, start + query.pageSize), total: result.length };
}
