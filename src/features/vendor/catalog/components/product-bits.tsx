import Image from "next/image";
import { Package } from "lucide-react";
import { StatusBadge, cn } from "@/design-system";

const SIZE = { sm: "size-10", md: "size-12", lg: "size-16" } as const;

/** Picture of a product, or a neutral mark when it has none. Never a stand-in photo. */
export function ProductThumb({ src, size = "sm", className }: { src: string | null; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-subtle",
        SIZE[size],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <Package className="size-5 text-foreground-subtle" aria-hidden="true" />
      )}
    </span>
  );
}

const UNITS = new Intl.NumberFormat("fr-FR");

/** "12 en stock" with its level badge; a dash when the backend gave no stock. */
export function StockCell({ stock, level }: { stock: number | null; level: string | null }) {
  if (stock === null) return <span className="text-foreground-muted">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <span className="tabular-nums">{UNITS.format(stock)}</span>
      {level && <StatusBadge domain="stock" code={level} />}
    </span>
  );
}

export function formatUnits(value: number): string {
  return UNITS.format(value);
}
