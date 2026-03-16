"use client";

import type { Message, ProductCardMetadata } from "@/lib/messaging/types";
import { formatCurrency } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface ProductCardBubbleProps {
  message: Message;
}

export function ProductCardBubble({ message }: ProductCardBubbleProps) {
  const meta = message.metadata as ProductCardMetadata | null;
  if (!meta) return null;

  return (
    <div className="max-w-[280px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:bg-gray-800/80">
      {meta.thumbnail && (
        <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-700">
          <img
            src={meta.thumbnail}
            alt={meta.product_name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {meta.product_name}
          </p>
          <p className="text-sm font-bold text-sugu-500">
            {formatCurrency(meta.price)} {meta.currency}
          </p>
          {meta.compare_price && meta.compare_price > meta.price && (
            <p className="text-xs text-gray-400 line-through">
              {formatCurrency(meta.compare_price)} {meta.currency}
            </p>
          )}
        </div>
        <a
          href={`/vendor/products/${meta.product_id}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-sugu-50 text-sugu-500 transition-colors hover:bg-sugu-100 dark:bg-sugu-950/30 dark:hover:bg-sugu-950/50"
          title="Voir le produit"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
