"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X, Package } from "lucide-react";
import { useRecommendedProducts, useSendCourierProductCard } from "../hooks";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface ShareProductDialogProps {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareProductDialog({
  conversationId,
  open,
  onOpenChange,
}: ShareProductDialogProps) {
  const [search, setSearch] = useState("");
  const { data: productsData, isLoading } = useRecommendedProducts(
    open ? conversationId : null,
  );
  const sendProductCard = useSendCourierProductCard();

  const products = productsData ?? [];
  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  const handleShare = useCallback(
    (productId: string) => {
      sendProductCard.mutate(
        { convId: conversationId, productId },
        {
          onSuccess: () => {
            toast.success("Produit partagé !");
            onOpenChange(false);
            setSearch("");
          },
          onError: () => {
            toast.error("Erreur lors du partage");
          },
        },
      );
    },
    [conversationId, onOpenChange, sendProductCard],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-6 shadow-2xl animate-card-enter dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Package className="h-5 w-5 text-sugu-500" />
              Partager un produit
            </Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="form-input w-full pl-9 text-sm"
            />
          </div>

          {/* Product list */}
          <div className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse"
                  >
                    <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun produit trouvé
                </p>
              </div>
            ) : (
              filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleShare(product.id)}
                  disabled={sendProductCard.isPending}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800/50"
                >
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
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-xs font-semibold text-sugu-500">
                      {formatCurrency(product.price)} {product.currency}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
