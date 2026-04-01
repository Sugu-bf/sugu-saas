"use client";

// ============================================================
// DriverDeliveryDetailPanel — side panel with full details
// ============================================================

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
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
  CheckCircle2,
  XCircle,
  User,
  Package,
  ArrowLeft,
} from "lucide-react";
import type { DriverDeliveryRow } from "@/features/driver/schema";
import { StatusBadge } from "./status-badge";

// ── Types ──────────────────────────────────────────────────

export interface DetailPanelActions {
  onClose: () => void;
  onStartTransit: (id: string) => void;
  onMarkArrived: (id: string) => void;
  onMarkDelivered: (id: string, code: string) => void;
  onSignalDelay: (id: string) => void;
  onMarkFailed: (id: string) => void;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  isMutating: boolean;
}

// ── Sub-components (sections) ──────────────────────────────

function SectionHeader({
  icon,
  iconBg,
  title,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        {icon}
      </div>
      <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );
}

function ItinerarySection({ row }: { row: DriverDeliveryRow }) {
  return (
    <section className="px-5 py-4">
      <SectionHeader
        icon={<MapPin className="h-3.5 w-3.5 text-blue-500" />}
        iconBg="bg-blue-50 dark:bg-blue-950/40"
        title="Itinéraire"
      />
      <div className="rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 p-4">
        <div className="space-y-3">
          {/* From */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="h-8 w-px border-l-2 border-dashed border-gray-300/70 dark:border-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {row.itinerary.pickupName}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {row.itinerary.pickupAddress}
              </p>
            </div>
            {row.itinerary.fromTime && (
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                {row.itinerary.fromTime}
              </span>
            )}
          </div>
          {/* To */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <span className="h-3 w-3 rounded-full bg-sugu-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {row.itinerary.deliveryName}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {row.itinerary.deliveryAddress}
              </p>
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div className="mt-3 flex items-center gap-2">
          {[
            `${row.itinerary.distanceKm} km`,
            `~${row.itinerary.durationMin} min`,
            `${row.parcelCount} colis`,
          ].map((info, i) => (
            <Fragment key={info}>
              {i > 0 && (
                <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
              )}
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                {info}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClientSection({ row }: { row: DriverDeliveryRow }) {
  return (
    <section className="px-5 py-4 border-t border-gray-100/60 dark:border-gray-800/40">
      <SectionHeader
        icon={<User className="h-3.5 w-3.5 text-sugu-500" />}
        iconBg="bg-sugu-50 dark:bg-sugu-950/40"
        title="Client"
      />
      <div className="rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold",
              row.client.avatarColor,
            )}
          >
            {row.client.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {row.client.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{row.client.address}</span>
            </div>
          </div>
        </div>
        {/* Quick actions */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={`tel:${row.client.phone}`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 py-2 text-[11px] font-semibold text-gray-700 transition-all hover:bg-white hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            Appeler
          </a>
          <a
            href={`sms:${row.client.phone}`}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-[11px] font-bold text-white transition-all hover:bg-green-600"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            SMS
          </a>
        </div>
      </div>
      {/* Client note */}
      {row.client.note && (
        <div className="mt-3 rounded-xl bg-amber-50/80 border border-amber-200/50 p-3 dark:bg-amber-950/20 dark:border-amber-900/30">
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-amber-500" />
            {row.client.note}
          </p>
        </div>
      )}
    </section>
  );
}

function OrderSection({ row }: { row: DriverDeliveryRow }) {
  return (
    <section className="px-5 py-4 border-t border-gray-100/60 dark:border-gray-800/40">
      <SectionHeader
        icon={<Package className="h-3.5 w-3.5 text-purple-500" />}
        iconBg="bg-purple-50 dark:bg-purple-950/40"
        title="Commande"
      />
      <div className="rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {row.orderItems} articles
          </p>
          <span className="text-sm font-extrabold text-gray-900 dark:text-white">
            {formatCurrency(row.orderTotal)} FCFA
          </span>
        </div>
        <div className="mt-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
              row.orderPayment === "paid"
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                row.orderPayment === "paid" ? "bg-green-500" : "bg-amber-500",
              )}
            />
            {row.orderPayment === "paid"
              ? "Payé en ligne"
              : "COD · À encaisser"}
          </span>
        </div>
      </div>
    </section>
  );
}

function TimelineSection({ row }: { row: DriverDeliveryRow }) {
  return (
    <section className="px-5 py-4 border-t border-gray-100/60 dark:border-gray-800/40">
      <SectionHeader
        icon={<Clock className="h-3.5 w-3.5 text-cyan-500" />}
        iconBg="bg-cyan-50 dark:bg-cyan-950/40"
        title="Progression"
      />
      <ol aria-label="Étapes de livraison" className="space-y-0">
        {row.timeline.map((step, i) => (
          <li key={step.id} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "h-3 w-3 flex-shrink-0 rounded-full border-2 transition-all",
                  step.done
                    ? "bg-green-500 border-green-500"
                    : step.current
                      ? "bg-sugu-500 border-sugu-500 ring-4 ring-sugu-100 dark:ring-sugu-900/40"
                      : "bg-white border-gray-300 dark:bg-gray-900 dark:border-gray-600",
                )}
              />
              {i < row.timeline.length - 1 && (
                <span
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px]",
                    step.done
                      ? "bg-green-300 dark:bg-green-700"
                      : "bg-gray-200 dark:bg-gray-700",
                  )}
                />
              )}
            </div>
            <div className="flex-1 pb-3 flex items-start justify-between">
              <span
                className={cn(
                  "text-xs",
                  step.done
                    ? "font-medium text-gray-700 dark:text-gray-300"
                    : step.current
                      ? "font-bold text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-gray-600",
                )}
              >
                {step.label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  step.done
                    ? "text-green-500"
                    : step.time
                      ? "text-gray-400"
                      : "text-gray-300 dark:text-gray-600",
                )}
              >
                {step.time ?? "—"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Action Buttons (sticky footer) ─────────────────────────

function PanelActions({
  row,
  actions,
}: {
  row: DriverDeliveryRow;
  actions: DetailPanelActions;
}) {
  const { onSignalDelay, onMarkFailed, onAccept, onRefuse, isMutating } =
    actions;

  return (
    <div className="border-t border-gray-100/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl p-4 space-y-2">
      {/* arrived */}
      {row.status === "arrived" && (
        <div className="rounded-xl border border-sugu-200 bg-sugu-50/50 p-4 space-y-3">
          <label className="block text-sm font-semibold text-sugu-900">
            Code de sécurité du client
          </label>
          <input 
            type="text" 
            id={`input-code-${row.id}`}
            placeholder="ex: ABC12"
            className="w-full rounded-lg border border-sugu-200 p-2 text-sm font-medium focus:border-sugu-500 focus:ring-2 focus:ring-sugu-500/20"
            disabled={isMutating}
          />
          <button
            id={`btn-mark-delivered-${row.id}`}
            disabled={isMutating}
            onClick={() => {
              const el = document.getElementById(`input-code-${row.id}`) as HTMLInputElement;
              actions.onMarkDelivered(row.id, el?.value || "");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Valider le code et Livrer
          </button>
        </div>
      )}

      {/* en_route */}
      {row.status === "en_route" && (
        <>
          <button
            id={`btn-mark-arrived-${row.id}`}
            disabled={isMutating}
            onClick={() => actions.onMarkArrived(row.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Je suis arrivé
          </button>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              id={`btn-signal-delay-${row.id}`}
              disabled={isMutating}
              onClick={() => onSignalDelay(row.id)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-200/80 bg-amber-50/80 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-60"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Retard
            </button>
            <button
              id={`btn-fail-delivery-${row.id}`}
              disabled={isMutating}
              onClick={() => onMarkFailed(row.id)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-200/80 bg-red-50/80 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-60"
            >
              <XCircle className="h-3.5 w-3.5" />
              Échec
            </button>
          </div>
        </>
      )}

      {/* pickup */}
      {row.status === "pickup" && (
        <>
          <button
            id={`btn-start-transit-${row.id}`}
            disabled={isMutating}
            onClick={() => actions.onStartTransit(row.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Commencer l&apos;itinéraire
          </button>
          <button
            id={`btn-fail-pickup-${row.id}`}
            disabled={isMutating}
            onClick={() => onMarkFailed(row.id)}
            className="flex w-full mt-2 items-center justify-center gap-1.5 rounded-2xl border border-red-200/80 bg-red-50/80 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            Signaler un échec
          </button>
        </>
      )}

      {/* to_accept */}
      {row.status === "to_accept" && (
        <div className="flex items-center gap-2">
          <button
            id={`btn-refuse-panel-${row.id}`}
            disabled={isMutating}
            onClick={() => onRefuse(row.id)}
            className="flex-1 rounded-2xl border border-gray-200/80 bg-white/80 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400 disabled:opacity-60"
          >
            Refuser
          </button>
          <button
            id={`btn-accept-panel-${row.id}`}
            disabled={isMutating}
            onClick={() => onAccept(row.id)}
            className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-2xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 transition-all active:scale-[0.98] disabled:opacity-60"
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

      {/* Google Maps */}
      {!["delivered", "failed"].includes(row.status) && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.client.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-sugu-500 hover:text-sugu-600 hover:bg-sugu-50/50 transition-all dark:text-sugu-400 dark:hover:text-sugu-300 dark:hover:bg-sugu-950/20"
        >
          <Navigation className="h-3.5 w-3.5" />
          Ouvrir dans Google Maps
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      )}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────

export function DriverDeliveryDetailPanel({
  row,
  ...actions
}: { row: DriverDeliveryRow } & DetailPanelActions) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-hidden",
        "bg-white/98 shadow-2xl backdrop-blur-2xl dark:bg-gray-950/98",
        "lg:relative lg:inset-auto lg:max-w-none lg:w-[400px] lg:flex-shrink-0 lg:shadow-none lg:border-l lg:border-gray-100/60 lg:dark:border-gray-800/60",
        "animate-slide-in-right",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100/60 dark:border-gray-800/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={actions.onClose}
            className="lg:hidden rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="font-mono text-sm font-extrabold text-gray-900 dark:text-white">
              {row.orderId}
            </span>
            <div className="mt-0.5">
              <StatusBadge status={row.status} label={row.statusLabel} />
            </div>
          </div>
        </div>
        <button
          onClick={actions.onClose}
          aria-label="Fermer le panneau"
          className="hidden lg:flex rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <ItinerarySection row={row} />
        <ClientSection row={row} />
        <OrderSection row={row} />
        <TimelineSection row={row} />
      </div>

      {/* Sticky actions */}
      <PanelActions row={row} actions={actions} />
    </aside>
  );
}
