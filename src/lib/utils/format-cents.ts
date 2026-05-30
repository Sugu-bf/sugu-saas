/**
 * Monetary formatting for amounts expressed in **centimes** (minor unit).
 *
 * The backend exposes COD / fee amounts in raw centimes (e.g. 450000 = 4 500 XOF).
 * The existing `formatCurrency` in this folder does NOT divide — it formats a
 * value already in XOF. The agency-scoped `formatCurrency(centimes)` in
 * `features/agency/services/utils.ts` divides but rounds to whole XOF (lossy)
 * and is not shared. This helper is the single transversal entry point: the
 * "Cents" in its name makes the expected input unit explicit at every call site.
 */

const XOF_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format an amount given in centimes as a display-ready XOF string.
 *
 * @param cents - amount in centimes (minor unit). 100 centimes = 1 XOF.
 * @returns e.g. `"4 500 FCFA"`. Residual centimes are preserved with up to two
 *          decimals (`12345` → `"123,45 FCFA"`). Non-finite input yields
 *          `"0 FCFA"` rather than `"NaN FCFA"`.
 */
export function formatCentsToXof(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return `${XOF_FORMATTER.format(safe / 100)} FCFA`;
}
