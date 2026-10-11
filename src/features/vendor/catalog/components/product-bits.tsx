"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Package } from "lucide-react";
import { Badge, StatusBadge, cn, stockStatus } from "@/design-system";

/**
 * A product picture, in whatever box its parent gives it (`relative` and
 * sized). Two cases are told apart and neither shows a stand-in photo:
 * the product has no picture (neutral mark), or it has one that does not
 * load (broken mark, named for assistive technology). `caption` writes
 * which of the two under the mark, where the box is large enough to read.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  fit = "cover",
  caption = false,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  caption?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const MARK = "flex size-full flex-col items-center justify-center gap-1.5 text-foreground-subtle";

  if (!src) {
    return (
      <span className={cn(MARK, className)}>
        <Package className="size-[38%] max-h-8 max-w-8" strokeWidth={1.5} aria-hidden="true" />
        {caption && <span className="text-meta text-foreground-muted">Aucune photo</span>}
      </span>
    );
  }
  if (failed === src) {
    return (
      <span role="img" aria-label="Image indisponible" className={cn(MARK, className)}>
        <ImageOff className="size-[38%] max-h-8 max-w-8" strokeWidth={1.5} aria-hidden="true" />
        {caption && (
          <span aria-hidden="true" className="text-meta text-foreground-muted">
            Image indisponible
          </span>
        )}
      </span>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} onError={() => setFailed(src)} className={cn(fit === "cover" ? "object-cover" : "object-contain", className)} />;
}

const SIZE = { sm: "size-10", md: "size-12", lg: "size-20" } as const;

/** Small square picture of a product, for rows and summaries. */
export function ProductThumb({ src, size = "sm", className }: { src: string | null; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-control border border-border bg-surface-subtle", SIZE[size], className)}>
      <ProductImage src={src} alt="" sizes="80px" />
    </span>
  );
}

const UNITS = new Intl.NumberFormat("fr-FR");

export function formatUnits(value: number): string {
  return UNITS.format(value);
}

/**
 * The stock of a product on a card, in one line: what is left while all is
 * well, an alert once it runs low or out. `StockCell` is its counterpart in
 * a table, where the number keeps a column of its own.
 */
export function StockLine({ stock, level, className }: { stock: number | null; level: string | null; className?: string }) {
  if (stock === null) return <span className={cn("text-label font-normal text-foreground-muted", className)}>Stock non renseigné</span>;

  const status = level ? stockStatus.resolve(level) : null;
  if (status?.code === "out_of_stock" || status?.code === "low_stock") {
    return (
      <Badge tone={status.tone} icon={status.icon} data-status={status.code} className={className}>
        {status.code === "out_of_stock" ? "Rupture de stock" : `${status.label} · ${UNITS.format(stock)}`}
      </Badge>
    );
  }
  return (
    <span
      data-status={status?.code}
      className={cn("text-label whitespace-nowrap tabular-nums", status?.code === "in_stock" ? "text-success-fg" : "text-foreground-muted", className)}
    >
      {UNITS.format(stock)} en stock
    </span>
  );
}

/** Units in stock with their level, on one line; a dash when the backend gave no stock. */
export function StockCell({ stock, level, className }: { stock: number | null; level: string | null; className?: string }) {
  if (stock === null) return <span className="text-foreground-muted">—</span>;
  return (
    <span className={cn("inline-flex items-center justify-end gap-2 whitespace-nowrap", className)}>
      <span className="font-medium tabular-nums">{UNITS.format(stock)}</span>
      {level && <StatusBadge domain="stock" code={level} />}
    </span>
  );
}
