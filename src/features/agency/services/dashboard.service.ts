import { z } from "zod";
import { api } from "@/lib/http/client";
import { agencyDashboardSchema, type AgencyDashboardData } from "../schema";
import { getInitials, getAvatarColor, formatMinutes, formatCurrency, mapShipmentStatus, mapShipmentStatusLabel, calculateEta, formatDate } from "./utils";

const backendKpisSchema = z.object({
  deliveriesToday: z.number(),
  deliveriesYesterday: z.number(),
  successRate: z.number(),
  successRateTarget: z.number().optional().default(95),
  avgDeliveryMinutes: z.number(),
  revenueToday: z.number(),
  revenueGrowthPercent: z.number(),
});

const backendCourierSchema = z.object({
  id: z.string(),
  name: z.string(),
}).nullable();

const backendActiveDeliverySchema = z.object({
  id: z.string(),
  order_id: z.string().nullable(),
  courier: backendCourierSchema,
  pickup_address: z.string(),
  delivery_address: z.string(),
  status: z.string(),
  created_at: z.string().nullable(),
  estimated_delivery_at: z.string().nullable(),
});

const backendDriverPerfSchema = z.object({
  courier_id: z.string(),
  name: z.string(),
  total_deliveries: z.number(),
  completed_deliveries: z.number(),
  success_rate: z.number(),
});

const backendComplaintSchema = z.object({
  id: z.string(),
  subject: z.string(),
  reference: z.string().nullable(),
  created_at: z.string().nullable(),
  priority: z.string(),
});

const backendDashboardResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    agencyName: z.string(),
    managerName: z.string(),
    kpis: backendKpisSchema,
    activeDeliveries: z.array(backendActiveDeliverySchema),
    driverPerformance: z.array(backendDriverPerfSchema),
    recentComplaints: z.array(backendComplaintSchema),
  }),
});

type BackendDashboardData = z.infer<typeof backendDashboardResponseSchema>["data"];

function transformDashboard(raw: BackendDashboardData): AgencyDashboardData {
  const kpis = raw.kpis;

  return {
    agencyName: raw.agencyName,
    managerName: raw.managerName,
    kpis: [
      {
        id: "deliveries-today",
        label: "Livraisons aujourd'hui",
        value: String(kpis.deliveriesToday),
        icon: "truck",
        gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
        iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
      },
      {
        id: "success-rate",
        label: "Taux de réussite",
        value: String(kpis.successRate),
        subValue: "%",
        icon: "check-circle",
        gradient: "from-green-50 via-emerald-50/60 to-teal-50/40",
        iconBg: "bg-gradient-to-br from-green-400 to-emerald-500 text-white",
        ringPercent: kpis.successRate,
      },
      {
        id: "avg-time",
        label: "Temps moyen",
        value: formatMinutes(kpis.avgDeliveryMinutes),
        subValue: "min",
        icon: "clock",
        gradient: "from-blue-50 via-indigo-50/60 to-violet-50/40",
        iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
      },
      {
        id: "revenue-today",
        label: "Revenus du jour",
        value: formatCurrency(kpis.revenueToday),
        subValue: "FCFA",
        badge:
          kpis.revenueGrowthPercent !== 0
            ? `↗ +${kpis.revenueGrowthPercent}%`
            : undefined,
        badgeColor: "text-green-600 bg-green-50",
        icon: "banknote",
        gradient: "from-emerald-50 via-green-50/60 to-lime-50/40",
        iconBg: "bg-gradient-to-br from-emerald-400 to-green-500 text-white",
      },
    ],
    activeDeliveries: raw.activeDeliveries.map((d) => ({
      id: d.id,
      orderId: d.order_id ? `#${d.order_id}` : "#—",
      driver: {
        name: d.courier?.name ?? "Non assigné",
        initials: getInitials(d.courier?.name ?? "NA"),
        avatarColor: getAvatarColor(d.courier?.id ?? d.id),
      },
      routeAddresses: `${d.pickup_address} → ${d.delivery_address}`,
      status: mapShipmentStatus(d.status),
      statusLabel: mapShipmentStatusLabel(d.status),
      eta: calculateEta(d.estimated_delivery_at),
    })),
    driverPerformance: raw.driverPerformance.map((d) => ({
      id: d.courier_id,
      name: d.name,
      initials: getInitials(d.name),
      avatarColor: getAvatarColor(d.courier_id),
      score: d.success_rate,
    })),
    complaints: raw.recentComplaints.map((c) => ({
      id: c.id,
      title: `${c.subject}${c.reference ? ` - ID ${c.reference}` : ""}`,
      refId: c.reference ?? `#${c.id.slice(0, 8)}`,
      date: formatDate(c.created_at),
      severity:
        c.priority === "high" || c.priority === "urgent" ? "urgent" : "normal",
    })),
    mapPins: raw.activeDeliveries.map((d) => {
      let hash = 0;
      for (let c = 0; c < d.id.length; c++) {
        hash = ((hash << 5) - hash + d.id.charCodeAt(c)) | 0;
      }
      const latOffset = ((hash % 100) / 100) * 0.08 - 0.04;
      const lngOffset = (((hash >> 8) % 100) / 100) * 0.08 - 0.04;

      return {
        id: d.id,
        lat: 12.3714 + latOffset,
        lng: -1.5197 + lngOffset,
        status: mapShipmentStatus(d.status),
      };
    }),
    earningsChart: [
      { day: "LUN", value: 125000 },
      { day: "MAR", value: 142000 },
      { day: "MER", value: 138000 },
      { day: "JEU", value: 165000 },
      { day: "VEN", value: 154000 },
      { day: "SAM", value: 182000 },
      { day: "DIM", value: Math.round(kpis.revenueToday / 100) },
    ],
    earningsTotal: 1045000 + Math.round(kpis.revenueToday / 100),
    earningsPrevious: 1012000,
  };
}

export async function getAgencyDashboard(agencyId: string): Promise<AgencyDashboardData> {
  const raw = await api.get<z.infer<typeof backendDashboardResponseSchema>>(`agencies/${agencyId}/dashboard`);
  const validated = backendDashboardResponseSchema.parse(raw);
  const transformed = transformDashboard(validated.data);
  return agencyDashboardSchema.parse(transformed);
}
