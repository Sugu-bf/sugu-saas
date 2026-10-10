import { cn } from "../cn";

/* ============================================================
   Money convention

   The backend stores amounts in centimes (`*_amount`, `*_cents`
   columns: 5 000 000 = 50 000 FCFA). API responses are NOT uniform:

   - seller orders, items, totals → whole francs
     (`SellerOrderService::centsToUnits` divides before responding);
   - COD Mixte fees → centimes (see `lib/utils/format-cents.ts`), as are
     the agency amounts read by `features/agency/services/utils.ts`.

   So the unit is part of every call: there is no `formatMoney(n)`.
   Pick the function that names the unit the endpoint really returns.
   ============================================================ */

declare const centsBrand: unique symbol;
declare const francsBrand: unique symbol;

/** Amount in centimes (minor unit). 100 centimes = 1 FCFA. */
export type MoneyCents = number & { readonly [centsBrand]: true };
/** Amount in whole francs CFA. */
export type MoneyFrancs = number & { readonly [francsBrand]: true };

/** Tag a raw number as centimes, at the boundary where the API schema is parsed. */
export const asCents = (value: number): MoneyCents => value as MoneyCents;
/** Tag a raw number as francs, at the boundary where the API schema is parsed. */
export const asFrancs = (value: number): MoneyFrancs => value as MoneyFrancs;

export const centsToFrancs = (value: MoneyCents): MoneyFrancs => (value / 100) as MoneyFrancs;
export const francsToCents = (value: MoneyFrancs): MoneyCents => Math.round(value * 100) as MoneyCents;

export interface MoneyFormatOptions {
  /** Currency label. `false` returns the bare number. Defaults to "FCFA". */
  currency?: "FCFA" | "XOF" | false;
  /** Shown for `null`, `undefined` and non-finite values. Defaults to "—". */
  fallback?: string;
  /** Prefix positive amounts with "+" (wallet movements). */
  showPlus?: boolean;
}

const NBSP = " ";

const FORMATTER = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function format(francs: number | null | undefined, options: MoneyFormatOptions): string {
  const { currency = "FCFA", fallback = "—", showPlus = false } = options;
  // Missing is not zero: an absent amount must never read as "0 FCFA".
  if (francs === null || francs === undefined || !Number.isFinite(francs)) return fallback;
  // Intl groups with a narrow no-break space; normalise to U+00A0 so the
  // output is stable across runtimes and never wraps.
  const digits = FORMATTER.format(Math.abs(francs)).replace(/[   ]/g, NBSP);
  const sign = francs < 0 ? "-" : showPlus && francs > 0 ? "+" : "";
  return `${sign}${digits}${currency ? `${NBSP}${currency}` : ""}`;
}

/** Format an amount the API returned in **centimes**. 5 000 000 → "50 000 FCFA". */
export function formatMoneyFromCents(cents: number | null | undefined, options: MoneyFormatOptions = {}): string {
  const francs = cents === null || cents === undefined ? cents : cents / 100;
  return format(francs, options);
}

/** Format an amount the API returned in **francs**. 50 000 → "50 000 FCFA". */
export function formatMoneyFromFrancs(francs: number | null | undefined, options: MoneyFormatOptions = {}): string {
  return format(francs, options);
}

type MoneyProps = MoneyFormatOptions & { className?: string } & (
    | { cents: number | null | undefined; francs?: never }
    | { francs: number | null | undefined; cents?: never }
  );

/** Amount with tabular figures, never wrapped. Exactly one of `cents` / `francs`. */
export function Money({ className, ...props }: MoneyProps) {
  const { cents, francs, ...options } = props;
  const text = "cents" in props ? formatMoneyFromCents(cents, options) : formatMoneyFromFrancs(francs, options);
  return <span className={cn("whitespace-nowrap tabular-nums", className)}>{text}</span>;
}
