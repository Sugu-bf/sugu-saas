"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, EmptyState, ErrorState, Money, Pagination, Skeleton, StatusBadge, cn, type PaginationProps } from "@/design-system";
import type { ProductListItem } from "../contract";
import { ProductImage, StockCell } from "./product-bits";

export interface ProductGridProps {
  /** The products of the current page, in the order the server returned them. */
  products: ProductListItem[];
  /** Same states as `DataTable`: the two views of the list answer alike. */
  state?: "ready" | "loading" | "error";
  refreshing?: boolean;
  error?: { title?: string; description?: ReactNode; onRetry?: () => void; retrying?: boolean };
  empty: { title: string; description?: ReactNode; action?: ReactNode; icon?: LucideIcon };
  /** The menu of a product, the same as in the table. */
  actions: (product: ProductListItem) => ReactNode;
  pagination?: Omit<PaginationProps, "className">;
}

// Columns follow the room the grid really has (container, not viewport): two
// on a phone, four on a tablet, up to six on a wide desk. Cards keep about the
// same width everywhere, so one composition serves every screen.
const GRID = "grid grid-cols-2 gap-3 @lg:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5 @[68rem]:grid-cols-6";
const PICTURE_SIZES = "(min-width: 1024px) 220px, (min-width: 672px) 25vw, 50vw";

/** The catalogue as pictures: what each product looks like, its status, price and stock. */
export function ProductGrid({ products, state = "ready", refreshing = false, error, empty, actions, pagination }: ProductGridProps) {
  if (state === "error") {
    return (
      <Card flush>
        <ErrorState {...error} />
      </Card>
    );
  }

  if (state === "ready" && products.length === 0) {
    return (
      <Card flush>
        <EmptyState {...empty} />
      </Card>
    );
  }

  const loading = state === "loading";

  return (
    <div className="@container flex flex-col gap-3" aria-busy={loading || refreshing || undefined}>
      {loading && (
        <p role="status" className="sr-only">
          Chargement…
        </p>
      )}

      <ul aria-label="Produits" className={cn(GRID, refreshing && "opacity-60")}>
        {loading
          ? Array.from({ length: 12 }, (_, index) => (
              <li key={index} className="overflow-hidden rounded-panel border border-border bg-surface">
                <Skeleton className="aspect-square rounded-none" />
                <div className="flex flex-col gap-2 p-2.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="mt-1.5 h-4 w-2/5" />
                  <Skeleton className="h-6 w-3/5" />
                </div>
              </li>
            ))
          : products.map((product) => <ProductCard key={product.id} product={product} actions={actions(product)} />)}
      </ul>

      {pagination && (
        <Card className="px-3 py-2">
          <Pagination {...pagination} disabled={pagination.disabled || loading || refreshing} />
        </Card>
      )}
    </div>
  );
}

function ProductCard({ product, actions }: { product: ProductListItem; actions: ReactNode }) {
  const reference = [product.sku, product.category].filter(Boolean).join(" · ");
  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface transition-colors duration-100",
        // The whole card opens the product: it answers like one control.
        "hover:border-border-strong has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-focus-ring",
      )}
    >
      <div className="relative aspect-square border-b border-border bg-surface-subtle">
        <ProductImage src={product.image} alt="" sizes={PICTURE_SIZES} />
        {/* Along the bottom edge: the full width of the card, whatever the status says. */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex">
          <StatusBadge domain="product" code={product.status} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2.5">
        <Link
          href={`/vendor/products/${product.id}`}
          data-card-link=""
          className="line-clamp-2 font-medium break-words text-foreground outline-none after:absolute after:inset-0"
        >
          {product.name}
        </Link>
        <p className="truncate text-meta text-foreground-muted">{reference || "Sans référence"}</p>

        <div className="mt-auto flex flex-col gap-1 pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Money francs={product.priceFrancs} className="font-medium text-foreground" />
            {product.hasVariants && (
              <span className="text-meta text-foreground-muted">
                {product.variantCount > 1 ? `${product.variantCount} variantes` : "Avec variantes"}
              </span>
            )}
          </p>
          <StockCell stock={product.stock} level={product.stockLevel} className="justify-start" />
        </div>
      </div>

      {/* Above the stretched link, so the menu stays reachable. */}
      <div className="absolute top-1.5 right-1.5 z-[1]">{actions}</div>
    </li>
  );
}
