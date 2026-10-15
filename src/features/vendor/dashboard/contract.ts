import { z } from "zod";
import { comparedSchema, int, periodSchema } from "@/features/insights/contract";

// ============================================================
// Tableau de bord vendeur — what Laravel answers for the seller's
// dashboard (`sellers/dashboard?view=board`, `SellerDashboardBoard`).
// The figures are the statistics' (V7), the stock levels the
// inventory's (V2), the unread messages the inbox's (V8). Amounts
// are in francs. Nothing is computed here.
// ============================================================

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

const id = z.union([z.string(), z.number()]).transform(String);

export const ONBOARDING_STEPS = ["profile", "product", "delivery", "publish"] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number];

const boardSchema = z.object({
  data: z.object({
    store: z.object({ id, name: z.string(), slug: text, isPublic: z.boolean() }).nullable(),
    period: periodSchema,
    kpis: z.object({
      revenue: comparedSchema,
      orders: comparedSchema,
      unitsSold: comparedSchema,
      toPrepare: int,
    }),
    series: z.array(z.object({ date: z.string(), orders: int, revenue: int })),
    tasks: z.object({
      toConfirm: int,
      toPrepare: int,
      oldestPendingAt: text,
      outOfStock: int,
      lowStock: int,
      unreadConversations: int,
      unreadMessages: int,
      ticketsAwaiting: int,
      ticketId: text,
    }),
    recentOrders: z.array(z.object({ id, number: z.string(), customer: text, amount: int, status: z.string(), createdAt: z.string() })),
    topProducts: z.array(z.object({ productId: text, name: z.string(), sku: text, image: text, quantity: int, revenue: int })),
    stockWatch: z.array(z.object({ productId: id, name: z.string(), sku: text, image: text, stock: int, level: z.enum(["out_of_stock", "low_stock"]) })),
    onboarding: z.object({
      steps: z.array(z.object({ key: z.enum(ONBOARDING_STEPS), done: z.boolean() })),
      completed: int,
      total: int,
    }),
    hasOrders: z.boolean(),
  }),
});

export type DashboardBoard = z.infer<typeof boardSchema>["data"];
export type BoardOrder = DashboardBoard["recentOrders"][number];
export type BoardStockItem = DashboardBoard["stockWatch"][number];
export type BoardTasks = DashboardBoard["tasks"];

export const parseDashboardBoard = (payload: unknown): DashboardBoard => boardSchema.parse(payload).data;
