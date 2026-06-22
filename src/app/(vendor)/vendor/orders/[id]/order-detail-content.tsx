"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { CanonicalTimeline } from "@/components/ui/canonical-timeline";
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  Phone as PhoneIcon,
  Mail,
  MapPin,
  Truck,
  Package,
  CheckCircle,
  Clock,
  Copy,
  X,
  Loader2,
  FileText,
  Send,
  Download,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  HandshakeIcon,
} from "lucide-react";
import type { OrderDetail, OrderDetailProduct, PickupCodeEntry } from "@/features/vendor/schema";
import {
  useConfirmOrder,
  useCancelOrder,
  useMarkShipped,
  useMarkDelivered,
  useRequestDelivery,
  useOrderPickupCodes,
  useConfirmHandoff,
} from "@/features/vendor/hooks";
import * as vendorService from "@/features/vendor/service";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Status badge styles
// ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  confirmed: "bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
  processing: "bg-sugu-100/80 text-sugu-700 border-sugu-300 dark:bg-sugu-500/10 dark:text-sugu-400 dark:border-sugu-500/30",
  packed: "bg-violet-100/80 text-violet-800 border-violet-300 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30",
  shipped: "bg-blue-100/80 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  delivered: "bg-green-100/80 text-green-800 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
  cancelled: "bg-red-100/80 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
};

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface OrderDetailContentProps {
  data: OrderDetail;
}

