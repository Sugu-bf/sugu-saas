"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, XCircle, Package } from "lucide-react";
import type { DeliveryDetailRow } from "@/features/agency/schema";
import {
  useDeliveryDetail,
  useUpdateDeliveryStatus,
  useAddShipmentNote,
} from "@/features/agency/hooks";

import { AssignCourierModal } from "../assign-courier-modal";

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
  DeliveryDetailAgencyDecisionSection,
  DeliveryDetailReassignSection,
  DeliveryDetailStopsSection,
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
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

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

  // D3b — the agency timeline now comes from the single canonical projection
  // (detailRow.canonicalTimeline). The legacy detailRow.timeline and the
  // tracking_events-derived enrichment are no longer read on this page.

  // ── Computed values from real data ──
  const deliveryFee = detailRow.shippingAmount || 0;
  const orderSubtotal = detailRow.orderTotal || 0;
  const totalWithFees = orderSubtotal + deliveryFee;

  const doneSteps = detailRow.canonicalTimeline.filter((s) => s.status === "done").length;
  const totalSteps = detailRow.canonicalTimeline.length;
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
      {/* MOBILE NATIVE PWA HEADER BAR */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-gray-100/80 bg-white/90 p-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/90 sm:static sm:z-auto sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <Link
            href="/agency/deliveries"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 transition-all hover:bg-gray-200 active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label="Retour aux livraisons"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-mono text-base font-black tracking-tight text-gray-900 dark:text-white sm:text-xl">
              {row.orderId}
            </h1>
            <p className="text-[11px] font-semibold text-gray-400 sm:hidden">
              Détails de la livraison
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <StatusBadge status={row.status} label={row.statusLabel} />
          <PriorityBadge priority={row.priority} />
          {detailRow.codMixte?.isCodMixte && <AgencyCodMixteBadge codMixte={detailRow.codMixte} />}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <DeliveryDetailTrackingSection row={row} detailRow={detailRow} completionPercent={completionPercent} statusUpdateLabel={statusUpdateLabel} />
        <DeliveryDetailDriverSection row={row} detailRow={detailRow} onOpenAssign={() => setIsAssignModalOpen(true)} />
        <DeliveryDetailClientSection row={row} />
        <DeliveryDetailOrderSection row={row} detailRow={detailRow} orderSubtotal={orderSubtotal} deliveryFee={deliveryFee} totalWithFees={totalWithFees} />
        <DeliveryDetailItinerarySection row={row} canonicalTimeline={detailRow.canonicalTimeline} />
        <div className="space-y-4 lg:space-y-5">
          <DeliveryDetailAgencyDecisionSection shipmentId={shipmentId} detailRow={detailRow} />
          <DeliveryDetailReassignSection shipmentId={shipmentId} detailRow={detailRow} />
          <DeliveryDetailActionsSection row={row} updateStatus={updateStatus} isMutating={isMutating} />
          <DeliveryDetailNotesSection detailRow={detailRow} internalNote={internalNote} setInternalNote={setInternalNote} addNote={addNote} />
        </div>
        {detailRow.stops && detailRow.stops.length > 0 && (
          <DeliveryDetailStopsSection stops={detailRow.stops} />
        )}
      </div>

      <AssignCourierModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        shipmentIds={[shipmentId]}
      />
    </div>
  );
}
