import { z } from "zod";
import { comparedSchema, int, periodSchema } from "@/features/insights/contract";

// ============================================================
// Statistiques vendeur — what Laravel answers about the sales of
// the seller's stores over a period (`sellers/statistics?period=`,
// `SellerSalesReport`). Amounts are in francs.
//
// Read as answered: no figure, rate, rating or ranking is built
// here. What the server does not measure is not on the screen.
// ============================================================

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

const reportSchema = z.object({
  data: z.object({
    report: z.object({
      period: periodSchema,
      kpis: z.object({
        revenue: comparedSchema,
        orders: comparedSchema,
        averageBasket: comparedSchema,
        newCustomers: comparedSchema,
        returningCustomers: int,
        deliveredOrders: int,
        inProgressAmount: int,
        canceledOrders: int,
      }),
      series: z.array(z.object({ date: z.string(), orders: int, revenue: int })),
      topProducts: z.array(z.object({ productId: text, name: z.string(), sku: text, image: text, quantity: int, revenue: int })),
      categories: z.array(z.object({ name: z.string(), revenue: int, percent: z.number() })),
      cities: z.array(z.object({ city: z.string(), orders: int, percent: z.number() })),
    }),
  }),
});

export type SalesReport = z.infer<typeof reportSchema>["data"]["report"];

export const parseSalesReport = (payload: unknown): SalesReport => reportSchema.parse(payload).data.report;