export function OrderDetailContent({ data }: OrderDetailContentProps) {
  const [products, setProducts] = useState(data.products);

  const readyCount = products.filter((p) => p.ready).length;

  const { data: pickupCodesData } = useOrderPickupCodes(data.id);
  const pickupCodes = pickupCodesData?.codes ?? [];

  // Build a map: storeId → PickupCodeEntry for per-item handoff resolution
  const pickupByStore = Object.fromEntries(
    pickupCodes.map((c: PickupCodeEntry) => [c.store_id, c]),
  ) as Record<string, PickupCodeEntry>;

  const toggleReady = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ready: !p.ready } : p)),
    );
  };

  const markAllReady = () => {
    setProducts((prev) => prev.map((p) => ({ ...p, ready: true })));
  };

  // Mutations
  const confirmMutation = useConfirmOrder();
  const cancelMutation = useCancelOrder();
  const shippedMutation = useMarkShipped();
  const deliveredMutation = useMarkDelivered();
  const deliveryRequestMutation = useRequestDelivery();
  const isMutating =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    shippedMutation.isPending ||
    deliveredMutation.isPending ||
    deliveryRequestMutation.isPending;

  // ── Status transition handlers ──

  const handleConfirm = () => {
    confirmMutation.mutate(data.id, {
      onSuccess: () => toast.success("Commande confirmée avec succès"),
      onError: (err) => toast.error(err.message || "Erreur lors de la confirmation"),
    });
  };

  const handleCancel = () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;
    cancelMutation.mutate(data.id, {
      onSuccess: () => toast.success("Commande annulée"),
      onError: (err) => toast.error(err.message || "Erreur lors de l'annulation"),
    });
  };

  const handleMarkShipped = () => {
    shippedMutation.mutate(data.id, {
      onSuccess: () => toast.success("Commande marquée comme expédiée"),
      onError: (err) => toast.error(err.message || "Erreur lors de la mise à jour"),
    });
  };

  const handleMarkDelivered = () => {
    deliveredMutation.mutate(data.id, {
      onSuccess: () => toast.success("Commande marquée comme livrée"),
      onError: (err) => toast.error(err.message || "Erreur lors de la mise à jour"),
    });
  };

  const handleRequestDelivery = () => {
    deliveryRequestMutation.mutate(data.id, {
      onSuccess: () => toast.success("Demande de livraison envoyée"),
      onError: (err) => toast.error(err.message || "Erreur lors de la demande"),
    });
  };

  // ── Utility handlers ──

  const handleCopyDetails = () => {
    const text = `Commande ${data.reference}\nClient: ${data.client.name}\nTotal: ${formatCurrency(data.financial.total)} FCFA\nStatut: ${data.statusLabel}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Détails copiés dans le presse-papier"),
      () => toast.error("Impossible de copier"),
    );
  };

  const handlePrintDeliverySlip = async () => {
    try {
      toast.loading("Génération du bon de livraison...", { id: "slip" });
      await vendorService.downloadDeliverySlip(data.id);
      toast.success("Bon de livraison ouvert", { id: "slip" });
    } catch {
      toast.error("Erreur lors de la génération du bon de livraison", { id: "slip" });
    }
  };

  const handleCopyInvoiceLink = async () => {
    try {
      toast.loading("Génération de la facture...", { id: "invoice" });
      const { url, invoiceNumber } = await vendorService.getOrderInvoiceLink(data.id);
      await navigator.clipboard.writeText(url);
      toast.success(`Lien de la facture ${invoiceNumber} copié !`, { id: "invoice" });
    } catch {
      toast.error("Erreur lors de la génération de la facture", { id: "invoice" });
    }
  };

  const handleSendInvoiceWhatsApp = async () => {
    try {
      toast.loading("Préparation de la facture...", { id: "wa-invoice" });
      const { url } = await vendorService.getOrderInvoiceLink(data.id);
      const phone = (data.client.phone || "").replace(/\s/g, "");
      const message = encodeURIComponent(
        `Bonjour ${data.client.name},\n\nVoici votre facture pour la commande ${data.reference} :\n${url}\n\nMerci pour votre achat !\nSugu`,
      );
      toast.dismiss("wa-invoice");
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    } catch {
      toast.error("Erreur lors de la génération de la facture", { id: "wa-invoice" });
    }
  };

  const handleContactClient = () => {
    const phone = (data.client.phone || "").replace(/\s/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 lg:space-y-5">
      {/* ════════════ Header ════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/vendor/orders"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white lg:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux commandes
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
              Commande {data.reference}
            </h1>
            <span
              className={cn(
                "rounded-full border px-3 py-0.5 text-xs font-semibold whitespace-nowrap",
                STATUS_BADGE[data.status] ?? "bg-gray-100/80 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
              )}
            >
              {data.statusLabel}
            </span>
            {data.codMixte?.isCodMixte && (
              <CodMixteBadgeHeader codMixte={data.codMixte} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 lg:inline-flex"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            onClick={handleContactClient}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sugu-200 bg-sugu-50/80 px-3 py-2 text-xs font-semibold text-sugu-600 transition-all active:scale-[0.98] lg:gap-2 lg:px-4 lg:py-2.5 lg:text-sm lg:hover:bg-sugu-100 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400"
          >
            <MessageCircle className="h-4 w-4" />
            Contacter le client
          </button>
        </div>
      </div>

      {/* ════════════ 3-Column Grid ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-5">
        {/* ───────── LEFT COLUMN ───────── */}
        <div className="space-y-3 lg:space-y-5">
          {/* ── Articles à préparer ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-sugu-500 lg:h-5 lg:w-5" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                Articles à préparer
              </h2>
            </div>

            {/* Progress bar */}
            <div className="mt-3 flex items-center justify-between lg:mt-4">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 lg:text-sm">
                {data.totalCount} articles à emballer
              </span>
              <span className="text-xs font-bold text-gray-900 dark:text-white lg:text-sm">
                {readyCount}/{data.totalCount} prêts
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40">
              <div
                className="h-full rounded-full bg-sugu-500 transition-all duration-500"
                style={{ width: `${(readyCount / data.totalCount) * 100}%` }}
              />
            </div>

            {/* Product checklist */}
            <div className="mt-3 space-y-2 lg:mt-4">
              {products.map((product) => (
                <ProductPrepRow
                  key={product.id}
                  product={product}
                  pickup={product.storeId ? pickupByStore[product.storeId] : undefined}
                  orderId={data.id}
                  onToggle={() => toggleReady(product.id)}
                />
              ))}
            </div>

            {/* Mark all */}
            {readyCount < data.totalCount && (
              <button
                type="button"
                onClick={markAllReady}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600 lg:mt-3 lg:text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Tout marquer comme prêt
              </button>
            )}
          </section>

          {/* ── Timeline ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sugu-500 lg:h-5 lg:w-5" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
                Timeline de la commande
              </h2>
            </div>

            {/* D3b — single canonical timeline projection. Replaces the legacy
                data.timeline render; the vendor mapper no longer reads raw.timeline.
                Superset: every prior step (placed/confirmed/preparing/shipped/
                delivered + the 2 COD payments) is covered, plus vendor_confirmed /
                handoff per boutique (V4). */}
            <div className="mt-3 lg:mt-4">
              <CanonicalTimeline steps={data.canonicalTimeline} />
            </div>
          </section>
          {/* ── Code de collecte (visible after courier assigned) ── */}
          {pickupCodes.length > 0 && (
            <PickupCodeCard codes={pickupCodes} />
          )}
        </div>

        {/* ───────── MIDDLE COLUMN ───────── */}
        <div className="space-y-3 lg:space-y-5">
          {/* ── Client Info ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
              Informations client
            </h2>

            <div className="mt-3 flex items-center gap-2.5 lg:mt-4 lg:gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold lg:h-12 lg:w-12 lg:text-sm ${data.client.avatarColor}`}>
                {data.client.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white lg:text-base">
                  {data.client.name}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <PhoneIcon className="h-3.5 w-3.5 text-gray-400" />
                {data.client.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {data.client.email}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {data.client.isLoyal && (
                <span className="rounded-full border border-sugu-200 bg-sugu-50/80 px-2.5 py-0.5 text-[10px] font-bold text-sugu-600">
                  Cliente fidèle
                </span>
              )}
              <span className="text-xs text-gray-400">
                {data.client.orderCount} commandes précédentes
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={`tel:${data.client.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-sugu-200 bg-sugu-50/80 px-3 py-1.5 text-xs font-semibold text-sugu-600 transition-all active:scale-[0.98] lg:px-4 lg:py-2 lg:text-sm lg:hover:bg-sugu-100"
              >
                <PhoneIcon className="h-3.5 w-3.5" />
                Appeler
              </a>
              <button
                onClick={handleContactClient}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50/80 px-3 py-1.5 text-xs font-semibold text-green-700 transition-all active:scale-[0.98] lg:px-4 lg:py-2 lg:text-sm lg:hover:bg-green-100"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            </div>
          </section>

          {/* ── Récapitulatif financier ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
              Récapitulatif financier
            </h2>

            <div className="mt-3 space-y-2.5 lg:mt-4">
              <div className="flex justify-between text-xs lg:text-sm">
                <span className="text-gray-500">
                  Sous-total ({data.totalCount} articles)
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {formatCurrency(data.financial.subtotal)} FCFA
                </span>
              </div>
              <div className="flex justify-between text-xs lg:text-sm">
                <span className="text-gray-500">
                  Livraison ({data.financial.deliveryLabel})
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {formatCurrency(data.financial.deliveryCost)} FCFA
                </span>
              </div>
              <div className="flex justify-between text-xs lg:text-sm">
                <span className="text-gray-500">
                  Remise (-{data.financial.discountPercent}%)
                </span>
                <span className="font-medium text-red-500">
                  -{formatCurrency(data.financial.discountAmount)} FCFA
                </span>
              </div>

              <div className="border-t border-gray-200/60 pt-3 dark:border-gray-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    TOTAL:
                  </span>
                  <span className="text-lg font-extrabold text-sugu-500 lg:text-xl">
                    {formatCurrency(data.financial.total)} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            {data.codMixte?.isCodMixte ? (
              <CodMixtePaymentCard codMixte={data.codMixte} />
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50/60 px-3 py-2 dark:bg-green-950/20 lg:mt-4 lg:px-4 lg:py-2.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {data.financial.paymentMethod}
                </span>
                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">
                  {data.financial.paymentStatus}
                </span>
              </div>
            )}
          </section>
        </div>

        {/* ───────── RIGHT COLUMN ───────── */}
        <div className="space-y-3 lg:space-y-5">
          {/* ── Détails livraison ── */}
          <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
              <Truck className="h-4 w-4 text-sugu-500 lg:h-5 lg:w-5" />
              Détails livraison
            </h2>

            <div className="mt-3">
              <p className="text-sm font-bold text-gray-900 dark:text-white lg:text-base">
                {data.delivery.provider}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {data.delivery.type} • {data.delivery.estimatedTime}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Livreur:{" "}
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                  {data.delivery.driverStatus}
                </span>
              </p>
            </div>

            {/* Map placeholder */}
            <div className="mt-3 relative h-24 rounded-xl bg-green-50/80 dark:bg-green-950/20 flex items-center justify-center overflow-hidden lg:mt-4 lg:h-28">
              <MapPin className="h-6 w-6 text-sugu-400/60" />
            </div>

            {/* Address */}
            <div className="mt-3 flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-sugu-500" />
              <div className="text-xs text-gray-700 dark:text-gray-300 lg:text-sm">
                <p>{data.delivery.address.line1}</p>
                <p>{data.delivery.address.line2}</p>
                <p>{data.delivery.address.city}, {data.delivery.address.country}</p>
              </div>
            </div>

            {/* Client note */}
            {data.delivery.clientNote && (
              <div className="mt-3 rounded-xl bg-amber-50/60 px-4 py-2.5 dark:bg-amber-950/20">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Note client:</span>{" "}
                  {data.delivery.clientNote}
                </p>
              </div>
            )}
          </section>

          {/* ── Actions ── */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Actions
            </h2>

            <div className="mt-3 space-y-2 lg:mt-4 lg:space-y-2.5">
              {/* ── Status transition buttons (state machine) ── */}

              {/* pending → confirmed */}
              {data.status === "pending" && (
                <button
                  onClick={handleConfirm}
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sugu-500 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.98] lg:py-3 lg:text-sm lg:hover:bg-sugu-600 lg:hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Confirmer la commande
                </button>
              )}

              {/* confirmed → request delivery */}
              {data.status === "confirmed" && (
                <button
                  onClick={handleRequestDelivery}
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.98] lg:py-3 lg:text-sm lg:hover:bg-indigo-600 lg:hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deliveryRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Demander la livraison
                </button>
              )}

              {/* processing/packed → shipped */}
              {(data.status === "processing" || data.status === "packed") && (
                <button
                  onClick={handleMarkShipped}
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.98] lg:py-3 lg:text-sm lg:hover:bg-blue-600 lg:hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {shippedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Marquer comme expédiée
                </button>
              )}

              {/* shipped → delivered (only for direct orders, marketplace uses delivery code flow) */}
              {data.status === "shipped" && (
                <button
                  onClick={handleMarkDelivered}
                  disabled={isMutating}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.98] lg:py-3 lg:text-sm lg:hover:bg-green-600 lg:hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deliveredMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Marquer comme livrée
                </button>
              )}

              {/* ── Separator between status buttons and utility buttons ── */}
              {!["delivered", "cancelled"].includes(data.status) && (
                <hr className="border-gray-100 dark:border-gray-800" />
              )}

              {/* ── Utility buttons (always available) ── */}
              <button
                onClick={handlePrintDeliverySlip}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-all active:scale-[0.98] lg:py-2.5 lg:text-sm lg:hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <Download className="h-4 w-4" />
                Imprimer le bon de livraison
              </button>

              <button
                onClick={handleCopyInvoiceLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-all active:scale-[0.98] lg:py-2.5 lg:text-sm lg:hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <FileText className="h-4 w-4" />
                Copier le lien facture
              </button>

              <button
                onClick={handleSendInvoiceWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50/60 px-4 py-2 text-xs font-medium text-green-700 transition-all active:scale-[0.98] lg:py-2.5 lg:text-sm lg:hover:bg-green-100 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400"
              >
                <Send className="h-4 w-4" />
                Envoyer facture WhatsApp
              </button>

              <button
                onClick={handleCopyDetails}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-all active:scale-[0.98] lg:py-2.5 lg:text-sm lg:hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <Copy className="h-4 w-4" />
                Copier les détails
              </button>

              {/* ── Cancellation (available except delivered/cancelled/returned) ── */}
              {!["delivered", "cancelled", "refunded"].includes(data.status) && (
                <>
                  <hr className="border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={handleCancel}
                    disabled={isMutating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-red-500 transition-all active:scale-[0.98] lg:py-2.5 lg:text-sm lg:hover:bg-red-50 dark:lg:hover:bg-red-950/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Annuler cette commande
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Product Prep Row
// ────────────────────────────────────────────────────────────

function HandoffBadge({
  pickup,
  orderId,
  itemId,
}: {
  pickup: PickupCodeEntry | undefined;
  orderId: string;
  itemId: string;
}) {
  const confirmMutation = useConfirmHandoff(orderId);

  if (!pickup) return null;

  const isConfirmed = !!pickup.vendor_handoff_at;
  const courierCollected = pickup.status === "collected";

  if (isConfirmed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 whitespace-nowrap dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
        <ShieldCheck className="h-3 w-3" />
        Remise confirmée
      </span>
    );
  }

  if (courierCollected) {
    return (
      <button
        onClick={() =>
          confirmMutation.mutate(itemId, {
            onSuccess: () => toast.success("Remise confirmée !"),
            onError: (err) => toast.error(err.message || "Erreur lors de la confirmation"),
          })
        }
        disabled={confirmMutation.isPending}
        className="inline-flex items-center gap-1 rounded-full border border-sugu-200 bg-sugu-50 px-2 py-0.5 text-[10px] font-semibold text-sugu-600 transition-all active:scale-[0.98] hover:bg-sugu-100 whitespace-nowrap disabled:opacity-60 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400"
      >
        {confirmMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <HandshakeIcon className="h-3 w-3" />
        )}
        Confirmer remise
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500 whitespace-nowrap dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      <Clock className="h-3 w-3" />
      En attente coursier
    </span>
  );
}

function ProductPrepRow({
  product,
  pickup,
  orderId,
  onToggle,
}: {
  product: OrderDetailProduct;
  pickup: PickupCodeEntry | undefined;
  orderId: string;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl px-2.5 py-2 transition-colors lg:px-3 lg:py-2.5",
        product.ready
          ? "bg-green-50/40 dark:bg-green-950/10"
          : "bg-white/40 dark:bg-white/5",
      )}
    >
      <div className="flex items-center gap-2.5 lg:gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all",
            product.ready
              ? "border-green-500 bg-green-500 text-white"
              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900",
          )}
          aria-label={product.ready ? `Marquer ${product.name} comme non prêt` : `Marquer ${product.name} comme prêt`}
        >
          {product.ready && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Product image */}
        {product.image ? (
          <div className="relative h-8 w-8 overflow-hidden rounded-lg lg:h-9 lg:w-9">
            <Image src={product.image} alt={product.name} fill className="object-cover" />
          </div>
        ) : (
          <Package className="h-5 w-5 text-gray-400 lg:h-6 lg:w-6" />
        )}

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-medium truncate lg:text-sm",
            product.ready
              ? "text-gray-500 line-through"
              : "text-gray-900 dark:text-white",
          )}>
            {product.name}
          </p>
        </div>

        {/* Qty */}
        <span className="rounded-md border border-gray-200 bg-gray-50/80 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Qté: {product.quantity}
        </span>

        {/* Price */}
        <span className="hidden text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap lg:inline">
          {formatCurrency(product.unitPrice)} × {product.quantity} = {formatCurrency(product.lineTotal)} FCFA
        </span>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap lg:hidden">
          {formatCurrency(product.lineTotal)}
        </span>

        {/* Status badge */}
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
            product.ready
              ? "border-green-200 bg-green-50 text-green-600"
              : "border-amber-200 bg-amber-50 text-amber-600",
          )}
        >
          {product.ready ? "Prêt" : "En attente"}
        </span>
      </div>

      {/* Handoff badge/button row — only shown when a courier pickup exists */}
      {pickup && (
        <div className="pl-7 lg:pl-8">
          <HandoffBadge pickup={pickup} orderId={orderId} itemId={product.id} />
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Pickup Code Card
// ────────────────────────────────────────────────────────────

function PickupCodeCard({ codes }: { codes: PickupCodeEntry[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <section className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-sugu-500 lg:h-5 lg:w-5" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
          Code{codes.length > 1 ? "s" : ""} de collecte
        </h2>
      </div>
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Donnez ce code au coursier lors de la remise des articles.
      </p>

      <div className="mt-3 space-y-2 lg:mt-4">
        {codes.map((entry) => (
          <div
            key={entry.store_id}
            className="flex items-center justify-between rounded-xl border border-sugu-200/60 bg-sugu-50/60 px-3 py-2.5 dark:border-sugu-800/40 dark:bg-sugu-950/20"
          >
            <span className="font-mono text-lg font-bold tracking-widest text-sugu-700 dark:text-sugu-300 lg:text-xl">
              {entry.pickup_code}
            </span>
            <button
              onClick={() => handleCopy(entry.pickup_code)}
              className="ml-3 flex items-center gap-1.5 rounded-lg border border-sugu-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sugu-600 transition-all active:scale-[0.97] hover:bg-sugu-50 dark:border-sugu-800 dark:bg-gray-900 dark:text-sugu-400"
            >
              {copied === entry.pickup_code ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied === entry.pickup_code ? "Copié !" : "Copier"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
// COD Mixte Components
// ────────────────────────────────────────────────────────────

const COD_STEP_LABELS: Record<string, string> = {
  awaiting_vendor: "Attente confirmation vendeur",
  awaiting_negotiation: "Négociation livraison",
  awaiting_delivery_payment: "Paiement livraison en attente",
  awaiting_pickup: "Coursier en route",
  awaiting_inspection: "Inspection par le client",
  awaiting_product_payment: "Paiement produit en attente",
  awaiting_code: "Code de livraison en cours",
  completed: "Livraison terminée",
};

type CodMixteData = NonNullable<OrderDetail["codMixte"]>;

/** Compact COD badge for the header */
function CodMixteBadgeHeader({ codMixte }: { codMixte: CodMixteData }) {
  const bothPaid = codMixte.deliveryFeePaid && codMixte.productFeePaid;
  const onePaid = codMixte.deliveryFeePaid || codMixte.productFeePaid;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold",
        bothPaid
          ? "border-green-200 bg-green-50 text-green-700"
          : onePaid
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-blue-200 bg-blue-50 text-blue-700",
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

/** Detailed COD Mixte payment card for the financial section */
function CodMixtePaymentCard({ codMixte }: { codMixte: CodMixteData }) {
  const stepLabel = COD_STEP_LABELS[codMixte.currentStep] ?? codMixte.currentStep;
  const bothPaid = codMixte.deliveryFeePaid && codMixte.productFeePaid;
  const isActionPending =
    codMixte.currentStep === "awaiting_delivery_payment" ||
    codMixte.currentStep === "awaiting_product_payment";

  return (
    <div className="mt-3 space-y-3 lg:mt-4">
      {/* Step status */}
      <div
        className={cn(
          "rounded-xl border p-3 lg:p-4",
          isActionPending
            ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            : bothPaid
              ? "bg-green-50/60 border-green-200 dark:bg-green-950/20 dark:border-green-800"
              : "bg-blue-50/60 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
        )}
      >
        <div className="flex items-center gap-2">
          {isActionPending ? (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : bothPaid ? (
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <span
            className={cn(
              "text-xs font-semibold lg:text-sm",
              isActionPending
                ? "text-amber-700 dark:text-amber-300"
                : bothPaid
                  ? "text-green-700 dark:text-green-300"
                  : "text-blue-700 dark:text-blue-300",
            )}
          >
            {stepLabel}
          </span>
        </div>

        {/* Split progress bar */}
        <div className="mt-2.5 flex gap-1">
          <div className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors duration-500",
                codMixte.deliveryFeePaid ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700",
              )}
            />
            <p className="text-[10px] text-gray-500 mt-1 text-center dark:text-gray-400">
              Livraison {codMixte.deliveryFeePaid ? "✓" : ""}
            </p>
          </div>
          <div className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors duration-500",
                codMixte.productFeePaid ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700",
              )}
            />
            <p className="text-[10px] text-gray-500 mt-1 text-center dark:text-gray-400">
              Produit {codMixte.productFeePaid ? "✓" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Individual fee rows */}
      <div className="space-y-2">
        <CodFeeRow
          label="Frais de livraison"
          amount={codMixte.deliveryFeeAmount}
          paid={codMixte.deliveryFeePaid}
          paidAt={codMixte.deliveryFeePaidAt}
          icon={<Truck className="h-3.5 w-3.5" />}
        />
        <CodFeeRow
          label="Frais produit"
          amount={codMixte.productFeeAmount}
          paid={codMixte.productFeePaid}
          paidAt={codMixte.productFeePaidAt}
          icon={<Package className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Vendor confirmation */}
      {codMixte.vendorConfirmedAt && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 px-3 py-1.5 dark:bg-emerald-950/20">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
            Stock confirmé le {new Date(codMixte.vendorConfirmedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}
    </div>
  );
}

/** Individual COD fee row */
function CodFeeRow({
  label,
  amount,
  paid,
  paidAt,
  icon,
}: {
  label: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 border transition-colors",
        paid
          ? "bg-green-50/40 border-green-200/60 dark:bg-green-950/10 dark:border-green-800/40"
          : "bg-white/40 border-gray-200/60 dark:bg-white/5 dark:border-gray-700/40",
      )}
    >
      <div className={cn("flex-shrink-0", paid ? "text-green-600 dark:text-green-400" : "text-gray-400")}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-medium", paid ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300")}>
          {label}
        </p>
        {paidAt && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <span className={cn("text-xs font-bold", paid ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300")}>
        {formatCurrency(amount)} FCFA
      </span>
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
          paid
            ? "border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
            : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
        )}
      >
        {paid ? "Payé" : "En attente"}
      </span>
    </div>
  );
}
