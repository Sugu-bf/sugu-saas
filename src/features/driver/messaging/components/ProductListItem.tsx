"use client";

import type { RecommendedProduct } from "../../services/messaging.service";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Share2 } from "lucide-react";

interface ProductListItemProps {
  product: RecommendedProduct;
  onShare: (productId: string) => void;
}

export function ProductListItem({ product, onShare }: ProductListItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {/* Thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg">
            📦
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {product.name}
        </p>
        <p className="text-xs font-semibold text-sugu-500">
          {formatCurrency(product.price)} FCFA
        </p>
      </div>

      {/* Share */}
      <button
        onClick={() => onShare(product.id)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-sugu-500 transition-colors hover:bg-sugu-50 dark:hover:bg-sugu-950/30"
        title="Partager dans le chat"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}
