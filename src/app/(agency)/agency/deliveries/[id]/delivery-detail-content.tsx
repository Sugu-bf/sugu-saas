"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  MoreHorizontal,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  Loader2,
  Check,
  Zap,
  StickyNote,
  Navigation,
  Package,
  User,
  Bike,
  CreditCard,
  Truck,
  AlertCircle,
  Clock,
} from "lucide-react";
import type {
  DeliveryDetailRow,
  DeliveryStatus,
  DeliveryPriority,
} from "@/features/agency/schema";
import {
  useDeliveryDetail,
  useUpdateDeliveryStatus,
} from "@/features/agency/hooks";
import { useAddShipmentNote } from "@/features/agency/hooks";


// ────────────────────────────────────────────────────────────
// COD Mixte Sub-components
// ────────────────────────────────────────────────────────────

const COD_STEP_LABELS: Record<string, string> = {
  awaiting_vendor: "Attente vendeur",
  awaiting_negotiation: "Négociation livraison",
  awaiting_delivery_payment: "Paiement livraison en attente",
  awaiting_pickup: "Coursier en route",
  awaiting_inspection: "Inspection par le client",
  awaiting_product_payment: "Paiement produit en attente",
  awaiting_code: "Code de livraison",
  completed: "Terminée",
};

type CodMixteData = NonNullable<DeliveryDetailRow["codMixte"]>;

function AgencyCodMixteBadge({ codMixte }: { codMixte: CodMixteData }) {
  const bothPaid = codMixte.deliveryFeePaid && codMixte.productFeePaid;
  const onePaid = codMixte.deliveryFeePaid || codMixte.productFeePaid;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold", bothPaid ? "border-green-200 bg-green-50 text-green-700" : onePaid ? "border-amber-200 bg-amber-50 text-amber-700" : "border-purple-200 bg-purple-50 text-purple-700")}>
      <CreditCard className="h-3 w-3" />
      COD Mixte
      <span className="flex gap-0.5 ml-0.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", codMixte.deliveryFeePaid ? "bg-green-500" : "bg-gray-300")} />
        <span className={cn("h-1.5 w-1.5 rounded-full", codMixte.productFeePaid ? "bg-green-500" : "bg-gray-300")} />
      </span>
    </span>
  );
}

function AgencyCodMixtePaymentCard({ codMixte }: { codMixte: CodMixteData }) {
  const stepLabel = COD_STEP_LABELS[codMixte.currentStep] ?? codMixte.currentStep;
  const bothPaid = codMixte.deliveryFeePaid && codMixte.productFeePaid;
  const isActionPending = codMixte.currentStep === "awaiting_delivery_payment" || codMixte.currentStep === "awaiting_product_payment";
  return (
    <div className="mt-3 space-y-2.5">
      <div className={cn("rounded-xl border p-3", isActionPending ? "bg-amber-50/60 border-amber-200" : bothPaid ? "bg-green-50/60 border-green-200" : "bg-blue-50/60 border-blue-200")}>
        <div className="flex items-center gap-2">
          {isActionPending ? (<AlertCircle className="h-3.5 w-3.5 text-amber-600" />) : bothPaid ? (<CheckCircle2 className="h-3.5 w-3.5 text-green-600" />) : (<Clock className="h-3.5 w-3.5 text-blue-600" />)}
          <span className={cn("text-[11px] font-bold", isActionPending ? "text-amber-700" : bothPaid ? "text-green-700" : "text-blue-700")}>COD Mixte : {stepLabel}</span>
        </div>
        <div className="mt-2 flex gap-1">
          <div className="flex-1"><div className={cn("h-1.5 rounded-full", codMixte.deliveryFeePaid ? "bg-green-500" : "bg-gray-200")} /><p className="text-[9px] text-gray-500 mt-0.5 text-center">Livraison</p></div>
          <div className="flex-1"><div className={cn("h-1.5 rounded-full", codMixte.productFeePaid ? "bg-green-500" : "bg-gray-200")} /><p className="text-[9px] text-gray-500 mt-0.5 text-center">Produit</p></div>
        </div>
      </div>
      <div className="space-y-1.5">
        <AgencyCodFeeRow label="Frais de livraison" amount={codMixte.deliveryFeeAmount} paid={codMixte.deliveryFeePaid} paidAt={codMixte.deliveryFeePaidAt} icon={<Truck className="h-3 w-3" />} />
        <AgencyCodFeeRow label="Frais produit" amount={codMixte.productFeeAmount} paid={codMixte.productFeePaid} paidAt={codMixte.productFeePaidAt} icon={<Package className="h-3 w-3" />} />
      </div>
    </div>
  );
}

