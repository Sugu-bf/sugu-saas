import { api } from "@/lib/http/client";
import { agencyStatsResponseSchema, type AgencyStatsResponse } from "../schema";
import { getInitials, getAvatarColor, mapVehicle } from "./utils";

export async function getAgencyStats(
  agencyId: string,
  period: string = "30j",
): Promise<AgencyStatsResponse> {
  const raw = await api.get<{ success: boolean; data: Record<string, unknown> }>(
    `agencies/${agencyId}/statistics`,
    { params: { period } },
  );

  return agencyStatsResponseSchema.parse(
    _transformStatsResponse(raw.data),
  );
}

function _transformStatsResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const rawTopDrivers = Array.isArray(raw.topDrivers) ? raw.topDrivers : [];
  const topDrivers = rawTopDrivers.map((driver: Record<string, unknown>) => ({
    id: String(driver.id ?? ""),
    rank: Number(driver.rank ?? 0),
    name: String(driver.name ?? "Livreur"),
    initials: String(driver.initials ?? getInitials(String(driver.name ?? ""))),
    avatarColor: getAvatarColor(String(driver.id ?? "")),
    deliveries: Number(driver.deliveries ?? 0),
    successRate: Number(driver.successRate ?? 0),
  }));

  const rawDom = (raw.driverOfMonth ?? {}) as Record<string, unknown>;
  const driverOfMonth = {
    id: String(rawDom.id ?? ""),
    name: String(rawDom.name ?? "Aucun livreur"),
    initials: String(rawDom.initials ?? getInitials(String(rawDom.name ?? ""))),
    avatarColor: getAvatarColor(String(rawDom.id ?? "")),
    avatarUrl: rawDom.avatarUrl ?? null,
    vehicle: mapVehicle(rawDom.vehicle),
    deliveries: Number(rawDom.deliveries ?? 0),
    successRate: Number(rawDom.successRate ?? 0),
    rating: Number(rawDom.rating ?? 0),
    quote: String(
      rawDom.quote ??
        `Meilleur livreur de l'agence avec ${rawDom.deliveries ?? 0} livraisons et un taux de réussite exceptionnel de ${rawDom.successRate ?? 0}%.`,
    ),
    month: String(rawDom.month ?? ""),
    runner2nd: String(rawDom.runner2nd ?? "—"),
    runner3rd: String(rawDom.runner3rd ?? "—"),
  };

  const rawChartData = Array.isArray(raw.chartData) ? raw.chartData : [];
  const chartData = rawChartData.map((point: Record<string, unknown>) => ({
    day: Number(point.day ?? 0),
    label: String(point.label ?? ""),
    value: Number(point.value ?? 0),
  }));

  const rawFailureReasons = Array.isArray(raw.failureReasons) ? raw.failureReasons : [];
  const failureReasons = rawFailureReasons.map((reason: Record<string, unknown>) => ({
    id: String(reason.id ?? ""),
    label: String(reason.label ?? ""),
    percentage: Number(reason.percentage ?? 0),
    color: String(reason.color ?? "bg-gray-200"),
  }));

  const rawWeekDays = Array.isArray(raw.weekDays) ? raw.weekDays : [];
  const weekDays = rawWeekDays.map((day: Record<string, unknown>) => ({
    day: String(day.day ?? ""),
    deliveries: Number(day.deliveries ?? 0),
    successRate: Number(day.successRate ?? 0),
    isHighlighted: Boolean(day.isHighlighted ?? false),
  }));

  return {
    totalDeliveries: Number(raw.totalDeliveries ?? 0),
    deliveriesGrowth: String(raw.deliveriesGrowth ?? "0%"),
    successRate: Number(raw.successRate ?? 0),
    avgDeliveryTime: String(raw.avgDeliveryTime ?? "0min"),
    avgTimeTarget: String(raw.avgTimeTarget ?? "< 3h"),
    totalRevenue: String(raw.totalRevenue ?? "0 FCFA"),
    revenueGrowth: String(raw.revenueGrowth ?? "0%"),
    chartMonth: String(raw.chartMonth ?? ""),
    chartData,
    chartThisMonth: Number(raw.chartThisMonth ?? 0),
    chartPrevMonth: Number(raw.chartPrevMonth ?? 0),
    chartGrowth: String(raw.chartGrowth ?? "0%"),
    driverOfMonth,
    topDrivers,
    failureCount: Number(raw.failureCount ?? 0),
    failureRate: String(raw.failureRate ?? "0%"),
    failureVsPrev: String(raw.failureVsPrev ?? "0% vs avant"),
    failureReasons,
    failureTip: String(raw.failureTip ?? ""),
    weekDays,
  };
}
