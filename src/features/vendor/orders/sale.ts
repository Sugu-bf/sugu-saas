import { z } from "zod";
import { asFrancs, type MoneyFrancs } from "@/design-system";
import { api } from "@/lib/http/client";

// ============================================================
// Manual sale — contract with `POST sellers/sales` (Laravel:
// SellerSaleController, StoreSaleRequest, SaleService).
//
// Units: the request and the catalogue prices are in FRANCS. The
// server multiplies by 100 itself to store centimes. Nothing here
// converts.
//
// What the server does with a sale:
//  - `pickup`   → order created as delivered, payment recorded as collected;
//  - `shipping` → order created as confirmed, payment due on delivery,
//                 a shipment opened for the chosen agency.
// It checks that subtotal = Σ lines and total = subtotal − discount.
// ============================================================

// ── Catalogue, customers, agencies ──────────────────────────

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  sku: z.string().nullish(),
  price: z.number().finite().nonnegative(),
  stock: z.number().int(),
  imageUrl: z.string().nullish(),
});

export interface SaleProduct {
  id: string;
  name: string;
  sku: string | null;
  priceFrancs: MoneyFrancs;
  stock: number;
  imageUrl: string | null;
}

/** Products of the seller's stores matching a text, out-of-stock ones included. */
export async function searchSaleProducts(query: string): Promise<SaleProduct[]> {
  const response = await api.get<{ data: unknown[] }>("sellers/sales/products/search", {
    params: { q: query, include_out_of_stock: true },
  });
  return z
    .array(productSchema)
    .parse(response.data ?? [])
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku || null,
      priceFrancs: asFrancs(product.price),
      stock: product.stock,
      imageUrl: product.imageUrl || null,
    }));
}

const customerSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
});

export interface SaleCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export async function searchSaleCustomers(query: string): Promise<SaleCustomer[]> {
  const response = await api.get<{ data: unknown[] }>("sellers/customers", {
    params: { search: query, limit: 10 },
  });
  return z
    .array(customerSchema)
    .parse(response.data ?? [])
    .map((customer) => ({
      id: customer.id,
      name: customer.fullName?.trim() || "Client sans nom",
      phone: customer.phone || null,
      email: customer.email || null,
    }));
}

const agencySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().nullish(),
  code: z.string().nullish(),
  isActive: z.boolean().optional(),
});

export interface SaleAgency {
  id: string;
  name: string;
}

/**
 * Agencies a manual sale can be handed to: `GET agencies` (active delivery
 * partners). The id is what `delivery.provider` expects. The listing carries
 * neither delivery modes nor prices, so none is shown.
 * Errors are thrown: an outage must not read as "no agency".
 */
export async function fetchSaleAgencies(): Promise<SaleAgency[]> {
  const response = await api.get<{ data: { partners: unknown[] } }>("agencies", {
    params: { is_active: 1, per_page: 100 },
  });
  return z
    .array(agencySchema)
    .parse(response.data?.partners ?? [])
    .filter((agency) => agency.isActive !== false)
    .map((agency) => ({ id: agency.id, name: agency.name || agency.code || "Agence" }));
}

// ── Draft and amounts ───────────────────────────────────────

export interface SaleLine {
  productId: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  unitPriceFrancs: MoneyFrancs;
  quantity: number;
  stock: number;
}

export type DiscountKind = "amount" | "percent";

export interface SaleDraft {
  lines: SaleLine[];
  discountKind: DiscountKind;
  /** Raw text of the discount field. */
  discountInput: string;
  customerMode: "existing" | "new";
  customer: SaleCustomer | null;
  newCustomer: { name: string; phone: string; email: string };
  delivery: "pickup" | "shipping";
  agencyId: string;
  addressLine: string;
  addressCity: string;
  note: string;
}

export const EMPTY_SALE: SaleDraft = {
  lines: [],
  discountKind: "amount",
  discountInput: "",
  customerMode: "existing",
  customer: null,
  newCustomer: { name: "", phone: "", email: "" },
  delivery: "pickup",
  agencyId: "",
  addressLine: "",
  addressCity: "",
  note: "",
};

export interface SaleTotals {
  itemCount: number;
  subtotalFrancs: MoneyFrancs;
  discountFrancs: MoneyFrancs;
  totalFrancs: MoneyFrancs;
}

