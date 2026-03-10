"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Tag,
  Flame,
  BarChart2,
  Plus,
  Copy,
  Pencil,
  Check,
  X,
  Zap,
  Star,
  TrendingDown,
  Package,
  Trash2,
} from "lucide-react";
import type { VendorMarketing, PromoCode, PromotedProduct } from "@/features/vendor/schema";

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

/** Usage progress bar */
function UsageBar({ used, max }: { used: number; max: number }) {
  const pct = Math.min((used / max) * 100, 100);
  const full = used >= max;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            full
              ? "bg-red-500"
              : "bg-sugu-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {used}/{max}
      </span>
    </div>
  );
}

/** Status badge for promo code */
function PromoStatusBadge({ status, label }: { status: PromoCode["status"]; label: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
        <Check className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <X className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {label}
    </span>
  );
}

/** Toggle switch */
function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-label={active ? "Désactiver" : "Activer"}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500 focus-visible:ring-offset-1",
        active ? "bg-sugu-500" : "bg-gray-200 dark:bg-gray-700",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
          active ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** Promoted product card */
function ProductPromoCard({
  product,
  active,
  onToggle,
  onDelete,
  onEdit,
  isToggling,
}: {
  product: PromotedProduct;
  active: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  isToggling?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-4 transition-all duration-300",
        active ? "ring-1 ring-sugu-300/50" : "opacity-60",
      )}
    >
      {/* Product image + discount badge */}
      <div className="relative mb-3 flex h-20 items-center justify-center rounded-xl bg-sugu-50 dark:bg-sugu-950/20 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
        )}
        <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-sugu-500 text-[10px] font-black text-white">
          -{product.discountPercent}%
        </span>
      </div>

      {/* Product info */}
      <p className="line-clamp-2 text-xs font-semibold text-gray-900 dark:text-white leading-snug">
        {product.name}
      </p>

      {/* Price row */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <TrendingDown className="h-3 w-3 text-red-400 flex-shrink-0" />
        <span className="text-[10px] text-gray-400 line-through">
          -{formatCurrency(product.originalPrice - product.promoPrice)} FCFA
        </span>
      </div>
      <p className="text-sm font-extrabold text-sugu-600">
        {formatCurrency(product.promoPrice)}{" "}
        <span className="text-[10px] font-medium text-gray-400">FCFA</span>
      </p>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {product.expiresLabel === "∞" ? "Sans expiration" : `Expire: ${product.expiresLabel}`}
        </span>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              title="Modifier"
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm('Supprimer cette promotion ?')) {
                  onDelete();
                }
              }}
              title="Supprimer"
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-50",
              active
                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400",
            )}
          >
            {isToggling ? "…" : active ? "Désactiver" : "Activer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────

export function MarketingContent({ data, onToggleCoupon, onOpenCreateCoupon, onOpenCreatePromotion, onDeletePromotion, onTogglePromotion, onEditPromotion, isTogglingPromotion }: { data: VendorMarketing; onToggleCoupon?: (couponId: string) => void; onOpenCreateCoupon?: () => void; onOpenCreatePromotion?: () => void; onDeletePromotion?: (promotionId: string) => void; onTogglePromotion?: (promotionId: string, currentlyActive: boolean) => void; onEditPromotion?: (product: PromotedProduct) => void; isTogglingPromotion?: boolean }) {
  // track per-promo-code toggles: id → disabled
  const [disabledCodes, setDisabledCodes] = useState<Set<string>>(new Set());

  const toggleCode = (id: string) => {
    setDisabledCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Call the API mutation
    onToggleCoupon?.(id);
  };

  const activeCodesCount = data.promoCodes.filter(
    (c) => c.status === "active" && !disabledCodes.has(c.id),
  ).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      {/* ════════════ Header ════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing</h1>
        <button
          id="btn-create-promotion"
          onClick={onOpenCreatePromotion}
          className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500"
        >
          <Plus className="h-4 w-4" />
          Créer une promotion
        </button>
      </div>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Promotions actives */}
        <div className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "0ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-sugu-500" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Promotions actives
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-gray-900 dark:text-white">
                  {activeCodesCount}
                </span>
                <span className="text-sm text-gray-400">
                  sur {data.kpis.totalPromotions} créées
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sugu-50 dark:bg-sugu-950/30">
              <Tag className="h-5 w-5 text-sugu-500" />
            </div>
          </div>
        </div>

        {/* Économies clients */}
        <div
          className="glass-card animate-card-enter rounded-2xl p-5"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Économies clients
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  {formatCurrency(data.kpis.clientSavings)}
                </span>
                <span className="text-sm font-semibold text-gray-400">FCFA</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">ce mois</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Codes utilisés */}
        <div
          className="glass-card animate-card-enter rounded-2xl p-5"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Codes utilisés
                </p>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-black text-gray-900 dark:text-white">
                  {data.kpis.codesUsed}
                </span>
                <span className="text-sm text-gray-400">/ {data.kpis.codesTotal}</span>
              </div>
              {/* Mini progress */}
              <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${Math.min((data.kpis.codesUsed / data.kpis.codesTotal) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <BarChart2 className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════ Promo Codes Section ════════════ */}
      <section aria-labelledby="promo-codes-heading" className="glass-card rounded-3xl p-6">
        {/* Section header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-4 w-4 text-gray-500" />
            <h2
              id="promo-codes-heading"
              className="text-sm font-bold text-gray-900 dark:text-white"
            >
              Codes Promo
            </h2>
            <span className="rounded-full bg-sugu-50 px-2 py-0.5 text-[10px] font-bold text-sugu-600 dark:bg-sugu-950/30">
              {activeCodesCount} actifs
            </span>
          </div>
          <button
            id="btn-new-code"
            onClick={onOpenCreateCoupon}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sugu-200 bg-sugu-50/60 px-3.5 py-1.5 text-xs font-semibold text-sugu-600 backdrop-blur-sm transition-all hover:bg-sugu-100/80 dark:border-sugu-900/40 dark:bg-sugu-950/20 dark:text-sugu-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau code
          </button>
        </div>

        {/* Table — desktop */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm" aria-label="Tableau des codes promo">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Code", "Remise", "Conditions", "Utilisations", "Expire le", "Statut", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      scope="col"
                      className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 first:pl-0"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.promoCodes.map((code) => {
                const isDisabled = disabledCodes.has(code.id);
                const effectiveStatus = isDisabled ? "disabled" : code.status;
                return (
                  <tr
                    key={code.id}
                    className={cn(
                      "group transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/20",
                      effectiveStatus !== "active" && "opacity-60",
                    )}
                  >
                    {/* Code */}
                    <td className="py-3.5 pr-4 font-mono text-sm font-bold text-sugu-600 dark:text-sugu-400">
                      {code.code}
                    </td>
                    {/* Remise */}
                    <td className="py-3.5 pr-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {code.discount}
                    </td>
                    {/* Conditions */}
                    <td className="py-3.5 pr-4 text-xs text-gray-500 dark:text-gray-400">
                      {code.conditions}
                    </td>
                    {/* Utilisations */}
                    <td className="py-3.5 pr-4">
                      <UsageBar used={code.usages} max={code.usagesMax} />
                    </td>
                    {/* Expire le */}
                    <td className="py-3.5 pr-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {code.expiresLabel}
                    </td>
                    {/* Statut */}
                    <td className="py-3.5 pr-4">
                      <PromoStatusBadge
                        status={effectiveStatus}
                        label={isDisabled ? "Désactivé" : code.statusLabel}
                      />
                    </td>
                    {/* Actions */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label={`Copier le code ${code.code}`}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label={`Modifier le code ${code.code}`}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {code.status !== "expired" && (
                          <Toggle
                            active={!isDisabled}
                            onChange={() => toggleCode(code.id)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cards — mobile */}
        <div className="space-y-3 md:hidden">
          {data.promoCodes.map((code) => {
            const isDisabled = disabledCodes.has(code.id);
            const effectiveStatus = isDisabled ? "disabled" : code.status;
            return (
              <div
                key={code.id}
                className={cn(
                  "rounded-xl border border-gray-100 bg-white/50 p-4 dark:border-gray-800 dark:bg-gray-900/30",
                  effectiveStatus !== "active" && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-sugu-600 dark:text-sugu-400">
                    {code.code}
                  </span>
                  <PromoStatusBadge
                    status={effectiveStatus}
                    label={isDisabled ? "Désactivé" : code.statusLabel}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <span>Remise : <strong className="text-gray-800 dark:text-gray-200">{code.discount}</strong></span>
                  <span>Conditions : {code.conditions}</span>
                  <span>Expire : {code.expiresLabel}</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <UsageBar used={code.usages} max={code.usagesMax} />
                  <div className="flex items-center gap-2">
                    <button aria-label={`Copier ${code.code}`} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button aria-label={`Éditer ${code.code}`} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {code.status !== "expired" && (
                      <Toggle active={!isDisabled} onChange={() => toggleCode(code.id)} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create CTA */}
        <button
          id="btn-create-promo-code"
          onClick={onOpenCreateCoupon}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 py-2.5 text-xs font-semibold text-gray-400 transition-colors hover:border-sugu-300 hover:text-sugu-500 dark:border-gray-700 dark:hover:border-sugu-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Créer un nouveau code promo
        </button>
      </section>

      {/* ════════════ Promoted Products Section ════════════ */}
      <section aria-labelledby="promo-products-heading" className="glass-card rounded-3xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-4 w-4 text-amber-500" />
            <h2
              id="promo-products-heading"
              className="text-sm font-bold text-gray-900 dark:text-white"
            >
              Produits en promotion
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Produits avec remise active
            </span>
          </div>
          <button
            id="btn-add-promotion"
            onClick={onOpenCreatePromotion}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sugu-200 bg-sugu-50/60 px-3.5 py-1.5 text-xs font-semibold text-sugu-600 backdrop-blur-sm transition-all hover:bg-sugu-100/80 dark:border-sugu-900/40 dark:bg-sugu-950/20 dark:text-sugu-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Mettre en promotion
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.promotedProducts.map((product) => (
            <ProductPromoCard
              key={product.id}
              product={product}
              active={product.active}
              onToggle={() => {
                if (product.promotionId) {
                  onTogglePromotion?.(product.promotionId, product.active);
                }
              }}
              onDelete={
                product.promotionId
                  ? () => onDeletePromotion?.(product.promotionId!)
                  : undefined
              }
              onEdit={
                product.promotionId
                  ? () => onEditPromotion?.(product)
                  : undefined
              }
              isToggling={isTogglingPromotion}
            />
          ))}

          {/* "Add product" placeholder card */}
          <button
            id="btn-add-product-promo"
            aria-label="Mettre un produit en promotion"
            onClick={onOpenCreatePromotion}
            className="glass-card flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 transition-all hover:border-sugu-300 hover:text-sugu-500 dark:border-gray-700 dark:hover:border-sugu-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-current">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-center text-xs font-medium leading-tight">
              Mettre un produit
              <br />
              en promotion
            </p>
          </button>
        </div>
      </section>

      {/* ════════════ Premium CTA Banner ════════════ */}
      <section
        aria-labelledby="premium-cta-heading"
        className="relative overflow-hidden rounded-3xl bg-gray-900 p-6 dark:bg-gray-950"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-sugu-500/20 blur-2xl" />
          <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full bg-purple-500/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sugu-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3
                id="premium-cta-heading"
                className="flex items-center gap-2 text-base font-bold text-white"
              >
                Débloquez le Marketing avancé
              </h3>
              <p className="mt-0.5 text-sm text-gray-400">
                Newsletter, campagnes email, push notifications, segments clients, analytics
                marketing…
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              id="btn-upgrade-premium"
              className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <Star className="h-4 w-4 fill-white" />
              Passer en Premium
            </button>
            <span className="text-[11px] text-gray-500">14 jours d'essai gratuit</span>
          </div>
        </div>
      </section>
    </div>
  );
}
