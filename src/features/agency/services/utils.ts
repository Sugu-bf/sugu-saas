import { DeliveryStatus, DeliveryPriority } from "../schema";

export function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
}

export const AVATAR_COLORS = [
  "bg-sugu-100 text-sugu-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return String(m);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

export function formatCurrency(centimes: number): string {
  const amount = Math.round(centimes / 100);
  return amount.toLocaleString("fr-FR");
}

export function mapShipmentStatus(backendStatus: string): DeliveryStatus {
  const map: Record<string, DeliveryStatus> = {
    pending: "pending",
    assigned: "pickup",
    in_transit: "en_route",
    delivered: "delivered",
    delivery_failed: "returned",
  };
  return map[backendStatus] ?? "pending";
}

export function mapShipmentStatusLabel(backendStatus: string): string {
  const map: Record<string, string> = {
    pending: "En attente",
    assigned: "Ramassage",
    in_transit: "En route",
    delivered: "Livré",
    delivery_failed: "Échoué",
  };
  return map[backendStatus] ?? "En attente";
}

export function isDelayed(backendStatus: string, eta: string | null | undefined): boolean {
  if (backendStatus !== "in_transit" || !eta) return false;
  try {
    return new Date(eta).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function mapShipmentStatusWithDelay(backendStatus: string, eta: string | null | undefined): DeliveryStatus {
  if (isDelayed(backendStatus, eta)) return "delayed";
  return mapShipmentStatus(backendStatus);
}

export function mapStatusLabelWithDelay(backendStatus: string, eta: string | null | undefined): string {
  if (isDelayed(backendStatus, eta)) return "Retard";
  return mapShipmentStatusLabel(backendStatus);
}

export function mapPriority(priorityInt: number | null | undefined): DeliveryPriority {
  const p = priorityInt ?? 100;
  if (p <= 30) return "urgent";
  if (p <= 100) return "normal";
  return "low";
}

export function calculateEta(estimatedAt: string | null | undefined): string {
  if (!estimatedAt) return "N/A";
  try {
    const eta = new Date(estimatedAt);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();

    if (diffMs <= 0) return "Arrivé";

    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}m`;
  } catch {
    return "N/A";
  }
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}

export function formatTime(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

export function formatDateLong(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    const months = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}

export function formatRelativeDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `il y a ${diffDays}j`;
    const diffMonths = Math.floor(diffDays / 30);
    return `il y a ${diffMonths} mois`;
  } catch {
    return "—";
  }
}

export function computeSeniority(hiredAt: string | null | undefined): { seniority: string; seniorityDetail: string } {
  if (!hiredAt) return { seniority: "—", seniorityDetail: "—" };
  try {
    const d = new Date(hiredAt);
    const now = new Date();
    const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    const frMonths = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const seniorityDetail = `depuis ${frMonths[d.getMonth()]} ${d.getFullYear()}`;
    if (months < 1) return { seniority: "< 1 mois", seniorityDetail };
    if (months < 12) return { seniority: `${months} mois`, seniorityDetail };
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const label = years === 1 ? "1 an" : `${years} ans`;
    return { seniority: rem > 0 ? `${label} ${rem} mois` : label, seniorityDetail };
  } catch {
    return { seniority: "—", seniorityDetail: "—" };
  }
}

export function formatFrenchDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    const frMonths = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return `${d.getDate()} ${frMonths[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

export function mapVehicleType(vt: string | null | undefined): "moto" | "voiture" | "vélo" | "tricycle" {
  const val = (vt ?? "moto").toLowerCase();
  if (val === "moto" || val === "voiture" || val === "vélo" || val === "tricycle") return val;
  if (val === "motorcycle" || val === "scooter") return "moto";
  if (val === "car" || val === "auto" || val === "truck" || val === "van") return "voiture";
  if (val === "bike" || val === "bicycle") return "vélo";
  return "moto";
}

export const VALID_VEHICLES = ["moto", "voiture", "vélo", "tricycle"] as const;
export type VehicleTypeVal = (typeof VALID_VEHICLES)[number];

export function mapVehicle(vt: unknown): VehicleTypeVal {
  if (typeof vt !== "string") return "moto";
  const val = vt.toLowerCase();
  if (VALID_VEHICLES.includes(val as VehicleTypeVal)) return val as VehicleTypeVal;
  if (val === "motorcycle" || val === "scooter") return "moto";
  if (val === "car" || val === "auto") return "voiture";
  if (val === "bike" || val === "bicycle") return "vélo";
  return "moto";
}

export function mapCourierStatus(status: string | number, isActive: boolean): "online" | "offline" | "suspended" {
  if (status === "suspended" || status === 2) return "suspended";
  if ((status === "active" || status === 1) && isActive) return "online";
  return "offline";
}

export function parseRating(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "string") return parseFloat(val) || 0;
  return val;
}
