import { z } from "zod";
import { asCents, centsToFrancs, type MoneyFrancs } from "@/design-system";
import { parseCourierOverview, type CourierOverview } from "../couriers/contract";
import { parseDeliveryOverview, parseDeliveryRow, type DeliveryOverview, type DeliveryRow } from "../deliveries/contract";

// ============================================================
// Agency dashboard — contract with `agencies/{id}/dashboard`
// (Laravel: AgencyDashboardController).
//
// The dashboard counts what the lists count: `overview` is the
// one of the delivery list, `couriers.overview` the one of the
// courier list. Amounts are answered in CENTIMES.
// ============================================================

const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);
const id = z.union([z.string().min(1), z.number()]).transform(String);
const count = z.number().int().nonnegative();

const rawDashboardSchema = z.object({
  agencyName: text,
  overview: z.unknown(),
  today: z.object({
    created: count,
    createdYesterday: count,
    delivered: count,
    deliveredYesterday: count,
    failed: count,
    failedYesterday: count,
    revenue: z.number(),
    revenueYesterday: z.number(),
  }),
  priority: z.object({ total: count, shipments: z.array(z.unknown()) }),
  activityByHour: z.array(z.object({ hour: z.number().int(), delivered: count, failed: count })),
  couriers: z.object({
    overview: z.unknown(),
    live: z.array(
      z.object({
        courier_id: id,
        user_id: id,
        name: z.string(),
        phone: text,
        activity: z.string(),
        last_activity_at: text,
        shipment: z.object({ id, order_number: text, status: z.string(), zone: text, address: text }).nullish(),
      }),
    ),
  }),
});

export interface DashboardDay {
  created: number;
  createdYesterday: number;
  delivered: number;
  deliveredYesterday: number;
  failed: number;
  failedYesterday: number;
  /** What the deliveries completed that day were priced. */
  revenueFrancs: MoneyFrancs;
  revenueYesterdayFrancs: MoneyFrancs;
}

export interface HourActivity {
  hour: number;
  delivered: number;
  failed: number;
}

export interface LiveCourier {
  courierId: string;
  userId: string;
  name: string;
  phone: string | null;
  activity: string;
  lastActivityAt: string | null;
  /** The delivery he is on, when he has one. */
  delivery: { id: string; reference: string | null; status: string; place: string | null } | null;
}

export interface AgencyDashboard {
  agencyName: string | null;
  overview: DeliveryOverview;
  today: DashboardDay;
  /** The deliveries that need the agency first, and how many there are in all. */
  priority: { total: number; rows: DeliveryRow[] };
  /** Twenty-four entries, one per hour of the day. */
  activityByHour: HourActivity[];
  couriers: { overview: CourierOverview; live: LiveCourier[] };
}

export function parseAgencyDashboard(raw: unknown): AgencyDashboard {
  const dashboard = rawDashboardSchema.parse(raw);
  return {
    agencyName: dashboard.agencyName,
    overview: parseDeliveryOverview(dashboard.overview),
    today: {
      created: dashboard.today.created,
      createdYesterday: dashboard.today.createdYesterday,
      delivered: dashboard.today.delivered,
      deliveredYesterday: dashboard.today.deliveredYesterday,
      failed: dashboard.today.failed,
      failedYesterday: dashboard.today.failedYesterday,
      revenueFrancs: centsToFrancs(asCents(dashboard.today.revenue)),
      revenueYesterdayFrancs: centsToFrancs(asCents(dashboard.today.revenueYesterday)),
    },
    priority: { total: dashboard.priority.total, rows: dashboard.priority.shipments.map(parseDeliveryRow) },
    activityByHour: dashboard.activityByHour,
    couriers: {
      overview: parseCourierOverview(dashboard.couriers.overview),
      live: dashboard.couriers.live.map((courier) => ({
        courierId: courier.courier_id,
        userId: courier.user_id,
        name: courier.name,
        phone: courier.phone,
        activity: courier.activity,
        lastActivityAt: courier.last_activity_at,
        delivery: courier.shipment
          ? {
              id: courier.shipment.id,
              reference: courier.shipment.order_number,
              status: courier.shipment.status,
              place: courier.shipment.zone ?? courier.shipment.address,
            }
          : null,
      })),
    },
  };
}
