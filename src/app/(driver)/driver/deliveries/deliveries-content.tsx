"use client";

import { useState, useCallback, Fragment } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  CheckCircle2,
  XCircle,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  X,
  ExternalLink,
  AlertTriangle,
  Clock,
  Loader2,
  Navigation,
  Check,
  ChevronRight,
  User,
  PackageCheck,
  PackageX,
  PackageOpen,
  Hourglass,
  Bike,
} from "lucide-react";
import {
  useDriverDeliveries,
  useAcceptDelivery,
  useRefuseDelivery,
  useMarkDelivered,
  useSignalDelay,
  useMarkFailed,
} from "@/features/driver/hooks";
import type {
  DriverDeliveryRow,
  DriverDeliveryStatus,
} from "@/features/driver/schema";
import type { DriverDeliveryFilters } from "@/features/driver/service";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Status config (adapted for driver statuses)
// ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DriverDeliveryStatus,
  { label: string; bg: string; text: string; dot: string; borderL: string }
> = {
  to_accept: {
    label: "À accepter",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500 animate-pulse",
    borderL: "border-l-4 border-amber-400",
  },
  pickup: {
    label: "Ramassage",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    borderL: "border-l-4 border-blue-400",
  },
  en_route: {
    label: "En route",
    bg: "bg-sugu-50 dark:bg-sugu-950/30",
    text: "text-sugu-700 dark:text-sugu-400",
    dot: "bg-sugu-500",
    borderL: "border-l-4 border-sugu-500",
  },
  delivered: {
    label: "Livré",
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    borderL: "border-l-4 border-green-400",
  },
  failed: {
    label: "Échoué",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    borderL: "border-l-4 border-red-300",
  },
};

