import { z } from "zod";

// ============================================================
// Clients — what Laravel answers a seller about the customers of
// the store (`sellers/customers*`, `StoreCustomerDirectory`).
//
// Nothing here is computed: figures, segment, city and counters
// are read as answered. Search, segment, city, sort and page are
// the server's, over every customer of the store.
// Amounts are in francs.
// ============================================================

const int = z.coerce.number().int();
const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

/** `StoreCustomerDirectory::SEGMENTS`, in the order the filter lists them. */
export const SEGMENTS = ["vip", "loyal", "new", "active", "inactive", "prospect"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const CLIENT_SORTS = ["last_order", "spent", "orders", "name"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

const clientSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    firstName: text,
    lastName: text,
    phone: text,
    email: text,
    // Kept as answered: a segment the portal does not know is shown as unknown.
    segment: z.string(),
    city: text,
    ordersCount: int,
    totalSpent: int,
    averageBasket: int,
    lastOrderAt: text,
    since: z.string(),
    source: z.string().catch("manual"),
  })
  .transform((row) => ({
    id: row.id,
    name: row.fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    segment: row.segment,
    city: row.city,
    orders: row.ordersCount,
    spent: row.totalSpent,
    averageBasket: row.averageBasket,
    lastOrderAt: row.lastOrderAt,
    since: row.since,
    /** A buyer of the marketplace, or a customer the seller recorded. */
    fromMarketplace: row.source === "marketplace",
  }));

export type Client = z.infer<typeof clientSchema>;

const listSchema = z.object({
  data: z.array(clientSchema),
  meta: z.object({ current_page: int, per_page: int, total: int }),
});

export interface ClientPage {
  rows: Client[];
  page: number;
  pageSize: number;
  total: number;
}

export function parseClientPage(payload: unknown): ClientPage {
  const { data, meta } = listSchema.parse(payload);
  return { rows: data, page: meta.current_page, pageSize: meta.per_page, total: meta.total };
}

const summarySchema = z.object({
  data: z.object({
    total: int,
    segments: z.record(z.string(), int),
    cities: z.array(z.string()),
    rules: z.object({ vipSpent: int, vipOrders: int, loyalOrders: int, newDays: int, inactiveDays: int }),
  }),
});

export type ClientSummary = z.infer<typeof summarySchema>["data"];

export const parseClientSummary = (payload: unknown): ClientSummary => summarySchema.parse(payload).data;

const orderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  amount: int,
  status: z.string(),
  date: z.string(),
});

export type ClientOrder = z.infer<typeof orderSchema>;

const sheetSchema = z.object({
  data: z.intersection(
    clientSchema,
    z.object({
      stats: z.object({ totalOrders: int, deliveredOrders: int, totalSpent: int, averageBasket: int, lastOrderDate: text }),
      recentOrders: z.array(orderSchema).default([]),
    }),
  ),
});

export type ClientSheet = Client & { deliveredOrders: number; recentOrders: ClientOrder[] };

export function parseClientSheet(payload: unknown): ClientSheet {
  const { stats, recentOrders, ...client } = sheetSchema.parse(payload).data;
  return { ...client, deliveredOrders: stats.deliveredOrders, recentOrders };
}

export const parseCreatedClient = (payload: unknown): Client => z.object({ data: clientSchema }).parse(payload).data;

// ── Creation ────────────────────────────────────────────────

export interface NewClient {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export type NewClientErrors = Partial<Record<keyof NewClient, string>>;

/**
 * What the form can tell before asking the server, which remains the
 * authority (duplicates, format of the number once normalised).
 */
export function checkNewClient(values: NewClient): NewClientErrors {
  const errors: NewClientErrors = {};
  if (values.firstName.trim() === "") errors.firstName = "Indiquez le prénom.";
  if (values.lastName.trim() === "") errors.lastName = "Indiquez le nom.";
  const phone = values.phone.trim();
  const email = values.email.trim();
  if (phone === "" && email === "") errors.phone = "Indiquez un téléphone ou un e-mail.";
  if (phone !== "" && !/^\+?[\d\s().-]{6,20}$/.test(phone)) errors.phone = "Ce numéro n'est pas valide.";
  if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Cette adresse e-mail n'est pas valide.";
  return errors;
}
