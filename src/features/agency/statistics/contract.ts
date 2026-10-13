import { z } from "zod";
import { comparedSchema, int, periodSchema } from "@/features/insights/contract";

// ============================================================
// Statistiques agence — what Laravel answers about the deliveries
// of the agency over a period (`agencies/{id}/statistics?period=`,
// key `report`, `AgencyActivityReport`).
//
// A delivery is a shipment handed to the agency. Every figure
// follows the deliveries CREATED in the period, in the state they
// are in now. No money here: it is on the finance screens, under
// their own permissions. Read as answered, nothing is computed.
// ============================================================

export const STATES = ["delivered", "in_progress", "pending", "failed"] as const;

const reportSchema = z.object({
  data: z.object({
    report: z.object({
      period: periodSchema,
      kpis: z.object({
        created: comparedSchema,
        delivered: comparedSchema,
        inProgress: int,
        pending: int,
        failed: comparedSchema,
        /** Delivered ÷ (delivered + failed), in percent; null before a delivery is finished. */
        successRate: z.number().nullable(),
        /** Pickup to delivery; null when no delivery recorded both moments. */
        averageMinutes: int.nullable(),
        timedDeliveries: int,
      }),
      series: z.array(z.object({ date: z.string(), created: int, delivered: int, failed: int })),
      statuses: z.array(z.object({ key: z.string(), count: int, percent: z.number() })),
      couriers: z.array(z.object({ id: z.string(), name: z.string(), deliveries: int, failed: int, assigned: int, successRate: z.number().nullable() })),
      failureReasons: z.array(z.object({ code: z.string(), label: z.string(), count: int, percent: z.number() })),
    }),
  }),
});

export type ActivityReport = z.infer<typeof reportSchema>["data"]["report"];

export const parseActivityReport = (payload: unknown): ActivityReport => reportSchema.parse(payload).data.report;