// ────────────────────────────────────────────────────────────
// StatusBadge
// ────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  label,
}: {
  status: DriverDeliveryStatus;
  label: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// DeliveryCard — individual card in the list
// ────────────────────────────────────────────────────────────

function DeliveryCard({
  row,
  isSelected,
  onClick,
}: {
  row: DriverDeliveryRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[row.status];
  const acceptMutation = useAcceptDelivery();
  const refuseMutation = useRefuseDelivery();

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card rounded-xl p-4 transition-all cursor-pointer",
        cfg.borderL,
        isSelected
          ? "bg-sugu-50/30 shadow-md shadow-sugu-500/5"
          : "hover:shadow-md",
        row.status === "delivered" && "opacity-80",
        row.status === "failed" && "opacity-60",
      )}
    >
      {/* Top row: StatusBadge + timeLabel + ChevronRight */}
      <div className="flex items-center justify-between mb-2.5">
        <StatusBadge status={row.status} label={row.statusLabel} />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-400">
            {row.timeLabel}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        </div>
      </div>

      {/* Itinerary: vertical dots (blue → sugu) + route names */}
      <div className="space-y-1 mb-3">
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center mt-0.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="h-5 w-px border-l border-dashed border-gray-300 dark:border-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
              {row.itinerary.pickupName}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {row.itinerary.pickupAddress}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center mt-0.5">
            <span className="h-2 w-2 rounded-full bg-sugu-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
              {row.itinerary.deliveryName}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {row.itinerary.deliveryAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Info row: 📦 N colis · X km · 💰 Y FCFA */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mb-2.5">
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {row.parcelCount} colis
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>{row.itinerary.distanceKm} km</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {formatCurrency(row.amount)} F
        </span>
      </div>

      {/* Progress bar (only for en_route) */}
      {row.status === "en_route" && row.progressPercent != null && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold text-sugu-600 dark:text-sugu-400">
              {row.progressPercent}% · ~{row.etaMinutes} min
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sugu-400 to-sugu-500 transition-all duration-500"
              style={{ width: `${row.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Pickup badge (only for pickup) */}
      {row.status === "pickup" && (
        <div className="mb-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            <PackageOpen className="h-3 w-3" />
            Ramassage en cours
          </span>
        </div>
      )}

      {/* Accept/Refuse buttons (only for to_accept) */}
      {row.status === "to_accept" && (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refuseMutation.mutate(row.id, {
                onSuccess: () => toast.info("Livraison refusée"),
              });
            }}
            disabled={refuseMutation.isPending}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            {refuseMutation.isPending ? (
              <Loader2 className="mx-auto h-3 w-3 animate-spin" />
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
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-green-500/20 transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {acceptMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Accepter ({formatCurrency(row.amount)} F)
          </button>
        </div>
      )}

      {/* Delivered info (only for delivered) */}
      {row.status === "delivered" && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Livré à {row.timeLabel}
        </div>
      )}

      {/* Fail reason text (only for failed) */}
      {row.status === "failed" && row.failReason && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-500 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          {row.failReason}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// DriverDeliveryDetailPanel — Detail panel (right side)
// ────────────────────────────────────────────────────────────

function DriverDeliveryDetailPanel({
  row,
  onClose,
  onMarkDelivered,
  onSignalDelay,
  onMarkFailed,
  onAccept,
  onRefuse,
  isMutating,
}: {
  row: DriverDeliveryRow;
  onClose: () => void;
  onMarkDelivered: (id: string) => void;
  onSignalDelay: (id: string) => void;
  onMarkFailed: (id: string) => void;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  isMutating: boolean;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col overflow-y-auto",
        "border-l border-gray-200/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/95",
        "lg:relative lg:inset-auto lg:max-w-none lg:w-[380px] lg:flex-shrink-0 lg:shadow-none",
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-100/60 px-4 py-3.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
            {row.orderId}
          </span>
          <StatusBadge status={row.status} label={row.statusLabel} />
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-0">
        {/* ── Section 1: Itinéraire ── */}
        <section
          aria-labelledby="panel-itinerary-heading"
          className="border-b border-gray-100/60 p-4 dark:border-gray-800/60"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <h2
              id="panel-itinerary-heading"
              className="text-xs font-bold text-gray-900 dark:text-white"
            >
              Itinéraire
            </h2>
          </div>
          <div className="space-y-2">
            {/* From */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="h-8 w-px border-l border-dashed border-gray-300 dark:border-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {row.itinerary.pickupName}
                </p>
                <p className="text-[10px] text-gray-400">
                  {row.itinerary.pickupAddress}
                </p>
              </div>
              {row.itinerary.fromTime && (
                <span className="text-[10px] font-semibold text-gray-500">
                  {row.itinerary.fromTime}
                </span>
              )}
            </div>
            {/* To */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-sugu-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {row.itinerary.deliveryName}
                </p>
                <p className="text-[10px] text-gray-400">
                  {row.itinerary.deliveryAddress}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-[10px] text-gray-500">
            <span>{row.itinerary.distanceKm} km</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>~{row.itinerary.durationMin} min</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{row.parcelCount} colis</span>
          </div>
        </section>

        {/* ── Section 2: Client ── */}
        <section
          aria-labelledby="panel-client-heading"
          className="border-b border-gray-100/60 p-4 dark:border-gray-800/60"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <h2
              id="panel-client-heading"
              className="text-xs font-bold text-gray-900 dark:text-white"
            >
              Client
            </h2>
          </div>
          <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                  row.client.avatarColor,
                )}
              >
                {row.client.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {row.client.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{row.client.address}</span>
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <a
                href={`tel:${row.client.phone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Phone className="h-3 w-3" />
                Appeler
              </a>
              <a
                href={`sms:${row.client.phone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-green-600"
              >
                <MessageCircle className="h-3 w-3" />
                SMS
              </a>
            </div>
          </div>
          {row.client.note && (
            <div className="rounded-lg bg-amber-50/60 border border-amber-100/60 p-2.5 mt-3 dark:bg-amber-950/20 dark:border-amber-900/30">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                {row.client.note}
              </p>
            </div>
          )}
        </section>

        {/* ── Section 3: Commande ── */}
        <section
          aria-labelledby="panel-order-heading"
          className="border-b border-gray-100/60 p-4 dark:border-gray-800/60"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-gray-400" />
            <h2
              id="panel-order-heading"
              className="text-xs font-bold text-gray-900 dark:text-white"
            >
              Commande
            </h2>
          </div>
          <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {row.orderItems} articles :{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(row.orderTotal)} FCFA
              </span>
            </p>
            <span
              className={cn(
                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                row.orderPayment === "paid"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
              )}
            >
              {row.orderPayment === "paid" ? "● Payé" : "● COD (à encaisser)"}
            </span>
          </div>
        </section>

        {/* ── Section 4: Timeline / Progression ── */}
        <section
          aria-labelledby="panel-timeline-heading"
          className="border-b border-gray-100/60 p-4 dark:border-gray-800/60"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <h2
              id="panel-timeline-heading"
              className="text-xs font-bold text-gray-900 dark:text-white"
            >
              Progression
            </h2>
          </div>
          <ol aria-label="Étapes de livraison" className="space-y-2">
            {row.timeline.map((step) => (
              <li key={step.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                    step.done
                      ? "bg-green-500"
                      : step.current
                        ? "bg-sugu-500 ring-2 ring-sugu-200 dark:ring-sugu-900"
                        : "bg-gray-200 dark:bg-gray-700",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-xs",
                    step.done
                      ? "font-medium text-gray-700 dark:text-gray-300"
                      : step.current
                        ? "font-semibold text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-600",
                  )}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-gray-400">
                  {step.time ?? "—"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* ── Section 5: Actions (sticky bottom) ── */}
      <div className="space-y-2 border-t border-gray-100/60 p-4 dark:border-gray-800">
        {/* en_route: Mark delivered + Signal delay + Mark failed */}
        {row.status === "en_route" && (
          <>
            <button
              id={`btn-mark-delivered-${row.id}`}
              disabled={isMutating}
              onClick={() => onMarkDelivered(row.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/25 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Marquer comme livré
            </button>
            <button
              id={`btn-signal-delay-${row.id}`}
              disabled={isMutating}
              onClick={() => onSignalDelay(row.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-60"
            >
              <AlertTriangle className="h-4 w-4" />
              Signaler retard
            </button>
            <button
              id={`btn-fail-delivery-${row.id}`}
              disabled={isMutating}
              onClick={() => onMarkFailed(row.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              Échec livraison
            </button>
          </>
        )}

        {/* pickup: Collecte effectuée + Mark failed */}
        {row.status === "pickup" && (
          <>
            <button
              id={`btn-pickup-done-${row.id}`}
              disabled={isMutating}
              onClick={() => onMarkDelivered(row.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-sugu-500/25 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Collecte effectuée
            </button>
            <button
              id={`btn-fail-pickup-${row.id}`}
              disabled={isMutating}
              onClick={() => onMarkFailed(row.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              Échec
            </button>
          </>
        )}

        {/* to_accept: Accept + Refuse */}
        {row.status === "to_accept" && (
          <div className="flex items-center gap-2">
            <button
              id={`btn-refuse-panel-${row.id}`}
              disabled={isMutating}
              onClick={() => onRefuse(row.id)}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 disabled:opacity-60"
            >
              Refuser
            </button>
            <button
              id={`btn-accept-panel-${row.id}`}
              disabled={isMutating}
              onClick={() => onAccept(row.id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-2 text-sm font-semibold text-white shadow-md shadow-green-500/25 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accepter
            </button>
          </div>
        )}

        {/* Google Maps link */}
        {!["delivered", "failed"].includes(row.status) && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.client.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400 dark:hover:text-sugu-300"
          >
            <Navigation className="h-3 w-3" />
            Ouvrir dans Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Status Tabs
// ────────────────────────────────────────────────────────────

type DriverStatusTab =
  | "all"
  | "to_accept"
  | "en_route"
  | "delivered"
  | "failed";

const DRIVER_STATUS_TABS: {
  key: DriverStatusTab;
  label: string;
  icon: React.ReactNode;
  iconClass: string;
}[] = [
  {
    key: "all",
    label: "Tous",
    icon: <Bike className="h-3.5 w-3.5" />,
    iconClass: "text-sugu-500",
  },
  {
    key: "to_accept",
    label: "À accepter",
    icon: <Hourglass className="h-3.5 w-3.5" />,
    iconClass: "text-amber-500",
  },
  {
    key: "en_route",
    label: "En cours",
    icon: <Navigation className="h-3.5 w-3.5" />,
    iconClass: "text-sugu-500",
  },
  {
    key: "delivered",
    label: "Livrées",
    icon: <PackageCheck className="h-3.5 w-3.5" />,
    iconClass: "text-green-500",
  },
  {
    key: "failed",
    label: "Échecs",
    icon: <PackageX className="h-3.5 w-3.5" />,
    iconClass: "text-red-500",
  },
];

function _tabToDriverStatus(
  tab: DriverStatusTab,
): DriverDeliveryStatus | undefined {
  const map: Record<DriverStatusTab, DriverDeliveryStatus | undefined> = {
    all: undefined,
    to_accept: "to_accept",
    en_route: "en_route",
    delivered: "delivered",
    failed: "failed",
  };
  return map[tab];
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function DriverDeliveriesContent() {
  const [activeTab, setActiveTab] = useState<DriverStatusTab>("all");
  const [search, setSearch] = useState("");
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  // ── Build filters from UI state ──
  const filters: DriverDeliveryFilters = {
    status: _tabToDriverStatus(activeTab),
    search: search || undefined,
  };

  // ── Data fetching ──
  const { data, isLoading, isError } = useDriverDeliveries(filters);

  // ── Mutations ──
  const acceptMutation = useAcceptDelivery();
  const refuseMutation = useRefuseDelivery();
  const markDeliveredMutation = useMarkDelivered();
  const signalDelayMutation = useSignalDelay();
  const markFailedMutation = useMarkFailed();

  const isMutating =
    acceptMutation.isPending ||
    refuseMutation.isPending ||
    markDeliveredMutation.isPending ||
    signalDelayMutation.isPending ||
    markFailedMutation.isPending;

  const handleAccept = useCallback(
    (id: string) => {
      acceptMutation.mutate(id, {
        onSuccess: () => toast.success("Livraison acceptée !"),
      });
    },
    [acceptMutation],
  );

  const handleRefuse = useCallback(
    (id: string) => {
      refuseMutation.mutate(id, {
        onSuccess: () => toast.info("Livraison refusée"),
      });
    },
    [refuseMutation],
  );

  const handleMarkDelivered = useCallback(
    (id: string) => {
      markDeliveredMutation.mutate(id, {
        onSuccess: () => toast.success("Livraison marquée comme livrée ✅"),
      });
    },
    [markDeliveredMutation],
  );

  const handleSignalDelay = useCallback(
    (id: string) => {
      signalDelayMutation.mutate(id, {
        onSuccess: () => toast.warning("Retard signalé à l'agence"),
      });
    },
    [signalDelayMutation],
  );

  const handleMarkFailed = useCallback(
    (id: string) => {
      markFailedMutation.mutate(id, {
        onSuccess: () => toast.error("Livraison marquée comme échouée"),
      });
    },
    [markFailedMutation],
  );

  const handleTabChange = (tab: DriverStatusTab) => {
    setActiveTab(tab);
    setOpenDetailId(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
          <p className="text-sm text-gray-500">
            Chargement des livraisons…
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <XCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-500">
            Erreur lors du chargement des livraisons.
          </p>
        </div>
      </div>
    );
  }

  const { summary, rows, statusCounts } = data;

  // Client-side search within already-filtered results
  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      !search ||
      r.orderId.toLowerCase().includes(search.toLowerCase()) ||
      r.client.name.toLowerCase().includes(search.toLowerCase()) ||
      r.itinerary.pickupName.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const openDetail =
    filteredRows.find((r) => r.id === openDetailId) ?? null;

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ════ LEFT — List panel ════ */}
      <div className="flex min-w-0 flex-1 flex-col space-y-4 overflow-y-auto pr-1">
        {/* ────── Header ────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mes Livraisons
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              En service
            </span>
          </div>
        </div>

        {/* ────── KPI Summary Bar ────── */}
        <div className="glass-card flex items-center justify-around rounded-2xl p-3">
          {[
            {
              icon: "📦",
              label: "TOTAL",
              value: summary.total,
              color: "text-gray-900 dark:text-white",
            },
            {
              icon: "✅",
              label: "LIVRÉES",
              value: summary.delivered,
              color: "text-green-600 dark:text-green-400",
            },
            {
              icon: "🕐",
              label: "EN COURS",
              value: summary.inProgress,
              color: "text-sugu-600 dark:text-sugu-400",
            },
            {
              icon: "❌",
              label: "ÉCHECS",
              value: summary.failed,
              color: "text-red-500",
            },
          ].map((stat, i) => (
            <Fragment key={stat.label}>
              {i > 0 && (
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              )}
              <div className="flex flex-col items-center">
                <span
                  className={`text-xl font-extrabold ${stat.color}`}
                >
                  {stat.value}
                </span>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  {stat.icon} {stat.label}
                </span>
              </div>
            </Fragment>
          ))}
        </div>

        {/* ────── Status Tabs ────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {DRIVER_STATUS_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? statusCounts.all
                : statusCounts[
                    tab.key as keyof typeof statusCounts
                  ];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-sugu-500 text-white shadow-sm"
                    : "bg-white/60 text-gray-600 hover:bg-white/80 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-900/60",
                )}
              >
                <span
                  className={cn(
                    "flex items-center",
                    isActive ? "text-white" : tab.iconClass,
                  )}
                >
                  {tab.icon}
                </span>
                {tab.label}
                {/* Pulsing dot for to_accept tab */}
                {tab.key === "to_accept" &&
                  statusCounts.to_accept > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {count ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ────── Search ────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Rechercher..."
            aria-label="Rechercher des livraisons"
            className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-9 pr-4 text-sm text-gray-700 backdrop-blur-sm placeholder:text-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 dark:placeholder:text-gray-500"
          />
        </div>

        {/* ────── Delivery Cards ────── */}
        <div className="space-y-2.5 pb-4">
          {filteredRows.length > 0 ? (
            filteredRows.map((row) => (
              <DeliveryCard
                key={row.id}
                row={row}
                isSelected={openDetailId === row.id}
                onClick={() =>
                  setOpenDetailId(
                    openDetailId === row.id ? null : row.id,
                  )
                }
              />
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">
                Aucune livraison trouvée
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-xs font-medium text-sugu-500 hover:text-sugu-600"
                >
                  Effacer la recherche
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════ RIGHT — Detail Panel ════ */}
      {openDetail && (
        <div className="ml-4 hidden lg:flex">
          <DriverDeliveryDetailPanel
            row={openDetail}
            onClose={() => setOpenDetailId(null)}
            onMarkDelivered={handleMarkDelivered}
            onSignalDelay={handleSignalDelay}
            onMarkFailed={handleMarkFailed}
            onAccept={handleAccept}
            onRefuse={handleRefuse}
            isMutating={isMutating}
          />
        </div>
      )}

      {/* Mobile detail panel overlay */}
      {openDetail && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpenDetailId(null)}
            aria-hidden="true"
          />
          <DriverDeliveryDetailPanel
            row={openDetail}
            onClose={() => setOpenDetailId(null)}
            onMarkDelivered={handleMarkDelivered}
            onSignalDelay={handleSignalDelay}
            onMarkFailed={handleMarkFailed}
            onAccept={handleAccept}
            onRefuse={handleRefuse}
            isMutating={isMutating}
          />
        </div>
      )}
    </div>
  );
}
