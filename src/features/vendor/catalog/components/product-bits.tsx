"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Package } from "lucide-react";
import { StatusBadge, cn } from "@/design-system";

/**
 * A product picture, in whatever box its parent gives it (`relative` and
 * sized). Two cases are told apart and neither shows a stand-in photo:
 * the product has no picture (neutral mark), or it has one that does not
 * load (broken mark, named for assistive technology).
 */
export function ProductImage({ src, alt, sizes, fit = "cover", className }: { src: string | null; alt: string; sizes: string; fit?: "cover" | "contain"; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);

  if (!src) {
    return (
      <span className={cn("flex size-full items-center justify-center text-foreground-subtle", className)}>
        <Package className="size-[38%] max-h-8 max-w-8" strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  if (failed === src) {
    return (
      <span role="img" aria-label="Image indisponible" className={cn("flex size-full items-center justify-center text-foreground-subtle", className)}>
        <ImageOff className="size-[38%] max-h-8 max-w-8" strokeWidth={1.5} aria-hidden="true" />
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