function AgencyCodFeeRow({ label, amount, paid, icon }: { label: string; amount: number; paid: boolean; paidAt: string | null; icon: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-[11px]", paid ? "bg-green-50/50 border-green-200/60" : "bg-white/50 border-gray-200/60")}>
      <span className={cn("flex-shrink-0", paid ? "text-green-600" : "text-gray-400")}>{icon}</span>
      <span className={cn("flex-1 font-medium", paid ? "text-green-700" : "text-gray-700")}>{label}</span>
      <span className={cn("font-bold", paid ? "text-green-600" : "text-gray-700")}>{formatCurrency(amount)} FCFA</span>
      <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold", paid ? "border-green-200 bg-green-50 text-green-600" : "border-amber-200 bg-amber-50 text-amber-600")}>{paid ? "Pay\u00e9" : "Attente"}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Status & Priority config (same pattern as deliveries-content.tsx)
// ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "En attente",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  pickup: {
    label: "Ramassage",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  en_route: {
    label: "En route",
    bg: "bg-sugu-50",
    text: "text-sugu-700",
    dot: "bg-sugu-500",
  },
  delivered: {
    label: "Livré",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  delayed: {
    label: "Retard",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  returned: {
    label: "Échoué",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

const PRIORITY_CONFIG: Record<
  DeliveryPriority,
  { label: string; dot: string; text: string }
> = {
  urgent: { label: "Urgent", dot: "bg-red-500", text: "text-red-600" },
  normal: { label: "Normal", dot: "bg-amber-400", text: "text-amber-600" },
  low: { label: "Bas", dot: "bg-green-400", text: "text-green-600" },
};

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  label,
}: {
  status: DeliveryStatus;
  label: string;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        cfg.bg,
        cfg.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: DeliveryPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        cfg.text,
        priority === "urgent"
          ? "border-red-200 bg-red-50"
          : priority === "normal"
            ? "border-amber-200 bg-amber-50"
            : "border-green-200 bg-green-50"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Loading skeleton
// ────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-4 lg:space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 rounded-lg bg-gray-200 animate-shimmer" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded-full bg-gray-200 animate-shimmer" />
          <div className="h-7 w-20 rounded-full bg-gray-200 animate-shimmer" />
          <div className="h-7 w-16 rounded-full bg-gray-200 animate-shimmer" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Suivi */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-44 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="h-[250px] rounded-xl bg-gray-100 animate-shimmer" />
          <div className="h-4 w-36 rounded bg-gray-200 animate-shimmer mt-3" />
        </div>
        {/* Livreur */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-24 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-gray-200 animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 animate-shimmer" />
              <div className="h-3 w-24 rounded bg-gray-200 animate-shimmer" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="h-9 flex-1 rounded-xl bg-gray-200 animate-shimmer" />
            <div className="h-9 flex-1 rounded-xl bg-gray-200 animate-shimmer" />
          </div>
        </div>
        {/* Client */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-20 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-40 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-36 rounded bg-gray-200 animate-shimmer" />
          </div>
          <div className="h-9 w-full rounded-xl bg-gray-200 animate-shimmer mt-4" />
        </div>
        {/* Détails commande */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-36 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-32 rounded bg-gray-200 animate-shimmer" />
            <div className="h-3 w-48 rounded bg-gray-200 animate-shimmer" />
          </div>
        </div>
        {/* Itinéraire */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-28 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-3">
            <div className="h-12 w-full rounded bg-gray-200 animate-shimmer" />
            <div className="h-12 w-full rounded bg-gray-200 animate-shimmer" />
          </div>
        </div>
        {/* Actions */}
        <div className="glass-card rounded-2xl p-4 lg:p-5">
          <div className="h-5 w-32 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-2">
            <div className="h-10 w-full rounded-xl bg-gray-200 animate-shimmer" />
            <div className="h-10 w-full rounded-xl bg-gray-200 animate-shimmer" />
            <div className="h-10 w-full rounded-xl bg-gray-200 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Map illustration placeholder (SVG)
// ────────────────────────────────────────────────────────────

function MapPlaceholder({ row }: { row: DeliveryDetailRow }) {
  return (
    <div className="relative h-[250px] lg:h-[280px] rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* SVG map illustration */}
      <svg
        viewBox="0 0 500 300"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background grid */}
        <defs>
          <pattern
            id="map-grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="500" height="300" fill="url(#map-grid)" />

        {/* "Roads" */}
        <path
          d="M 50 180 Q 150 180 200 140 Q 260 90 350 120 Q 420 140 460 100"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 80 250 Q 140 200 200 200 Q 280 200 320 160"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 160 50 Q 200 100 250 130 Q 300 155 380 180"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Dashed route line */}
        <path
          d="M 110 170 Q 180 120 250 130 Q 320 140 380 120"
          fill="none"
          stroke="#f15412"
          strokeWidth="2.5"
          strokeDasharray="8 4"
          strokeLinecap="round"
        />

        {/* Point A (Blue) */}
        <circle cx="110" cy="170" r="8" fill="#3b82f6" />
        <circle cx="110" cy="170" r="4" fill="white" />

        {/* Point B (Orange) */}
        <circle cx="380" cy="120" r="8" fill="#f15412" />
        <circle cx="380" cy="120" r="4" fill="white" />

        {/* Moto icon on the route */}
        <text x="245" y="115" fontSize="24" textAnchor="middle">
          ●
        </text>

        {/* A label */}
        <text
          x="95"
          y="205"
          fontSize="10"
          fontWeight="bold"
          fill="#1f2937"
          fontFamily="sans-serif"
        >
          A
        </text>

        {/* B label */}
        <text
          x="395"
          y="115"
          fontSize="10"
          fontWeight="bold"
          fill="#1f2937"
          fontFamily="sans-serif"
        >
          B
        </text>
      </svg>

      {/* Location labels overlaid */}
      <div className="absolute top-3 left-3 max-w-[45%]">
        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold text-gray-800 leading-tight">
            {row.vendor} —
          </p>
          <p className="text-[9px] text-gray-500 leading-tight">
            {row.itinerary.from}
          </p>
        </div>
      </div>

      <div className="absolute top-3 right-3 max-w-[45%]">
        <div className="rounded-lg bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm text-right">
          <p className="text-[10px] font-bold text-gray-800 leading-tight">
            {row.client.name} —
          </p>
          <p className="text-[9px] text-gray-500 leading-tight">
            {row.itinerary.to}
          </p>
        </div>
      </div>

      {/* ETA Pill */}
      <div className="absolute bottom-14 right-4">
        <span className="rounded-full bg-sugu-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
          ETA: {row.eta}
        </span>
      </div>

      {/* Bottom overlay - Address bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 to-transparent px-3 pb-2 pt-6">
        <div className="flex items-start gap-3 text-[10px]">
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
            <span className="text-gray-600 font-medium leading-tight">
              {row.vendor} — {row.itinerary.from}
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-sugu-500" />
            <span className="text-gray-600 font-medium leading-tight">
              {row.client.name} — {row.itinerary.to}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  // Map tracking events to timeline steps for timestamps
  const trackingTimeMap: Record<string, string> = {};
  if (detailRow.trackingEvents.length > 0) {
    for (const te of detailRow.trackingEvents) {
      const timeStr = new Date(te.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      // Map tracking event status to timeline step id
      if (te.status === "assigned" || te.event_type === "assigned") trackingTimeMap["t2"] = timeStr;
      if (te.status === "in_transit" || te.event_type === "picked_up") trackingTimeMap["t3"] = timeStr;
      if (te.event_type === "departed" || te.event_type === "in_transit") trackingTimeMap["t4"] = timeStr;
      if (te.status === "delivered" || te.event_type === "delivered") trackingTimeMap["t5"] = timeStr;
    }
  }

  const enrichedTimeline = detailRow.timeline.map((step) => {
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
  });

  // ── Computed values from real data ──
  const deliveryFee = detailRow.shippingAmount;
  const orderSubtotal = detailRow.orderTotal;
  const totalWithFees = orderSubtotal + deliveryFee;

  // Timeline completion percentage
  const doneSteps = detailRow.timeline.filter((s) => s.done).length;
  const totalSteps = detailRow.timeline.length;
  const completionPercent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  // Relative status update time
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
      {/* ════════════════════════════════════════════════════════
          HEADER BAR
          ════════════════════════════════════════════════════════ */}
      <div
        className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-card-enter"
        style={{ animationDelay: "0ms" }}
      >
        {/* Left: Back link */}
        <div className="flex items-center gap-3">
          <Link
            href="/agency/deliveries"
            className="flex items-center gap-1.5 text-sm font-medium text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux livraisons
          </Link>
        </div>

        {/* Right: Order ID + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-lg font-bold text-gray-900">
            {row.orderId}
          </span>
          <StatusBadge status={row.status} label={row.statusLabel} />
          <PriorityBadge priority={row.priority} />
          {detailRow.codMixte?.isCodMixte && (
            <AgencyCodMixteBadge codMixte={detailRow.codMixte} />
          )}
          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Plus d'options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN GRID
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* ────────────────────────────────────────────────────
            Suivi en temps réel (col 1, row 1)
            ──────────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
          style={{ animationDelay: "60ms" }}
          aria-labelledby="detail-tracking-heading"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <h2
                id="detail-tracking-heading"
                className="text-sm font-bold text-gray-900"
              >
                Suivi en temps réel
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-dot" />
              Mise à jour {statusUpdateLabel}
            </div>
          </div>

          <MapPlaceholder row={row} />

          <p className="mt-3 text-xs text-gray-500">
            {detailRow.itinerary.distanceKm} km — {completionPercent}% complété
          </p>
        </section>

        {/* ────────────────────────────────────────────────────
            Livreur (col 2, row 1)
            ──────────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
          style={{ animationDelay: "120ms" }}
          aria-labelledby="detail-driver-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <Bike className="h-4 w-4 text-gray-500" />
            <h2
              id="detail-driver-heading"
              className="text-sm font-bold text-gray-900"
            >
              Livreur
            </h2>
          </div>

          {row.driver ? (
            <div className="space-y-3">
              {/* Driver info row */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
                      row.driver.avatarColor
                    )}
                  >
                    {row.driver.initials}
                  </div>
                  {row.driver.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">
                      {row.driver.name}
                    </p>
                    {row.driver.online && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        En ligne
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      {row.driver.vehicle}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {row.driver.rating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {detailRow.driverPhone || "N/A"}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                  <Phone className="h-3.5 w-3.5" />
                  Appeler
                </button>
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-green-600">
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>

              {/* Profile link */}
              <Link
                href={`/agency/drivers/${row.driver.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
              >
                <Navigation className="h-3.5 w-3.5" />
                Voir le profil du livreur →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50/80 p-6 text-center">
              <UserCheck className="h-10 w-10 text-gray-300" />
              <p className="text-xs text-gray-400">Aucun livreur assigné</p>
              <button className="rounded-xl bg-sugu-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sugu-600 transition-colors">
                + Assigner
              </button>
            </div>
          )}
        </section>

        {/* ────────────────────────────────────────────────────
            Client (col 3, row 1)
            ──────────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
          style={{ animationDelay: "180ms" }}
          aria-labelledby="detail-client-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <h2
              id="detail-client-heading"
              className="text-sm font-bold text-gray-900"
            >
              Client
            </h2>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-bold text-gray-900">
              {row.client.name}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              {row.client.address}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              {row.client.phone || "Non renseigné"}
            </div>

            {/* Client note */}
            {row.client.note && (
              <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs italic text-amber-700">
                <StickyNote className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {row.client.note}
              </div>
            )}

            {/* Call button */}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 mt-2">
              <Phone className="h-3.5 w-3.5" />
              Appeler le client
            </button>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────
            Détails commande (col 1, row 2)
            ──────────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
          style={{ animationDelay: "240ms" }}
          aria-labelledby="detail-order-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <h2
              id="detail-order-heading"
              className="text-sm font-bold text-gray-900"
            >
              Détails commande
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left column */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">
                  {row.vendor}
                </span>
                <a
                  href={row.vendorUrl}
                  className="text-sugu-500 hover:text-sugu-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <p className="font-mono text-xs text-gray-500">
                Commande {row.orderId}
              </p>

              <p className="text-xs text-gray-800">
                {row.orderItems} articles ·{" "}
                <span className="font-bold">
                  {formatCurrency(orderSubtotal)} FCFA
                </span>
              </p>

              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  row.orderPayment === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    row.orderPayment === "paid"
                      ? "bg-green-500"
                      : "bg-amber-500"
                  )}
                />
                {row.orderPayment === "paid" ? "Payé" : "En attente"}
              </span>

              {/* COD Mixte payment card */}
              {detailRow.codMixte?.isCodMixte && (
                <AgencyCodMixtePaymentCard codMixte={detailRow.codMixte} />
              )}

              {/* Divider */}
              <div className="border-t border-gray-100 my-3" />

              {/* Articles list */}
              <p className="text-xs font-bold text-gray-700 mb-1">Articles:</p>
              <ul className="space-y-1 text-xs text-gray-600">
                {detailRow.orderItemsList.length > 0 ? (
                  detailRow.orderItemsList.map((item, i) => (
                    <li key={i}>
                      {item.qty}× {item.name} — {formatCurrency(item.unit_price / 100)} FCFA
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400 italic">Aucun article détaillé</li>
                )}
              </ul>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Frais de livraison:</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatCurrency(deliveryFee)} FCFA
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Total commande:</p>
                <p className="text-lg font-black text-gray-900">
                  {formatCurrency(totalWithFees)} FCFA
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Distance totale:</p>
                <p className="text-sm text-gray-700">
                  {row.itinerary.distanceKm} km
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Mode de paiement:
                </p>
                <span className="inline-flex items-center rounded-full bg-sugu-100 px-2.5 py-0.5 text-[11px] font-semibold text-sugu-700">
                  {detailRow.paymentMethod ?? "Non spécifié"}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500">Date commande:</p>
                <p className="text-xs font-medium text-gray-700">
                  {detailRow.orderDate}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────
            Itinéraire + Timeline (col 2, row 2)
            ──────────────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
          style={{ animationDelay: "300ms" }}
          aria-labelledby="detail-itinerary-heading"
        >
          <div className="mb-4 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-gray-500" />
            <h2
              id="detail-itinerary-heading"
              className="text-sm font-bold text-gray-900"
            >
              Itinéraire
            </h2>
          </div>

          {/* Route view */}
          <div className="space-y-0.5 mb-5">
            {/* Point A */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="h-6 w-px border-l border-dashed border-gray-300 mt-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900">
                  Point A — {row.vendor}
                </p>
                <p className="text-[10px] text-gray-400">
                  {row.itinerary.from}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold text-gray-500">
                {row.itinerary.fromTime || "18:35"}
              </span>
            </div>

            {/* Distance label */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span className="h-6 w-px border-l border-dashed border-gray-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">
                  {row.itinerary.distanceKm} km
                </span>
                <span className="text-[10px] font-bold text-sugu-500">
                  ETA {row.eta}
                </span>
              </div>
            </div>

            {/* Point B */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span className="h-3 w-3 rounded-full bg-sugu-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900">
                  Point B — {row.client.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {row.itinerary.to}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline stepper */}
          <div className="border-t border-gray-100 pt-4">
            <ol aria-label="Étapes de livraison" className="space-y-0">
              {enrichedTimeline.map((step, i) => {
                const isLast = i === enrichedTimeline.length - 1;
                return (
                  <li key={step.id} className="flex items-start gap-3">
                    {/* Dot + connecting line */}
                    <div className="flex flex-col items-center">
                      <div className="relative flex items-center justify-center">
                        {step.done && !step.current ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        ) : step.current ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sugu-500 ring-2 ring-sugu-200 animate-pulse-dot">
                            <span className="h-2 w-2 rounded-full bg-white" />
                          </span>
                        ) : (
                          <span className="h-5 w-5 rounded-full bg-gray-200" />
                        )}
                      </div>
                      {!isLast && (
                        <span
                          className={cn(
                            "h-8 w-0.5 mt-0.5",
                            step.done
                              ? "bg-green-300"
                              : "bg-gray-200"
                          )}
                        />
                      )}
                    </div>

                    {/* Label + sub + time */}
                    <div className="flex flex-1 items-start justify-between pb-2 min-w-0">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-xs",
                            step.done && !step.current
                              ? "font-medium text-gray-700"
                              : step.current
                                ? "font-bold text-sugu-600"
                                : "text-gray-400"
                          )}
                        >
                          {step.label}
                        </p>
                        {step.sub && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            {step.sub}
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-medium text-gray-400 ml-2">
                        {step.time}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────
            Actions rapides + Notes (col 3, row 2)
            ──────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:space-y-5">
          {/* Actions rapides */}
          <section
            className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
            style={{ animationDelay: "360ms" }}
            aria-labelledby="detail-actions-heading"
          >
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-500" />
              <h2
                id="detail-actions-heading"
                className="text-sm font-bold text-gray-900"
              >
                Actions rapides
              </h2>
            </div>

            <div className="space-y-2">
              {/* Marquer livrée */}
              {row.status === "en_route" && (
                <button
                  id={`btn-mark-delivered-${row.id}`}
                  onClick={() =>
                    updateStatus.mutate({
                      shipmentId: row.id,
                      status: "delivered",
                    })
                  }
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-sugu-500 py-3 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.98] disabled:opacity-60"
                >
                  {isMutating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Marquer comme livrée
                </button>
              )}

              {/* Signaler retard */}
              {row.status === "en_route" && (
                <button
                  id={`btn-signal-delay-${row.id}`}
                  onClick={() =>
                    updateStatus.mutate({
                      shipmentId: row.id,
                      status: "in_transit",
                      memo: "Retard signalé par l'agence",
                    })
                  }
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Signaler un retard
                </button>
              )}

              {/* Livraison échouée */}
              {!["delivered", "returned", "delayed"].includes(row.status) && (
                <button
                  id={`btn-fail-${row.id}`}
                  onClick={() =>
                    updateStatus.mutate({
                      shipmentId: row.id,
                      status: "delivery_failed",
                    })
                  }
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Livraison échouée
                </button>
              )}
            </div>
          </section>

          {/* Notes internes */}
          <section
            className="glass-card rounded-2xl p-4 lg:p-5 animate-card-enter"
            style={{ animationDelay: "420ms" }}
            aria-labelledby="detail-notes-heading"
          >
            <div className="mb-3 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-gray-500" />
              <h2
                id="detail-notes-heading"
                className="text-sm font-bold text-gray-900"
              >
                Notes internes
              </h2>
            </div>

            <div className="space-y-3">
              {/* Input area */}
              <div className="flex items-start gap-2">
                <textarea
                  className="form-input h-16 flex-1 resize-none text-xs"
                  placeholder="Ajouter une note interne..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
                <button
                  className="rounded-lg bg-sugu-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sugu-600 transition-colors self-end disabled:opacity-60"
                  disabled={!internalNote.trim() || addNote.isPending}
                  onClick={() => {
                    if (internalNote.trim()) {
                      addNote.mutate(internalNote.trim(), {
                        onSuccess: () => setInternalNote(""),
                      });
                    }
                  }}
                >
                  {addNote.isPending ? "..." : "Enregistrer"}
                </button>
              </div>

              {/* Notes list */}
              {detailRow.notes.length > 0 ? (
                detailRow.notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-gray-50 p-2.5">
                    <p className="text-xs italic text-gray-600">
                      {note.memo}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      Par: {note.author} — {new Date(note.noted_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Aucune note pour le moment.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
