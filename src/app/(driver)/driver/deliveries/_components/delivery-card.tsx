"use client";

// ============================================================
// DeliveryCard — individual delivery list card
// ============================================================

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  CheckCircle2,
  XCircle,
  ChevronRight,
  PackageOpen,
  Navigation,
  TrendingUp,
  Loader2,
  Check,
  Zap,
} from "lucide-react";
import {
  useAcceptDelivery,
  useRefuseDelivery,
} from "@/features/driver/hooks";
import type { DriverDeliveryRow } from "@/features/driver/schema";
import { STATUS_CONFIG } from "./status-config";
import { StatusBadge } from "./status-badge";
import { toast } from "sonner";

export function DeliveryCard({
  row,
  isSelected,
  onClick,
  index,
}: {
  row: DriverDeliveryRow;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  const cfg = STATUS_CONFIG[row.status];
  const acceptMutation = useAcceptDelivery();
  const refuseMutation = useRefuseDelivery();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group glass-card relative rounded-2xl p-4 transition-all duration-300 cursor-pointer animate-card-enter",
        cfg.borderL,
        isSelected
          ? "ring-2 ring-sugu-500/30 bg-sugu-50/20 dark:bg-sugu-950/10"
          : "hover:-translate-y-0.5",
        row.status === "delivered" && "opacity-75",
        row.status === "failed" && "opacity-60",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Urgent glow */}
      {row.status === "to_accept" && (
        <div className="absolute inset-0 rounded-2xl bg-amber-500/5 pointer-events-none" />
      )}

      {/* ── Top row ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} label={row.statusLabel} />
          {row.status === "to_accept" && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Zap className="h-2.5 w-2.5" />
              Nouveau
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
            {row.timeLabel}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* ── Itinerary ── */}
      <div className="space-y-0.5 mb-3">
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="h-5 w-px border-l-2 border-dashed border-gray-300/70 dark:border-gray-600/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
              {row.itinerary.pickupName}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {row.itinerary.pickupAddress}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center mt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sugu-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
              {row.itinerary.deliveryName}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {row.itinerary.deliveryAddress}
            </p>
          </div>
        </div>
      </div>

      {/* ── Info chips ── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
          <Package className="h-3 w-3 text-gray-400" />
          {row.parcelCount} colis
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
          <Navigation className="h-3 w-3 text-gray-400" />
          {row.itinerary.distanceKm} km
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-sugu-50 px-2 py-0.5 text-[10px] font-bold text-sugu-600 dark:bg-sugu-950/30 dark:text-sugu-400">
          <TrendingUp className="h-3 w-3" />
          {formatCurrency(row.amount)} F
        </span>
      </div>

      {/* ── Progress (en_route) ── */}
      {row.status === "en_route" && row.progressPercent != null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="font-bold text-sugu-600 dark:text-sugu-400">
              {row.progressPercent}% complété
            </span>
            <span className="font-medium text-gray-400">
              ~{row.etaMinutes} min restantes
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sugu-500 transition-all duration-700 ease-out"
              style={{ width: `${row.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Pickup badge ── */}
      {row.status === "pickup" && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
            <PackageOpen className="h-3.5 w-3.5" />
            Ramassage en cours…
          </span>
        </div>
      )}

      {/* ── Accept/Refuse CTA ── */}
      {row.status === "to_accept" && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refuseMutation.mutate(row.id, {
                onSuccess: () => toast.info("Livraison refusée"),
              });
            }}
            disabled={refuseMutation.isPending}
            className="flex-1 rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            {refuseMutation.isPending ? (
              <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
            ) : (
              "Refuser"
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              acceptMutation.mutate(row.id, {
                onSuccess: () => toast.success("Livraison acceptée !"),
              });
            }}
            disabled={acceptMutation.isPending}
            className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-green-600 active:scale-[0.98] disabled:opacity-60"
          >
            {acceptMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Accepter · {formatCurrency(row.amount)} F
          </button>
        </div>
      )}

      {/* ── Delivered ── */}
      {row.status === "delivered" && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Livré à {row.timeLabel}
        </div>
      )}

      {/* ── Failed ── */}
      {row.status === "failed" && row.failReason && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50/60 px-2.5 py-1 text-[11px] font-medium text-red-500 dark:bg-red-950/20 dark:text-red-400">
          <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {row.failReason}
        </div>
      )}

      {/* ── Detail page link ── */}
      <Link
        href={`/driver/deliveries/${row.id}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sugu-500 transition-colors hover:text-sugu-600"
      >
        Voir détails
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
