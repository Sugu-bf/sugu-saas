import type { ReactNode } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, CreditCard, Truck, Package } from "lucide-react";
import type { DeliveryDetailRow, DeliveryStatus, DeliveryPriority } from "@/features/agency/schema";

// ────────────────────────────────────────────────────────────
// COD Mixte Sub-components
// ────────────────────────────────────────────────────────────

export const COD_STEP_LABELS: Record<string, string> = {
  awaiting_vendor: "Attente vendeur",
  awaiting_negotiation: "Négociation livraison",
  awaiting_delivery_payment: "Paiement livraison en attente",
  awaiting_pickup: "Coursier en route",
  awaiting_inspection: "Inspection par le client",
  awaiting_product_payment: "Paiement produit en attente",
  awaiting_code: "Code de livraison",
  completed: "Terminée",
};

export type CodMixteData = NonNullable<DeliveryDetailRow["codMixte"]>;

export function AgencyCodMixteBadge({ codMixte }: { codMixte: CodMixteData }) {
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

export function AgencyCodMixtePaymentCard({ codMixte }: { codMixte: CodMixteData }) {
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

export function AgencyCodFeeRow({ label, amount, paid, icon }: { label: string; amount: number; paid: boolean; paidAt: string | null; icon: ReactNode }) {
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
// Status & Priority config
// ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
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

export const PRIORITY_CONFIG: Record<
  DeliveryPriority,
  { label: string; dot: string; text: string }
> = {
  urgent: { label: "Urgent", dot: "bg-red-500", text: "text-red-600" },
  normal: { label: "Normal", dot: "bg-amber-400", text: "text-amber-600" },
  low: { label: "Bas", dot: "bg-green-400", text: "text-green-600" },
};

export function StatusBadge({
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

export function PriorityBadge({ priority }: { priority: DeliveryPriority }) {
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
