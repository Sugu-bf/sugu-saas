"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  ShieldCheck,
  Copy,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Check,
  Package,
  User,
  Clock,
  Ruler,
  Map,
  CreditCard,
} from "lucide-react";
import {
  useDriverDeliveryDetail,
  useConfirmCollection,
  useStartTransit,
  useMarkArrived,
  useMarkDelivered,
  useSignalDelay,
  useMarkFailed,
  useAcceptDelivery,
  useRefuseDelivery,
} from "@/features/driver/hooks";
import type {
  DriverDeliveryDetail,
  PickupStop,
  PickupProduct,
  DetailTimelineStep,
} from "@/features/driver/schema";
import type { DriverDeliveryStatus } from "@/features/driver/schema";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Status & Priority config (driver-specific: 5 statuses)
// ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DriverDeliveryStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  to_accept: {
    label: "À accepter",
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
  arrived: {
    label: "Arrivé",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  delivered: {
    label: "Livré",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  failed: {
    label: "Échoué",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

type DeliveryPriority = "urgent" | "normal" | "low";

const PRIORITY_CONFIG: Record<
  DeliveryPriority,
  { label: string; dot: string; text: string }
> = {
  urgent: { label: "Urgent", dot: "bg-red-500", text: "text-red-600" },
  normal: { label: "Normal", dot: "bg-amber-400", text: "text-amber-600" },
  low: { label: "Bas", dot: "bg-green-400", text: "text-green-600" },
};

// ────────────────────────────────────────────────────────────
// Sub-components: Badges
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
            : "border-green-200 bg-green-50",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components: COD Mixte
// ────────────────────────────────────────────────────────────

const COD_STEP_LABELS: Record<string, string> = {
  awaiting_vendor: "Attente vendeur",
  awaiting_negotiation: "Négociation",
  awaiting_delivery_payment: "Paiement livraison",
  awaiting_pickup: "Ramassage",
  awaiting_inspection: "Inspection",
  awaiting_product_payment: "Paiement produit",
  awaiting_code: "Code secret",
  completed: "Terminée",
};

type CodMixteData = NonNullable<DriverDeliveryDetail["codMixte"]>;

function DriverCodMixteBadge({ codMixte }: { codMixte: CodMixteData }) {
  const bothPaid = codMixte.deliveryFeePaid && codMixte.productFeePaid;
  const onePaid = codMixte.deliveryFeePaid || codMixte.productFeePaid;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
        bothPaid
          ? "border-green-200 bg-green-50 text-green-700"
          : onePaid
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-purple-200 bg-purple-50 text-purple-700",
      )}
    >
      <CreditCard className="h-3 w-3" />
      COD Mixte
      <span className="flex gap-0.5 ml-0.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", codMixte.deliveryFeePaid ? "bg-green-500" : "bg-gray-300")} />
        <span className={cn("h-1.5 w-1.5 rounded-full", codMixte.productFeePaid ? "bg-green-500" : "bg-gray-300")} />
      </span>
    </span>
  );
}

