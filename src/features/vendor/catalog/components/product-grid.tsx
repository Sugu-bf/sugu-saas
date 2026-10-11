"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, EmptyState, ErrorState, Money, Pagination, Skeleton, StatusBadge, cn, type PaginationProps } from "@/design-system";
import type { ProductListItem } from "../contract";
import { ProductImage, StockLine } from "./product-bits";

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

// Columns follow the room the grid really has (its container, not the
// viewport), and never the most that would fit: a card keeps the width its
// picture and its status need.
//   under 576px   two cards, picture on top (a phone);
//   576 to 672px  three of them;
//   from 672px    picture on the left, two cards a row;
//   from 928px    three a row;
//   from 1216px   four.
// On its side a card is at least 292px wide. "En validation", the longest
// status, needs 277px of card to fit next to the menu; narrower, the picture
// also gets too small to tell a product from its neighbour.
const GRID = "grid grid-cols-2 gap-3 @xl/grid:grid-cols-3 @2xl/grid:grid-cols-2 @2xl/grid:gap-4 @[58rem]/grid:grid-cols-3 @[76rem]/grid:grid-cols-4";

// Shared by the card and its placeholder: upright under 672px of grid, on its side from there.
const CARD = "relative flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface @2xl/grid:flex-row @2xl/grid:gap-3 @2xl/grid:p-2";
const PICTURE = "relative aspect-square shrink-0 @2xl/grid:w-[38%] @2xl/grid:max-w-36 @2xl/grid:self-start @2xl/grid:rounded-control";
const BODY = "flex min-w-0 flex-1 flex-col p-2.5 @2xl/grid:p-0";

const PICTURE_SIZES = "(min-width: 704px) 144px, (min-width: 608px) 33vw, 50vw";

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
    <div className="@container/grid flex flex-col gap-3" aria-busy={loading || refreshing || undefined}>
      {loading && (
        <p role="status" className="sr-only">
          Chargement…
        </p>
      )}

      <ul aria-label="Produits" className={cn(GRID, refreshing && "opacity-60")}>
        {loading
          ? Array.from({ length: 12 }, (_, index) => (
              <li key={index} className={CARD}>
                <Skeleton className={cn("rounded-none", PICTURE)} />
                <div className={cn(BODY, "gap-2")}>
                  <Skeleton className="h-6 w-24 rounded-pill" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="mt-2 h-5 w-2/5" />
                  <Skeleton className="h-4 w-1/3" />
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
        CARD,
        "transition-colors duration-100",
        // The whole card opens the product: it answers like one control.
        "hover:border-border-strong has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-focus-ring",
      )}
    >
      <div className={cn(PICTURE, "border-b border-border bg-surface-subtle @2xl/grid:overflow-hidden @2xl/grid:border")}>
        <ProductImage src={product.image} alt="" sizes={PICTURE_SIZES} />
      </div>

      <div className={BODY}>
        {/* On its side, the card has its menu at the end of this row: the status leaves it the room. */}
        <div className="flex min-h-6 items-center @2xl/grid:min-h-control @2xl/grid:pr-10 touch:@2xl/grid:min-h-touch touch:@2xl/grid:pr-12">
          <StatusBadge domain="product" code={product.status} />
        </div>

        <Link
          href={`/vendor/products/${product.id}`}
          data-card-link=""
          className="mt-1.5 line-clamp-2 font-semibold break-words text-foreground outline-none after:absolute after:inset-0"
        >
          {product.name}
        </Link>
        <p className="mt-0.5 truncate text-label font-normal text-foreground-muted">{reference || "Sans référence"}</p>

        {/* At the foot of the card: prices and stocks line up along a row of cards. */}
        <div className="mt-auto flex flex-col items-start gap-1 pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Money francs={product.priceFrancs} className="text-section-title text-foreground" />
            {product.hasVariants && (
              <span className="text-meta text-foreground-muted">
                {product.variantCount > 1 ? `${product.variantCount} variantes` : "Avec variantes"}
              </span>
            )}
          </p>
          {/* The height of a badge, whatever the line holds: prices stay level along the row. */}
          <span className="flex min-h-6 max-w-full items-center">
            <StockLine stock={product.stock} level={product.stockLevel} />
          </span>
        </div>
      </div>

      {/* Above the stretched link, so the menu stays reachable: on the picture of an upright card, in the corner of one on its side. */}
      <div className="absolute top-1.5 right-1.5 z-[1] @2xl/grid:top-2 @2xl/grid:right-2">{actions}</div>
    </li>
  );
}
