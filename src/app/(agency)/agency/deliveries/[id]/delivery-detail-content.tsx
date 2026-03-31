"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, XCircle, Package } from "lucide-react";
import type { DeliveryDetailRow } from "@/features/agency/schema";
import {
  useDeliveryDetail,
  useUpdateDeliveryStatus,
  useAddShipmentNote,
} from "@/features/agency/hooks";

import { AgencyCodMixteBadge, StatusBadge, PriorityBadge } from "./components/badges";
import { DetailSkeleton } from "./components/skeletons";
import {
  DeliveryDetailTrackingSection,
  DeliveryDetailDriverSection,
  DeliveryDetailClientSection,
  DeliveryDetailOrderSection,
  DeliveryDetailItinerarySection,
  DeliveryDetailActionsSection,
  DeliveryDetailNotesSection,
} from "./components/sections";

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────

interface DeliveryDetailContentProps {
  shipmentId: string;
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function DeliveryDetailContent({
  shipmentId,
}: DeliveryDetailContentProps) {
  const { data: row, isLoading, isError } = useDeliveryDetail(shipmentId);
  const detailRow = row as DeliveryDetailRow | undefined;
  const updateStatus = useUpdateDeliveryStatus();
  const addNote = useAddShipmentNote(shipmentId);
  const isMutating = updateStatus.isPending || addNote.isPending;

  const [internalNote, setInternalNote] = useState("");

  // ── Loading state ──
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-7 w-7 text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Erreur lors du chargement de la livraison.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1 rounded-xl bg-sugu-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sugu-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ── Not found state ──
  if (!row || !detailRow) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Package className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Livraison introuvable
          </p>
          <Link
            href="/agency/deliveries"
            className="mt-1 text-sm font-semibold text-sugu-500 hover:text-sugu-600"
          >
            ← Retour aux livraisons
          </Link>
        </div>
      </div>
    );
  }

  // ── Enriched timeline data ──
  const trackingTimeMap: Record<string, string> = {};
  if (detailRow.trackingEvents && detailRow.trackingEvents.length > 0) {
    for (const te of detailRow.trackingEvents) {
      const timeStr = new Date(te.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (te.status === "assigned" || te.event_type === "assigned") trackingTimeMap["t2"] = timeStr;
      if (te.status === "in_transit" || te.event_type === "picked_up") trackingTimeMap["t3"] = timeStr;
      if (te.event_type === "departed" || te.event_type === "in_transit") trackingTimeMap["t4"] = timeStr;
      if (te.status === "delivered" || te.event_type === "delivered") trackingTimeMap["t5"] = timeStr;
    }
  }

  const enrichedTimeline = detailRow.timeline ? detailRow.timeline.map((step) => {
    const extras: Record<string, { sub: string; time: string }> = {
      t2: { sub: detailRow.driver?.name ?? "—", time: trackingTimeMap["t2"] ?? "—" },
      t3: { sub: detailRow.itinerary.from, time: trackingTimeMap["t3"] ?? "—" },
      t4: {
        sub: `${detailRow.itinerary.to} — ETA ${detailRow.eta}`,
        time: trackingTimeMap["t4"] ?? (detailRow.itinerary.fromTime || "—"),
      },
      t5: { sub: "", time: trackingTimeMap["t5"] ?? "—" },
    };
    return { ...step, ...(extras[step.id] ?? { sub: "", time: "—" }) };
  }) : [];

  // ── Computed values from real data ──
  const deliveryFee = detailRow.shippingAmount || 0;
  const orderSubtotal = detailRow.orderTotal || 0;
  const totalWithFees = orderSubtotal + deliveryFee;

  const doneSteps = detailRow.timeline ? detailRow.timeline.filter((s) => s.done).length : 0;
  const totalSteps = detailRow.timeline ? detailRow.timeline.length : 0;
  const completionPercent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  /* eslint-disable react-hooks/purity */
  const statusUpdateLabel = detailRow.statusUpdatedAt
    ? (() => {
        const diffSec = Math.floor((Date.now() - new Date(detailRow.statusUpdatedAt).getTime()) / 1000);
        if (diffSec < 60) return `il y a ${diffSec}s`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `il y a ${diffMin}min`;
        return `il y a ${Math.floor(diffMin / 60)}h`;
      })()
    : "—";
  /* eslint-enable react-hooks/purity */

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-5">
      {/* HEADER BAR */}
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-card-enter" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-3">
          <Link href="/agency/deliveries" className="flex items-center gap-1.5 text-sm font-medium text-sugu-500 hover:text-sugu-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Retour aux livraisons
          </Link>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-lg font-bold text-gray-900">{row.orderId}</span>
          <StatusBadge status={row.status} label={row.statusLabel} />
          <PriorityBadge priority={row.priority} />
          {detailRow.codMixte?.isCodMixte && <AgencyCodMixteBadge codMixte={detailRow.codMixte} />}
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors" aria-label="Plus d'options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <DeliveryDetailTrackingSection row={row} detailRow={detailRow} completionPercent={completionPercent} statusUpdateLabel={statusUpdateLabel} />
        <DeliveryDetailDriverSection row={row} detailRow={detailRow} />
        <DeliveryDetailClientSection row={row} />
        <DeliveryDetailOrderSection row={row} detailRow={detailRow} orderSubtotal={orderSubtotal} deliveryFee={deliveryFee} totalWithFees={totalWithFees} />
        <DeliveryDetailItinerarySection row={row} enrichedTimeline={enrichedTimeline} />
        <div className="space-y-4 lg:space-y-5">
          <DeliveryDetailActionsSection row={row} updateStatus={updateStatus} isMutating={isMutating} />
          <DeliveryDetailNotesSection detailRow={detailRow} internalNote={internalNote} setInternalNote={setInternalNote} addNote={addNote} />
        </div>
      </div>
    </div>
  );
}
