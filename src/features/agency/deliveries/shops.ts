import { z } from "zod";

// ============================================================
// Shops of the marketplace, found by name while a delivery is typed in:
// choosing one takes its name, its address and its phone for the pickup.
//
// Contract with the public listing `GET vendors`
// (Laravel: VendorsListService::formatVendorCard); the call is in ./api.
// The agency's own customers are not shops of the marketplace: the sender
// stays free text, and a shop is only ever a suggestion.
// ============================================================

const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);

const rawShopSchema = z.object({
  id: z.union([z.string().min(1), z.number()]).transform(String),
  name: z.string().trim().min(1),
  contact: z.object({ address_line: text, phone: text }).partial().nullish(),
});

export interface ShopSuggestion {
  id: string;
  name: string;
  /** Street, city and region of the shop; null when it gave none. */
  address: string | null;
  phone: string | null;
}

/** What the listing answers for a shop without an address: a sentence, not an address. */
const NO_ADDRESS = "Adresse non renseignée";

/** A shop the listing answers in a shape this screen cannot read is left out, not the whole list. */
export function parseShopSuggestions(raw: unknown): ShopSuggestion[] {
  const items = z.object({ items: z.array(z.unknown()) }).safeParse(raw);
  if (!items.success) return [];
  return items.data.items.flatMap((item) => {
    const shop = rawShopSchema.safeParse(item);
    if (!shop.success) return [];
    const address = shop.data.contact?.address_line ?? null;
    return [{ id: shop.data.id, name: shop.data.name, address: address === NO_ADDRESS ? null : address, phone: shop.data.contact?.phone ?? null }];
  });
}

/** Nothing is asked for a single letter. */
export const SHOP_SEARCH_MIN_LENGTH = 2;
/** A handful under a field, not a directory. */
export const SHOP_SUGGESTIONS = 5;