function DriverCodMixtePaymentCard({ codMixte }: { codMixte: CodMixteData }) {
  const stepLabel = COD_STEP_LABELS[codMixte.currentStep] ?? codMixte.currentStep;
  const bothPaid = codMixte.deliveryFeePaid && codMixte.productFeePaid;
  const isActionPending =
    codMixte.currentStep === "awaiting_delivery_payment" ||
    codMixte.currentStep === "awaiting_product_payment";

  return (
    <div className="mt-3 w-full space-y-2.5 text-left">
      <div
        className={cn(
          "rounded-xl border p-3",
          isActionPending
            ? "bg-amber-50/60 border-amber-200"
            : bothPaid
              ? "bg-green-50/60 border-green-200"
              : "bg-blue-50/60 border-blue-200",
        )}
      >
        <div className="flex items-center gap-2">
          {isActionPending ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          ) : bothPaid ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          )}
          <span
            className={cn(
              "text-[11px] font-bold",
              isActionPending ? "text-amber-700" : bothPaid ? "text-green-700" : "text-blue-700",
            )}
          >
            COD Mixte : {stepLabel}
          </span>
        </div>

        <div className="mt-2 flex gap-1">
          <div className="flex-1">
            <div className={cn("h-1.5 rounded-full", codMixte.deliveryFeePaid ? "bg-green-500" : "bg-gray-200")} />
            <p className="text-[9px] text-gray-500 mt-0.5 text-center">Livraison</p>
          </div>
          <div className="flex-1">
            <div className={cn("h-1.5 rounded-full", codMixte.productFeePaid ? "bg-green-500" : "bg-gray-200")} />
            <p className="text-[9px] text-gray-500 mt-0.5 text-center">Produit</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <DriverCodFeeRow
          label="Récolte Livraison"
          amount={codMixte.deliveryFeeAmount}
          paid={codMixte.deliveryFeePaid}
          icon={<MapPin className="h-3 w-3" />}
        />
        <DriverCodFeeRow
          label="Récolte Produit"
          amount={codMixte.productFeeAmount}
          paid={codMixte.productFeePaid}
          icon={<Package className="h-3 w-3" />}
        />
      </div>
    </div>
  );
}

function DriverCodFeeRow({
  label,
  amount,
  paid,
  icon,
}: {
  label: string;
  amount: number;
  paid: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-[11px]",
        paid
          ? "bg-green-50/50 border-green-200/60"
          : "bg-white/50 border-gray-200/60",
      )}
    >
      <span className={cn("flex-shrink-0", paid ? "text-green-600" : "text-gray-400")}>{icon}</span>
      <span className={cn("flex-1 font-medium", paid ? "text-green-700" : "text-gray-700")}>{label}</span>
      <span className={cn("font-bold", paid ? "text-green-600" : "text-gray-700")}>
        {formatCurrency(amount)} FCFA
      </span>
      <span
        className={cn(
          "rounded-full border px-1.5 py-0.5 text-[9px] font-bold",
          paid
            ? "border-green-200 bg-green-50 text-green-600"
            : "border-amber-200 bg-amber-50 text-amber-600",
        )}
      >
        {paid ? "Payé" : "À collecter"}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Loading skeleton (inline)
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

      {/* Row 1: Security code + Earnings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-shimmer" />
            <div className="h-3 w-32 rounded bg-gray-200 animate-shimmer" />
            <div className="h-8 w-48 rounded bg-gray-200 animate-shimmer" />
            <div className="h-8 w-28 rounded-xl bg-gray-200 animate-shimmer" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex flex-col items-center gap-3">
            <div className="h-3 w-40 rounded bg-gray-200 animate-shimmer" />
            <div className="h-10 w-40 rounded bg-gray-200 animate-shimmer" />
            <div className="h-5 w-16 rounded-full bg-gray-200 animate-shimmer" />
            <div className="flex gap-3">
              <div className="h-6 w-16 rounded-lg bg-gray-100 animate-shimmer" />
              <div className="h-6 w-16 rounded-lg bg-gray-100 animate-shimmer" />
              <div className="h-6 w-16 rounded-lg bg-gray-100 animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 3-col grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Itinerary */}
        <div className="glass-card rounded-2xl p-5">
          <div className="h-5 w-40 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-gray-200 animate-shimmer" />
                  <div className="h-3 w-32 rounded bg-gray-200 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Timeline */}
        <div className="glass-card rounded-2xl p-5">
          <div className="h-5 w-32 rounded bg-gray-200 animate-shimmer mb-3" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-gray-200 animate-shimmer" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-28 rounded bg-gray-200 animate-shimmer" />
                  <div className="h-2 w-36 rounded bg-gray-100 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Client + Actions */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="h-5 w-16 rounded bg-gray-200 animate-shimmer mb-3" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-200 animate-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200 animate-shimmer" />
                <div className="h-3 w-20 rounded bg-gray-100 animate-shimmer" />
              </div>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="space-y-2">
              <div className="h-11 w-full rounded-xl bg-gray-200 animate-shimmer" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 rounded-xl bg-gray-100 animate-shimmer" />
                <div className="h-10 flex-1 rounded-xl bg-gray-100 animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SecurityCodeCard
