import { z } from "zod";

// Shapes the two statistics reports share (`SellerSalesReport`,
// `AgencyActivityReport`): a period and the one before it, a figure and the
// same figure before. Nothing is computed here.

export const int = z.coerce.number().int();

export const PERIODS = ["7j", "30j", "90j"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<PeriodKey, string> = { "7j": "7 jours", "30j": "30 jours", "90j": "90 jours" };

export const periodSchema = z.object({
  key: z.string(),
  from: z.string(),
  to: z.string(),
  days: int,
  previousFrom: z.string(),
  previousTo: z.string(),
});

export type Period = z.infer<typeof periodSchema>;

/**
 * A figure and the same figure over the period before. `change` is the
 * server's, in percent; null when the period before was empty: no rate is
 * made up from nothing.
 */
export const comparedSchema = z.object({ value: int, previous: int, change: z.number().nullable() });

export type Compared = z.infer<typeof comparedSchema>;