/** Parse a user-typed whole number ("1 500", "1500") or return null. */
export function parseWholeNumber(input: string): number | null {
  const cleaned = input.replace(/[\s  ]/g, "");
  if (cleaned === "") return 0;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

/**
 * Amounts of a sale, in whole francs. A percentage discount is rounded to
 * the franc, so the three figures sent to the server always add up.
 * An unreadable or excessive discount counts as 0 here; `validateSale`
 * reports it.
 */
export function computeSaleTotals(draft: Pick<SaleDraft, "lines" | "discountKind" | "discountInput">): SaleTotals {
  const subtotal = draft.lines.reduce((sum, line) => sum + line.unitPriceFrancs * line.quantity, 0);
  const typed = parseWholeNumber(draft.discountInput);

  let discount = 0;
  if (typed !== null) {
    discount = draft.discountKind === "percent" ? Math.round((subtotal * typed) / 100) : typed;
  }
  if (discount > subtotal || (draft.discountKind === "percent" && (typed ?? 0) > 100)) discount = 0;

  return {
    itemCount: draft.lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalFrancs: asFrancs(subtotal),
    discountFrancs: asFrancs(discount),
    totalFrancs: asFrancs(subtotal - discount),
  };
}

// ── Validation ──────────────────────────────────────────────

export const SALE_STEPS = ["items", "customer", "delivery", "review"] as const;
export type SaleStep = (typeof SALE_STEPS)[number];

/** Field name → the step that holds it. */
export const SALE_FIELD_STEP: Record<string, SaleStep> = {
  lines: "items",
  discount: "items",
  customer: "customer",
  customerName: "customer",
  customerPhone: "customer",
  customerEmail: "customer",
  agency: "delivery",
  addressLine: "delivery",
};

const digits = (value: string) => value.replace(/\D/g, "");

/** Errors of one step, or of the whole draft when `step` is omitted. */
export function validateSale(draft: SaleDraft, step?: SaleStep): Record<string, string> {
  const errors: Record<string, string> = {};
  const wants = (candidate: SaleStep) => !step || step === candidate || step === "review";

  if (wants("items")) {
    if (draft.lines.length === 0) {
      errors.lines = "Ajoutez au moins un article.";
    } else {
      const over = draft.lines.find((line) => line.quantity > line.stock);
      if (over) errors.lines = `Stock insuffisant pour « ${over.name} » (${over.stock} disponible).`;
    }

    const typed = parseWholeNumber(draft.discountInput);
    const subtotal = draft.lines.reduce((sum, line) => sum + line.unitPriceFrancs * line.quantity, 0);
    if (typed === null) {
      errors.discount = "Saisissez un nombre entier.";
    } else if (draft.discountKind === "percent" && typed > 100) {
      errors.discount = "La remise ne peut pas dépasser 100 %.";
    } else if (draft.discountKind === "amount" && typed > subtotal) {
      errors.discount = "La remise ne peut pas dépasser le sous-total.";
    }
  }

  if (wants("customer")) {
    if (draft.customerMode === "existing") {
      if (!draft.customer) errors.customer = "Choisissez un client.";
    } else {
      if (!draft.newCustomer.name.trim()) errors.customerName = "Indiquez le nom du client.";
      if (digits(draft.newCustomer.phone).length < 8) {
        errors.customerPhone = "Indiquez un numéro de téléphone d'au moins 8 chiffres.";
      }
      const email = draft.newCustomer.email.trim();
      if (email && !z.string().email().safeParse(email).success) {
        errors.customerEmail = "Cette adresse e-mail n'est pas valide.";
      }
    }
  }

  if (wants("delivery") && draft.delivery === "shipping") {
    if (!draft.agencyId) errors.agency = "Choisissez une agence de livraison.";
    if (!draft.addressLine.trim()) errors.addressLine = "Indiquez l'adresse de livraison.";
  }

  return errors;
}

// ── Request ─────────────────────────────────────────────────

export interface SaleRequest {
  customerId?: string;
  client?: { fullName: string; phone: string; countryCode: "BF"; email?: string };
  products: { productId: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  tax: 0;
  discount: number;
  total: number;
  currency: "XOF";
  delivery:
    | { method: "pickup"; pickupLocation: string }
    | { method: "shipping"; provider: string; address: { line1: string; city?: string } };
  note?: string;
}

/** The body of `POST sellers/sales` for a valid draft. Amounts in francs. */
export function buildSaleRequest(draft: SaleDraft): SaleRequest {
  const totals = computeSaleTotals(draft);
  const note = draft.note.trim();
  const email = draft.newCustomer.email.trim();

  return {
    ...(draft.customerMode === "existing" && draft.customer
      ? { customerId: draft.customer.id }
      : {
          client: {
            fullName: draft.newCustomer.name.trim(),
            phone: draft.newCustomer.phone.trim(),
            countryCode: "BF",
            ...(email ? { email } : {}),
          },
        }),
    products: draft.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPriceFrancs,
    })),
    subtotal: totals.subtotalFrancs,
    tax: 0,
    discount: totals.discountFrancs,
    total: totals.totalFrancs,
    currency: "XOF",
    delivery:
      draft.delivery === "pickup"
        ? { method: "pickup", pickupLocation: "Boutique" }
        : {
            method: "shipping",
            provider: draft.agencyId,
            address: {
              line1: draft.addressLine.trim(),
              ...(draft.addressCity.trim() ? { city: draft.addressCity.trim() } : {}),
            },
          },
    ...(note ? { note } : {}),
  };
}

const createdSchema = z.object({
  id: z.string().min(1),
  reference: z.string().nullish(),
  status: z.string().nullish(),
});

export interface CreatedSale {
  id: string;
  reference: string | null;
  status: string | null;
}

/**
 * Create the sale. `idempotencyKey` must stay the same for every attempt of
 * one form: the server then replays the first success instead of creating a
 * second order and moving the stock twice.
 */
export async function createSale(request: SaleRequest, idempotencyKey: string): Promise<CreatedSale> {
  const response = await api.post<{ data: unknown }>("sellers/sales", request, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  const created = createdSchema.parse(response.data);
  return { id: created.id, reference: created.reference ?? null, status: created.status ?? null };
}

/** Maps a `422` field path of the API to the form field that shows it. */
export function saleFieldOfApiError(path: string): string | null {
  if (path === "customerId") return "customer";
  if (path === "client.fullName") return "customerName";
  if (path === "client.phone") return "customerPhone";
  if (path === "client.email") return "customerEmail";
  if (path === "delivery.provider") return "agency";
  if (path.startsWith("delivery.address")) return "addressLine";
  if (path === "discount") return "discount";
  if (path.startsWith("products") || path === "subtotal" || path === "total") return "lines";
  return null;
}