// ────────────────────────────────────────────────────────────

function SecurityCodeCard({
  code,
  copied,
  onCopy,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col items-center text-center animate-card-enter"
      style={{ animationDelay: "60ms" }}
    >
      {/* Green shield circle */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
        <ShieldCheck className="h-5 w-5 text-green-600" />
      </div>

      {/* Label */}
      <p className="mt-3 text-xs text-gray-500">Votre code de sécurité :</p>

      {/* CODE — very prominent */}
      <p className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-gray-900">
        {code}
      </p>

      {/* Copy button */}
      <button
        onClick={onCopy}
        className="mt-3 flex items-center gap-1.5 rounded-xl border border-sugu-200 bg-sugu-50/60
                   px-4 py-2 text-xs font-semibold text-sugu-600 transition-colors hover:bg-sugu-100"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Copié !" : "Copier le code"}
      </button>

      {/* Warning */}
      <p className="mt-3 max-w-[250px] text-[10px] italic leading-relaxed text-gray-400">
        Ne partagez pas ce code publiquement. Il sert à valider votre identité
        auprès des vendeurs.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// EarningsCard
// ────────────────────────────────────────────────────────────

function EarningsCard({ detail }: { detail: DriverDeliveryDetail }) {
  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col items-center text-center animate-card-enter"
      style={{ animationDelay: "120ms" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        GAIN ESTIMÉ POUR LA COURSE
      </p>

      <p className="mt-2">
        <span className="text-4xl font-extrabold text-gray-900">
          {formatCurrency(detail.amount)}
        </span>
        <span className="ml-1 text-lg font-bold text-gray-500">FCFA</span>
      </p>

      {/* Payment badge or COD Mixte Card */}
      {detail.codMixte?.isCodMixte ? (
        <DriverCodMixtePaymentCard codMixte={detail.codMixte} />
      ) : (
        <span
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            detail.orderPayment === "paid"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              detail.orderPayment === "paid" ? "bg-green-500" : "bg-amber-500",
            )}
          />
          {detail.orderPayment === "paid" ? "Payé" : "COD"}
        </span>
      )}

      {/* Distance/Duration/Parcels pills */}
      <div className="mt-3 flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-lg bg-gray-50/80 px-2.5 py-1 text-xs text-gray-500">
          <Ruler className="h-3 w-3 text-gray-400" />
          {detail.distanceKm} km
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-gray-50/80 px-2.5 py-1 text-xs text-gray-500">
          <Clock className="h-3 w-3 text-gray-400" />
          ~{detail.estimatedMinutes} min
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-gray-50/80 px-2.5 py-1 text-xs text-gray-500">
          <Package className="h-3 w-3 text-gray-400" />
          {detail.parcelCount} colis
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ProductCard (inside a stop)
// ────────────────────────────────────────────────────────────

function ProductCard({
  product,
}: {
  product: PickupProduct;
}) {
  return (
    <div className="rounded-xl bg-gray-50/80 p-3 flex items-center gap-3">
      {/* Product image placeholder */}
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-200 flex items-center justify-center">
        <Package className="h-5 w-5 text-gray-400" />
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {product.name}
        </p>
        {product.variant && (
          <p className="text-[10px] text-gray-400">{product.variant}</p>
        )}
        <p className="text-xs font-semibold text-gray-900">
          {formatCurrency(product.price)} FCFA
        </p>
      </div>

      {/* Quantity + collected status */}
      <div className="flex-shrink-0 text-right">
        <span className="text-[10px] text-gray-500">
          Qté: {product.quantity}
        </span>
        {product.collected && (
          <p className="flex items-center gap-0.5 text-[10px] font-medium text-green-600"><Check className="h-2.5 w-2.5" /> Collecté</p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ItineraryCard (multi-stop)
// ────────────────────────────────────────────────────────────

function ItineraryCard({
  stops,
  deliveryId,
  status,
}: {
  stops: PickupStop[];
  deliveryId: string;
  status: string;
}) {
  const confirmMutation = useConfirmCollection();
  const pickupStops = stops.filter((s) => s.type === "pickup");
  const deliveryStop = stops.find((s) => s.type === "delivery");

  return (
    <div
      className="glass-card rounded-2xl p-5 animate-card-enter"
      style={{ animationDelay: "180ms" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">
            Itinéraire de la course
          </h2>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
          {stops.length} arrêts
        </span>
      </div>

      {/* Stops */}
      <div className="space-y-0">
        {pickupStops.map((stop, i) => (
          <div key={stop.id}>
            {/* Stop marker */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white text-sm font-bold",
                    i === 0
                      ? "border-sugu-500 text-sugu-600"
                      : "border-blue-500 text-blue-600",
                  )}
                >
                  {stop.letter}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sugu-500">
                  POINT DE RETRAIT {stop.letter}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {stop.name}
                </p>
                <p className="text-xs text-gray-500">{stop.address}</p>

                {/* Products grid */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stop.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>

                {/* Confirm all button for this stop (if not completed) */}
                {!stop.isCompleted &&
                  status !== "delivered" &&
                  status !== "failed" && (
                    <button
                      onClick={() => {
                        // Confirm all products in this stop
                        stop.products
                          .filter((p) => !p.collected)
                          .forEach((p) => {
                            confirmMutation.mutate({
                              deliveryId,
                              productId: p.id,
                            });
                          });
                        toast.success(`Collecte confirmée — ${stop.name}`);
                      }}
                      disabled={confirmMutation.isPending}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg
                                 border border-green-200 bg-green-50/60 py-2 text-xs font-semibold
                                 text-green-700 transition-colors hover:bg-green-100 disabled:opacity-60"
                    >
                      <Check className="h-3 w-3" />
                      Confirmer la collecte
                    </button>
                  )}

                {stop.isCompleted && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Collecté
                  </p>
                )}
              </div>
            </div>

            {/* Vertical dashed connector */}
            <div className="ml-4 h-6 border-l-2 border-dashed border-gray-300" />
          </div>
        ))}

        {/* Destination stop */}
        {deliveryStop && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-sm font-bold">
              {deliveryStop.letter}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">
                DESTINATION (LIVRAISON)
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {deliveryStop.name}
              </p>
              <p className="text-xs text-gray-500">{deliveryStop.address}</p>

              {/* Call/Message buttons */}
              <div className="mt-2 flex gap-2">
                <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                  <Phone className="h-3.5 w-3.5" /> Appeler
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                  <MessageCircle className="h-3.5 w-3.5" /> Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TrackingTimeline
// ────────────────────────────────────────────────────────────

function TrackingTimeline({ steps }: { steps: DetailTimelineStep[] }) {
  return (
    <div
      className="glass-card rounded-2xl p-5 animate-card-enter"
      style={{ animationDelay: "240ms" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">
            Suivi de livraison
          </h2>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
          {steps.length} étapes
        </span>
      </div>

      <ol className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {step.done && !step.current ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                ) : step.current ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sugu-500 ring-4 ring-sugu-200/50 animate-pulse-dot">
                    <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  </span>
                ) : (
                  <span className="h-6 w-6 rounded-full bg-gray-200" />
                )}
                {!isLast && (
                  <span
                    className={cn(
                      "h-8 w-0.5 mt-0.5",
                      step.done ? "bg-green-300" : "bg-gray-200",
                    )}
                  />
                )}
              </div>

              <div className="flex flex-1 items-start justify-between pb-2 min-w-0">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs",
                      step.done && !step.current
                        ? "font-medium text-gray-700"
                        : step.current
                          ? "font-bold text-sugu-600"
                          : "text-gray-400",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.subtitle && (
                    <p className="mt-0.5 text-[10px] text-gray-400 truncate">
                      {step.subtitle}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-[10px] font-medium text-gray-400 ml-2">
                  {step.time ?? "—"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ClientCard
// ────────────────────────────────────────────────────────────

function ClientCard({
  client,
}: {
  client: DriverDeliveryDetail["client"];
  status: string;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-5 animate-card-enter"
      style={{ animationDelay: "300ms" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <User className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-bold text-gray-900">Client</h2>
      </div>

      {/* Avatar + info */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-base font-bold",
            client.avatarColor,
          )}
        >
          {client.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{client.name}</p>
          <p className="text-[10px] text-gray-400">
            {client.isRegular ? "Client régulier" : "Nouveau client"}
          </p>
          <p className="text-xs text-gray-500">{client.phone}</p>
        </div>
      </div>

      {/* Call / SMS buttons */}
      <div className="mt-3 flex gap-2">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
          <Phone className="h-3.5 w-3.5" /> Appeler
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
          <MessageCircle className="h-3.5 w-3.5" /> SMS
        </button>
      </div>

      {/* Client note (amber box) */}
      {client.note && (
        <div className="mt-3 rounded-xl bg-amber-50/60 border border-amber-100/60 p-3">
          <p className="flex items-center gap-1 text-xs text-amber-800"><AlertTriangle className="h-3 w-3 shrink-0" /> {client.note}</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ActionsCard
// ────────────────────────────────────────────────────────────

function ActionsCard({
  detail,
  onStartTransit,
  onMarkArrived,
  onMarkDelivered,
  onSignalDelay,
  onMarkFailed,
  onAccept,
  onRefuse,
  isMutating,
}: {
  detail: DriverDeliveryDetail;
  onStartTransit: () => void;
  onMarkArrived: () => void;
  onMarkDelivered: (code: string) => void;
  onSignalDelay: () => void;
  onMarkFailed: () => void;
  onAccept: () => void;
  onRefuse: () => void;
  isMutating: boolean;
}) {
  const { status, client } = detail;
  const isActive = !["delivered", "failed"].includes(status);
  const [code, setCode] = useState("");

  if (!isActive) return null;

  return (
    <div
      className="glass-card rounded-2xl p-5 animate-card-enter"
      style={{ animationDelay: "360ms" }}
    >
      {/* FOR "to_accept" → Accept/Refuse */}
      {status === "to_accept" && (
        <div className="space-y-2">
          <button
            onClick={onAccept}
            disabled={isMutating}
            className="flex w-full items-center justify-center gap-2 rounded-xl
                       bg-green-500 py-3
                       text-sm font-semibold text-white
                       transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Accepter la course
          </button>
          <button
            onClick={onRefuse}
            disabled={isMutating}
            className="flex w-full items-center justify-center gap-2 rounded-xl
                       border border-gray-200 bg-white/60 py-2.5
                       text-sm font-semibold text-gray-600
                       transition hover:bg-gray-50 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Refuser
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1 italic">
            En acceptant, vous vous engagez à effectuer cette livraison selon les
            conditions d&apos;utilisation.
          </p>
        </div>
      )}

      {/* FOR "pickup", "en_route", "arrived" → Progressive Actions + secondary */}
      {["pickup", "en_route", "arrived"].includes(status) && (
        <div className="space-y-4">
          
          {/* PRIMARY FLOW BUTTONS */}
          {status === "pickup" && (
            <button
              onClick={onStartTransit}
              disabled={isMutating}
              className="flex w-full items-center justify-center gap-2 rounded-xl
                         bg-blue-600 py-3 text-sm font-semibold text-white
                         transition-all hover:bg-blue-700 active:scale-[0.98]
                         disabled:opacity-60"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Commencer l&apos;itinéraire 
            </button>
          )}

          {status === "en_route" && (
            <button
              onClick={onMarkArrived}
              disabled={isMutating}
              className="flex w-full items-center justify-center gap-2 rounded-xl
                         bg-orange-500 py-3 text-sm font-semibold text-white
                         transition-all hover:bg-orange-600 active:scale-[0.98]
                         disabled:opacity-60"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Je suis arrivé au client
            </button>
          )}

          {status === "arrived" && (
             <div className="rounded-xl border border-sugu-200 bg-sugu-50/50 p-4 space-y-3">
               <label className="block text-sm font-semibold text-sugu-900">
                 Code de sécurité du client
               </label>
               <input 
                 type="text" 
                 value={code} 
                 onChange={(e) => setCode(e.target.value)} 
                 placeholder="ex: ABC12"
                 className="w-full rounded-lg border border-sugu-200 p-2.5 text-sm font-medium focus:border-sugu-500 focus:ring-2 focus:ring-sugu-500/20"
                 disabled={isMutating}
               />
               <button
                  onClick={() => onMarkDelivered(code)}
                  disabled={isMutating || code.length < 4}
                  className="flex w-full items-center justify-center gap-2 rounded-lg
                             bg-green-500 py-2.5 text-sm font-semibold text-white
                             transition-all hover:bg-green-600 active:scale-[0.98]
                             disabled:opacity-60"
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

          {/* Secondary row */}
          <div className="flex gap-2">
            <button
              onClick={onSignalDelay}
              disabled={isMutating}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl
                         border border-amber-200 bg-amber-50/60 py-2.5
                         text-xs font-semibold text-amber-700 transition hover:bg-amber-100
                         disabled:opacity-60"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Signaler retard
            </button>
            <button
              onClick={onMarkFailed}
              disabled={isMutating}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl
                         border border-red-200 bg-red-50/60 py-2.5
                         text-xs font-semibold text-red-600 transition hover:bg-red-100
                         disabled:opacity-60"
            >
              <XCircle className="h-3.5 w-3.5" />
              Échec livraison
            </button>
          </div>

          {/* Google Maps link */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(client.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1 text-xs font-medium
                       text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            <Map className="h-3.5 w-3.5" /> Ouvrir dans Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SuccessBanner (only when status === "delivered")
// ────────────────────────────────────────────────────────────

function SuccessBanner({
  completedAt,
}: {
  completedAt: string | null;
}) {
  return (
    <div
      className="rounded-2xl bg-green-50/60 border border-green-200 p-4 flex items-center gap-4
                  animate-card-enter"
      style={{ animationDelay: "30ms" }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-6 w-6 text-green-600" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
            PAYÉ
          </span>
          {completedAt && (
            <span className="text-[10px] text-gray-400">
              {new Date(completedAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold text-green-800">
          Bravo !
        </p>
        <p className="text-xs text-green-700">
          Vous avez livré le colis avec succès
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────

interface DriverDeliveryDetailContentProps {
  deliveryId: string;
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function DriverDeliveryDetailContent({
  deliveryId,
}: DriverDeliveryDetailContentProps) {
  const {
    data: detail,
    isLoading,
    isError,
  } = useDriverDeliveryDetail(deliveryId);

  // ── Modals / State ──
  const [copiedCode, setCopiedCode] = useState(false);

  // ── Mutations ──
  const startTransit = useStartTransit();
  const markArrived = useMarkArrived();
  const markDelivered = useMarkDelivered();
  const signalDelay = useSignalDelay();
  const markFailed = useMarkFailed();
  const acceptDelivery = useAcceptDelivery();
  const refuseDelivery = useRefuseDelivery();

  const isMutating =
    startTransit.isPending ||
    markArrived.isPending ||
    markDelivered.isPending ||
    signalDelay.isPending ||
    markFailed.isPending ||
    acceptDelivery.isPending ||
    refuseDelivery.isPending;

  const handleCopyCode = () => {
    if (!detail) return;
    navigator.clipboard.writeText(detail.securityCode);
    setCopiedCode(true);
    toast.success("Code copié !");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStartTransit = () => {
    startTransit.mutate(deliveryId, {
      onSuccess: () => toast.success("Itinéraire commencé !"),
      onError: (err: Error) =>
        toast.error(err.message || "Erreur lors du démarrage"),
    });
  };

  const handleMarkArrived = () => {
    markArrived.mutate(deliveryId, {
      onSuccess: () => toast.success("Vous êtes arrivé à destination !"),
      onError: (err: Error) =>
        toast.error(err.message || "Erreur lors du signalement"),
    });
  };

  const handleMarkDelivered = (code: string) => {
    if (!code) return toast.error("Le code est requis");
    markDelivered.mutate(
      { deliveryId, code },
      {
        onSuccess: () => toast.success("Livraison marquée comme livrée !"),
        onError: (err: Error) => 
          toast.error(err.message || "Erreur lors de la mise à jour : Code incorrect"),
      }
    );
  };

  const handleSignalDelay = () => {
    signalDelay.mutate(deliveryId, {
      onSuccess: () => toast.success("Retard signalé à l'agence"),
      onError: () => toast.error("Erreur lors du signalement"),
    });
  };

  const handleMarkFailed = () => {
    markFailed.mutate(deliveryId, {
      onSuccess: () => toast.success("Échec de livraison signalé"),
      onError: () => toast.error("Erreur lors du signalement"),
    });
  };

  const handleAccept = () => {
    acceptDelivery.mutate(deliveryId, {
      onSuccess: () => toast.success("Course acceptée !"),
      onError: () => toast.error("Erreur lors de l'acceptation"),
    });
  };

  const handleRefuse = () => {
    refuseDelivery.mutate(deliveryId, {
      onSuccess: () => toast.success("Course refusée"),
      onError: () => toast.error("Erreur lors du refus"),
    });
  };

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
  if (!detail) {
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
            href="/driver/deliveries"
            className="mt-1 text-sm font-semibold text-sugu-500 hover:text-sugu-600"
          >
            ← Retour aux livraisons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-5 max-w-7xl">
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
            href="/driver/deliveries"
            className="flex items-center gap-1.5 text-sm font-medium text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux livraisons
          </Link>
        </div>

        {/* Right: Order ID + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-lg font-bold text-gray-900">
            {detail.orderId}
          </span>
          <StatusBadge status={detail.status} label={detail.statusLabel} />
          <PriorityBadge priority={detail.priority} />
          {detail.codMixte?.isCodMixte && (
            <DriverCodMixteBadge codMixte={detail.codMixte} />
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SUCCESS BANNER (conditional: status === "delivered")
          ════════════════════════════════════════════════════════ */}
      {detail.status === "delivered" && (
        <SuccessBanner completedAt={detail.completedAt} />
      )}

      {/* ════════════════════════════════════════════════════════
          ROW 1 — 2-col: SecurityCode + Earnings
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <SecurityCodeCard
          code={detail.securityCode}
          copied={copiedCode}
          onCopy={handleCopyCode}
        />
        <EarningsCard detail={detail} />
      </div>

      {/* ════════════════════════════════════════════════════════
          ROW 2 — 3-col grid: Itinerary + Timeline + Client/Actions
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* COL 1: Itinerary */}
        <ItineraryCard
          stops={detail.stops}
          deliveryId={deliveryId}
          status={detail.status}
        />

        {/* COL 2: Timeline */}
        <TrackingTimeline steps={detail.timeline} />

        {/* COL 3: Client + Actions */}
        <div className="space-y-4">
          <ClientCard client={detail.client} status={detail.status} />
          <ActionsCard
            detail={detail}
            onStartTransit={handleStartTransit}
            onMarkArrived={handleMarkArrived}
            onMarkDelivered={handleMarkDelivered}
            onSignalDelay={handleSignalDelay}
            onMarkFailed={handleMarkFailed}
            onAccept={handleAccept}
            onRefuse={handleRefuse}
            isMutating={isMutating}
          />
        </div>
      </div>
    </div>
  );
}
