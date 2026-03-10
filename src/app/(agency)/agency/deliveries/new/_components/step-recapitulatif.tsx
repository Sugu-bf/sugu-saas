"use client";

import {
  Pencil,
  Star,
  Truck,
  Package,
  Bike,
  MapPin,
  User,
  Banknote,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  type DeliveryFormData,
  type FormUpdater,
  MOCK_DRIVERS,
  PAYMENT_METHODS,
} from "./types";

interface StepRecapitulatifProps {
  data: DeliveryFormData;
  onChange: FormUpdater;
  onGoToStep: (step: number) => void;
}

/* ── Reusable helper components ── */

function EditLink({
  label,
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-700"
    >
      <Pencil className="h-3 w-3" />
      {label ?? "Modifier"}
    </button>
  );
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2 text-sm", className)}>
      <span className="shrink-0 text-gray-400 w-28">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white break-words">
        {value || "—"}
      </span>
    </div>
  );
}

export function StepRecapitulatif({
  data,
  onGoToStep,
}: StepRecapitulatifProps) {
  const selectedDriver = data.selectedDriverId
    ? MOCK_DRIVERS.find((d) => d.id === data.selectedDriverId) ?? null
    : null;

  const paymentLabel =
    PAYMENT_METHODS.find((p) => p.value === data.paymentMethod)?.label ??
    data.paymentMethod;

  const orderAmount = parseFloat(data.orderAmount) || 0;
  const shippingFee = parseFloat(data.shippingFee) || 0;
  const total = orderAmount + shippingFee;

  const priorityBadge = {
    urgent: {
      label: "Urgent",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    normal: {
      label: "Normal",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    low: {
      label: "Bas",
      className: "bg-green-50 text-green-700 border-green-200",
    },
  }[data.priority];

  // Format date
  const formattedDate = data.deliveryDate
    ? (() => {
        try {
          const d = new Date(data.deliveryDate + "T00:00:00");
          const months = [
            "Janvier",
            "Février",
            "Mars",
            "Avril",
            "Mai",
            "Juin",
            "Juillet",
            "Août",
            "Septembre",
            "Octobre",
            "Novembre",
            "Décembre",
          ];
          return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch {
          return data.deliveryDate;
        }
      })()
    : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* ═══════════ CARD 1 — Commande ═══════════ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Commande
              </h3>
            </div>
            <EditLink onClick={() => onGoToStep(1)} />
          </div>
          <div className="space-y-2">
            {data.orderId && (
              <InfoRow
                label="N° Commande"
                value={
                  <span className="font-mono font-bold">
                    &quot;{data.orderId}&quot;
                  </span>
                }
              />
            )}
            <InfoRow label="Vendeur" value={data.vendorName} />
            <InfoRow
              label="Articles"
              value={`${data.itemCount} articles`}
            />
            <InfoRow
              label="Montant"
              value={`${formatCurrency(orderAmount)} FCFA`}
            />
            <InfoRow
              label="Paiement"
              value={
                data.paymentStatus === "paid" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Payé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    En attente
                  </span>
                )
              }
            />
            {data.orderNotes && (
              <InfoRow label="Notes" value={data.orderNotes} />
            )}
          </div>
        </div>

        {/* ═══════════ CARD 2 — Livreur ═══════════ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Livreur
              </h3>
            </div>
            <EditLink onClick={() => onGoToStep(3)} />
          </div>

          {selectedDriver ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="relative">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
                    selectedDriver.avatarColor,
                  )}
                >
                  {selectedDriver.initials}
                </div>
                {selectedDriver.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedDriver.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Truck className="h-3 w-3" />
                  {selectedDriver.vehicle}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-gray-700">
                  {selectedDriver.rating}
                </span>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 text-center text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-900/20">
              Non assigné — sera assigné plus tard
            </p>
          )}

          <div className="mt-4 space-y-2">
            <InfoRow
              label="Priorité"
              value={
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                    priorityBadge.className,
                  )}
                >
                  {priorityBadge.label}
                </span>
              }
            />
            <InfoRow
              label="Frais livraison"
              value={`${formatCurrency(shippingFee)} FCFA`}
            />
            <InfoRow label="Paiement livraison" value={paymentLabel} />
            <InfoRow label="Date" value={formattedDate} />
            <InfoRow
              label="Créneau"
              value={`${data.timeSlotFrom} — ${data.timeSlotTo}`}
            />
          </div>
        </div>

        {/* ═══════════ CARD 3 — Itinéraire ═══════════ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Itinéraire
              </h3>
            </div>
            <EditLink onClick={() => onGoToStep(2)} />
          </div>

          <div className="space-y-0">
            {/* Pickup */}
            <div className="relative pl-6 pb-3">
              <div className="absolute left-0 top-0.5 h-3 w-3 rounded-full border-2 border-blue-500 bg-blue-100" />
              <p className="text-xs font-bold text-blue-700">Ramassage</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data.pickupAddress || "—"}
              </p>
              {data.pickupPhone && (
                <p className="text-xs text-gray-400">
                  {data.pickupPhone}
                </p>
              )}
            </div>

            {/* Connector */}
            <div className="relative pl-6 py-1">
              <div className="absolute left-[5px] h-full border-l-2 border-dashed border-gray-300" />
              <p className="text-[10px] text-gray-400 ml-2">
                4.2 km · ~18 min
              </p>
            </div>

            {/* Delivery */}
            <div className="relative pl-6 pt-2">
              <div className="absolute left-0 top-2 h-3 w-3 rounded-full border-2 border-orange-500 bg-orange-100" />
              <p className="text-xs font-bold text-sugu-600">Livraison</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data.deliveryAddress || "—"}
              </p>
              {data.clientPhone && (
                <p className="text-xs text-gray-400">
                  {data.clientPhone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ CARD 4 — Client ═══════════ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Client
              </h3>
            </div>
            <EditLink onClick={() => onGoToStep(2)} />
          </div>

          <div className="space-y-2">
            <InfoRow label="Nom" value={data.clientName} />
            <InfoRow label="Téléphone" value={data.clientPhone} />
            <InfoRow label="Email" value={data.clientEmail || "—"} />
            {data.deliveryInstructions && (
              <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20">
                Instructions: <em>{data.deliveryInstructions}</em>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ CARD 5 — Résumé financier (span-2) ═══════════ */}
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Résumé financier
          </h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Montant commande:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(orderAmount)} FCFA
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Frais de livraison:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(shippingFee)} FCFA
            </span>
          </div>

          <div className="my-1 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />

          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900 dark:text-white">
              TOTAL:
            </span>
            <span className="text-xl font-black text-sugu-600">
              {formatCurrency(total)} FCFA
            </span>
          </div>
        </div>
      </div>

      {/* SMS notification info */}
      <p className="mt-2 text-center text-[11px] text-gray-400">
        Un SMS de notification sera envoyé au client et au livreur
      </p>
    </div>
  );
}
