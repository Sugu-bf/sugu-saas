"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { VendorProductDetail } from "@/features/vendor/schema";
import {
  ArrowLeft,
  Copy,
  Star,
  Package,
  ShoppingCart,
  Eye,
  DollarSign,
  BarChart3,
  Tag,
  MessageSquare,
  Clock,
  Archive,
  Ban,
  Pencil,
  ExternalLink,
  MoreHorizontal,
  Image as ImageIcon,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
interface ProductDetailContentProps {
  data: VendorProductDetail;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  active: "text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-800",
  draft: "text-gray-500 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-gray-800/50 dark:border-gray-700",
  out_of_stock: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800",
  low_stock: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800",
  archived: "text-gray-400 bg-gray-50 border-gray-200 dark:text-gray-500 dark:bg-gray-800/50 dark:border-gray-700",
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`Note : ${rating} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : 
            i < rating ? "fill-amber-400/50 text-amber-400" : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          )}
        />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
export function ProductDetailContent({ data }: ProductDetailContentProps) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [copiedSku, setCopiedSku] = useState(false);

  const handleCopySku = () => {
    navigator.clipboard.writeText(data.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 lg:space-y-5">
      {/* ═══════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <Link
            href="/vendor/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-sugu-500"
            aria-label="Retour aux produits"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux produits
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-foreground lg:text-2xl">
              {data.name}
            </h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              STATUS_BADGE[data.status] || STATUS_BADGE.active,
            )}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {data.statusLabel}
            </span>
            {data.isPromo && (
              <span className="rounded-full bg-sugu-500 px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                PROMO
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            className="glass-card hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:shadow-md lg:inline-flex"
            aria-label="Aperçu boutique"
          >
            <ExternalLink className="h-4 w-4" />
            Aperçu boutique
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] lg:gap-2 lg:px-4 lg:py-2.5 lg:text-sm lg:hover:bg-sugu-600"
            aria-label="Modifier le produit"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
          <button
            className="glass-card inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-all active:shadow-md lg:p-2.5 lg:hover:text-foreground lg:hover:shadow-md"
            aria-label="Plus d'options"
          >
            <MoreHorizontal className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN GRID (3 Layout Columns mirroring Image 1)
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-5 items-start">
        {/* ─── COLUMN 1: Photos & Ventes Récentes ─── */}
        <div className="lg:col-span-3 space-y-3 lg:space-y-5">
          {/* Photos */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-sugu-500" />
              Photos
            </h2>

            {/* Main photo */}
            <div className="relative aspect-square overflow-hidden rounded-xl bg-sugu-50 dark:bg-gray-800">
              {data.isPromo && (
                <div className="absolute left-2 top-2 z-10 rounded-lg bg-sugu-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
                  PROMO -{data.discountPercent}%
                </div>
              )}
              {data.photos[selectedPhoto]?.url ? (
                <Image
                  src={data.photos[selectedPhoto].url}
                  alt={data.photos[selectedPhoto].alt || data.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-7xl drop-shadow-lg"><Package className="h-16 w-16 text-gray-300" /></span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex items-center gap-2">
              {data.photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(i)}
                  className={cn(
                    "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                    selectedPhoto === i
                      ? "border-sugu-500"
                      : "border-transparent opacity-70 hover:opacity-100"
                  )}
                  aria-label={`Photo ${i + 1}`}
                >
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={photo.alt || `Photo ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-amber-50 text-xl dark:bg-gray-800">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Photo count + add */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{data.photos.length} photos</span>
              <button className="inline-flex items-center gap-1 text-sugu-500 transition-colors hover:text-sugu-600 font-medium">
                Ajouter des photos
              </button>
            </div>
          </div>
        </div>

        {/* ─── Main Info ─── */}
        <div className="lg:col-span-5 h-full">
          <div className="glass-card rounded-2xl p-4 lg:p-6 space-y-3 lg:space-y-4 h-full">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Informations principales
            </p>
            <h2 className="text-lg font-bold text-foreground lg:text-2xl">
              Informations principales
            </h2>

            {/* SKU */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">SKU:</span>
              <span className="text-sm font-semibold text-foreground">{data.sku}</span>
              <button
                onClick={handleCopySku}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Copier le SKU"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copiedSku && (
                <span className="text-xs text-green-600 font-medium animate-fade-in">Copié !</span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <StarRating rating={data.rating} size="sm" />
              <span className="text-xs text-sugu-500 font-medium">
                {data.reviewLabel || `${data.reviewCount} avis`}
              </span>
            </div>

            {/* Price */}
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-sugu-500 lg:text-2xl">
                  {formatCurrency(data.price)} {data.currency}
                </span>
                {data.discountPercent && (
                  <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    -{data.discountPercent}%
                  </span>
                )}
              </div>
              {data.marginEstimated && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.marginEstimated)} {data.currency} · Margin estimated
                </p>
              )}
            </div>

            {/* Attributes table */}
            <div className="space-y-2 text-sm">
              {[
                { label: "Categorty", value: data.category },
                { label: "Poids", value: data.weight },
                { label: "Packaging", value: data.packaging },
                { label: "Origin", value: data.origin },
              ].map((attr) => (
                <div key={attr.label} className="flex items-center gap-4">
                  <span className="w-24 flex-shrink-0 text-muted-foreground">{attr.label}</span>
                  <span className="font-medium text-foreground">{attr.value}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Description : {data.description}
            </p>

            {/* Volume discounts — only show if tiers exist */}
            {data.volumeDiscounts.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-3 gap-px bg-muted/50 text-xs font-semibold text-muted-foreground">
                <div className="bg-white/80 px-3 py-2 dark:bg-gray-900/80">Quantité</div>
                <div className="bg-white/80 px-3 py-2 dark:bg-gray-900/80">Price</div>
                <div className="bg-white/80 px-3 py-2 dark:bg-gray-900/80">Déscount</div>
              </div>
              {data.volumeDiscounts.map((tier) => (
                <div key={tier.label} className="grid grid-cols-3 gap-px border-t border-border text-sm">
                  <div className="bg-white/40 px-3 py-2 font-medium dark:bg-gray-900/40">{tier.label}</div>
                  <div className="bg-white/40 px-3 py-2 dark:bg-gray-900/40">
                    {formatCurrency(tier.price)} {data.currency}
                  </div>
                  <div className="bg-white/40 px-3 py-2 text-sugu-500 font-semibold dark:bg-gray-900/40">
                    {tier.discount}%
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Tags</span>
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-sugu-200 bg-sugu-50/60 px-3 py-1 text-xs font-medium text-sugu-700 transition-colors hover:bg-sugu-100 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right Column: KPIs + Variants Summary + Reviews Summary ─── */}
        <div className="lg:col-span-4 space-y-3 lg:space-y-4">
          {/* KPI stat cards (4x1 grid on wide screens, 2x2 on small desktops) */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {/* Stock */}
            <KpiStatCard
              icon={<Package className="h-4 w-4" />}
              iconColor="text-blue-500"
              label="Stock"
              value={String(data.kpis.stock.value)}
              sub={`${data.kpis.stock.unit || "unités"}  ${data.kpis.stock.percent ? data.kpis.stock.percent + "%" : ""}`}
              footer={data.kpis.stock.alertThreshold ? `Alert thrbsi ${data.kpis.stock.alertThreshold}` : undefined}
            />
            {/* Vendus */}
            <KpiStatCard
              icon={<ShoppingCart className="h-4 w-4" />}
              iconColor="text-purple-500"
              label="Vendus"
              value={String(data.kpis.sold.value)}
              sub={data.kpis.sold.period || ""}
              change={data.kpis.sold.change}
              changeType={data.kpis.sold.changeType}
            />
            {/* Vues */}
            <KpiStatCard
              icon={<Eye className="h-4 w-4" />}
              iconColor="text-cyan-500"
              label="Vues"
              value={formatCurrency(data.kpis.views.value)}
              sub={data.kpis.views.period || ""}
              change={data.kpis.views.change}
              changeType={data.kpis.views.changeType}
            />
            {/* Revenus */}
            <KpiStatCard
              icon={<DollarSign className="h-4 w-4" />}
              iconColor="text-green-500"
              label="Revenus"
              value={`${formatCurrency(data.kpis.revenue.value)}`}
              sub={data.kpis.revenue.currency || "FCFA"}
              footer={data.kpis.revenue.period}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Variantes & Tarifs summary */}
            <div className="glass-card rounded-2xl p-4 space-y-3 h-full">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-sugu-500" />
              Variantes & Tarifs
            </h3>
            <div className="space-y-2">
              {/* Weight row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Poids</span>
                <span className="font-medium text-foreground">Price</span>
              </div>
              {data.variantsSummary.weight.map((v) => (
                <div key={v.label} className="flex items-center justify-between text-sm">
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-lg px-3 py-1 text-xs font-bold",
                    v.isActive
                      ? "bg-sugu-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {v.label}
                  </span>
                  <span className="font-medium">{formatCurrency(v.price)} FCFA</span>
                </div>
              ))}
              {/* Packaging row */}
              {data.variantsSummary.packaging.map((v) => (
                <div key={v.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{v.label}</span>
                  <span className="font-medium">{formatCurrency(v.price)} FCFA</span>
                </div>
              ))}
            </div>
            <Link
              href="#"
              className="inline-flex items-center gap-1 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
            >
              Modifier ou tes tarifs →
            </Link>
          </div>

          {/* Avis clients summary — only show when reviews exist */}
          {data.reviewsSummary.recentReviews.length > 0 && (
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-sugu-500" />
              Avis clients
            </h3>
            <div className="space-y-0.5">
              <p className="text-xl font-bold text-foreground">
                {data.reviewsSummary.revenueLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.reviewsSummary.monthlyRevenue}
              </p>
            </div>
            {/* Recent reviewers */}
            <div className="space-y-2">
              {data.reviewsSummary.recentReviews.map((review) => (
                <div key={review.id} className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    review.avatarColor,
                  )}>
                    {review.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{review.name}</p>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{review.timeAgo}</span>
                </div>
              ))}
            </div>
              <Link
                href="#"
                className="inline-flex items-center gap-1 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
              >
                Toutes les avis →
              </Link>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM ROW: Recent Sales | Variants Detail | Reviews Detail | History
          Uses lg:col-start-X to lock alignments perfectly below top row!
         ═══════════════════════════════════════════════════════════ */}
      {(data.recentSales.orders.length > 0 ||
        data.variantsDetail.pricingTiers.length > 0 ||
        data.reviewsDetail.reviews.length > 0 ||
        data.history.length > 0) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-5">
          {/* ─── Recent Sales ─── */}
          {data.recentSales.orders.length > 0 && (
            <div className="lg:col-span-3 lg:col-start-1 h-full">
              <RecentSalesCard data={data} />
            </div>
          )}

          {/* ─── Variants & Tarifs Detail ─── */}
          {data.variantsDetail.pricingTiers.length > 0 && (
            <div className="lg:col-span-5 lg:col-start-4 h-full">
              <VariantsDetailCard data={data} />
            </div>
          )}

          {/* ─── Reviews Detail ─── */}
          {data.reviewsDetail.reviews.length > 0 && (
            <div className="lg:col-span-2 lg:col-start-9 h-full">
              <ReviewsDetailCard data={data} />
            </div>
          )}

          {/* ─── History ─── */}
          {data.history.length > 0 && (
            <div className="lg:col-span-2 lg:col-start-11 h-full">
              <HistoryCard data={data} />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM ACTION BAR
         ═══════════════════════════════════════════════════════════ */}
      <div className="glass-card sticky bottom-4 z-30 flex flex-col gap-2 rounded-2xl p-3 shadow-lg lg:flex-row lg:items-center lg:justify-between lg:gap-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-foreground">{data.name}</h3>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
            STATUS_BADGE[data.status],
          )}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {data.statusLabel}
          </span>
          <span className="text-xs text-muted-foreground hidden lg:inline">
            Publication du {new Date(data.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="glass-card inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all active:shadow-md lg:px-4 lg:text-sm lg:hover:shadow-md">
            <Archive className="h-4 w-4" />
            Archiver
          </button>
          <button className="glass-card inline-flex items-center gap-2 rounded-xl border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-all active:bg-red-50 active:shadow-md lg:hover:bg-red-50 lg:hover:shadow-md dark:border-red-800 dark:text-red-400 dark:active:bg-red-950/30 dark:lg:hover:bg-red-950/30 lg:px-4 lg:text-sm">
            <Ban className="h-4 w-4" />
            Désactiver
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-[0.98] lg:hover:bg-sugu-600 lg:px-5 lg:text-sm">
            <Pencil className="h-4 w-4" />
            Modifier le produit
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// KPI Stat Card Atom
// ════════════════════════════════════════════════════════════
function KpiStatCard({
  icon,
  iconColor,
  label,
  value,
  sub,
  change,
  changeType,
  footer,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  footer?: string;
}) {
  return (
    <div className="glass-card kpi-card rounded-2xl p-3.5 space-y-1.5 animate-card-enter">
      <div className="flex items-center gap-1.5">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg bg-current/10", iconColor)}>
          {icon}
        </span>
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <p className="text-lg font-extrabold text-foreground leading-none lg:text-2xl">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
      {change && (
        <span className={cn(
          "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
          changeType === "positive" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
          changeType === "negative" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        )}>
          {change}
        </span>
      )}
      {footer && (
        <p className="text-[11px] text-muted-foreground">{footer}</p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Recent Sales Card
// ════════════════════════════════════════════════════════════
function RecentSalesCard({ data }: { data: VendorProductDetail }) {
  const { recentSales } = data;

  // Generate SVG path for mini chart
  const chartWidth = 280;
  const chartHeight = 100;
  const maxY = Math.max(...recentSales.chartData.map(p => p.y));
  const maxX = Math.max(...recentSales.chartData.map(p => p.x));
  const points = recentSales.chartData.map(p => ({
    x: (p.x / maxX) * chartWidth,
    y: chartHeight - (p.y / maxY) * chartHeight,
  }));
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (p.x - prev.x) * 0.4;
    const cpx2 = p.x - (p.x - prev.x) * 0.4;
    return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const areaD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 lg:p-5 lg:space-y-4 animate-card-enter">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-sugu-500" />
        Ventes récentes
      </h3>

      {/* Mini area chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-24 w-full"
          preserveAspectRatio="none"
          aria-label="Graphique des ventes récentes"
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f15412" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f15412" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#salesGradient)" />
          <path d={pathD} fill="none" stroke="#f15412" strokeWidth="2" strokeLinecap="round" className="chart-path" />
          {/* Data dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#f15412" strokeWidth="2" />
          ))}
        </svg>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-[9px] text-muted-foreground pointer-events-none">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
      </div>

      {/* Orders table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs" aria-label="Ventes récentes">
          <tbody>
            {recentSales.orders.map((order) => (
              <tr key={order.id} className="border-t border-border/50 transition-colors active:bg-muted/30 lg:hover:bg-muted/30">
                <td className="px-2 py-2 font-mono text-muted-foreground whitespace-nowrap">{order.reference}</td>
                <td className="px-2 py-2 text-foreground">{order.customer}</td>
                <td className="px-2 py-2 text-center text-muted-foreground">{order.qty}</td>
                <td className="px-2 py-2 font-semibold text-foreground whitespace-nowrap">{order.price} {order.currency}</td>
                <td className="px-2 py-2 text-muted-foreground">{order.time}</td>
                <td className="px-2 py-2">
                  <span className={cn("font-medium", order.statusColor)}>
                    {order.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href="/vendor/orders"
        className="inline-flex items-center gap-1 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
      >
        Voir toutes les commandes →
      </Link>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Variants Detail Card
// ════════════════════════════════════════════════════════════
function VariantsDetailCard({ data }: { data: VendorProductDetail }) {
  const { variantsDetail } = data;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 lg:p-5 lg:space-y-4 animate-card-enter" style={{ animationDelay: "0.1s" }}>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Tag className="h-4 w-4 text-sugu-500" />
        Variantes & Tarifs
      </h3>

      {/* Weight options */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Poids</p>
        <div className="flex flex-wrap gap-2">
          {variantsDetail.weights.map((w, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                w.isActive
                  ? "bg-sugu-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {w.label}
            </span>
          ))}
        </div>
      </div>

      {/* Packaging options */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Packagings</p>
        <div className="flex flex-wrap gap-2">
          {variantsDetail.packagings.map((p, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                p.isActive
                  ? "bg-sugu-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Pricing table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-3 bg-muted/50 text-xs font-semibold text-muted-foreground">
          <div className="px-3 py-2">Quantité</div>
          <div className="px-3 py-2">Price</div>
          <div className="px-3 py-2">Déscount</div>
        </div>
        {variantsDetail.pricingTiers.map((tier, i) => (
          <div key={i} className="grid grid-cols-3 border-t border-border text-sm">
            <div className="px-3 py-2 text-foreground font-medium">{tier.minQty}</div>
            <div className="px-3 py-2 text-foreground">{tier.price} {tier.currency}</div>
            <div className="px-3 py-2 text-sugu-500 font-semibold">{tier.discount}%</div>
          </div>
        ))}
      </div>

      <Link
        href="#"
        className="inline-flex items-center gap-1 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
      >
        Modifier tarifs →
      </Link>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Reviews Detail Card
// ════════════════════════════════════════════════════════════
function ReviewsDetailCard({ data }: { data: VendorProductDetail }) {
  const { reviewsDetail } = data;
  const maxCount = Math.max(...reviewsDetail.ratingDistribution.map(d => d.count), 1);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 lg:p-5 lg:space-y-4 animate-card-enter" style={{ animationDelay: "0.2s" }}>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        Avis clients
      </h3>

      {/* Big rating */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
          <span className="text-xl font-extrabold text-foreground lg:text-3xl">{reviewsDetail.globalRating}</span>
        </div>
      </div>

      {/* Rating distribution bars */}
      <div className="space-y-1.5">
        {reviewsDetail.ratingDistribution.map((entry) => (
          <div key={entry.stars} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right text-muted-foreground font-medium">{entry.stars}</span>
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  entry.stars >= 4 ? "bg-green-500" : entry.stars === 3 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.max((entry.count / maxCount) * 100, 4)}%` }}
              />
            </div>
            <span className="w-4 text-muted-foreground">{entry.count}</span>
          </div>
        ))}
      </div>

      {/* Recent reviewers */}
      <div className="space-y-2 pt-1">
        {reviewsDetail.reviews.map((review) => (
          <div key={review.id} className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sugu-100 text-sm font-bold text-sugu-700 dark:bg-sugu-900 dark:text-sugu-300 lg:h-9 lg:w-9">
              {review.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{review.name}</p>
            </div>
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{review.timeAgo}</span>
          </div>
        ))}
      </div>

      <Link
        href="#"
        className="inline-flex items-center gap-1 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
      >
        Toutes les avis →
      </Link>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// History Card
// ════════════════════════════════════════════════════════════
function HistoryCard({ data }: { data: VendorProductDetail }) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3 lg:p-5 lg:space-y-4 animate-card-enter" style={{ animationDelay: "0.3s" }}>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-sugu-500" />
        Historique des modifications
      </h3>

      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

        {data.history.map((entry, i) => (
          <div key={entry.id} className="relative flex gap-4 py-3">
            {/* Timeline dot */}
            <div className={cn(
              "relative z-10 mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-white dark:border-gray-900",
              i === 0 ? "bg-sugu-500" : "bg-muted-foreground/40",
            )} style={{ marginLeft: "5px" }} />

            {/* Content */}
            <div className="flex-1 min-w-0 -mt-0.5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono font-semibold">{entry.date}</span>
              </div>
              <p className="text-sm font-medium text-foreground mt-0.5">{entry.action}</p>
              <p className="text-xs text-muted-foreground">Auteur: {entry.author}</p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="#"
        className="inline-flex items-center gap-1 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
      >
        Historique des histories →
      </Link>
    </div>
  );
}
