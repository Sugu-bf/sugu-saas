"use client";

import type { Conversation } from "@/lib/messaging/types";
import { useSellerPresence, useRecommendedProducts, useSendSellerProductCard } from "../hooks";
import { avatarColor, initials } from "../../services/_shared";
import { cn } from "@/lib/utils";
import { ProductListItem } from "./ProductListItem";
import { ExternalLink, ShoppingBag, User } from "lucide-react";
import { toast } from "sonner";

interface CustomerPanelProps {
  conversation: Conversation;
}

export function CustomerPanel({ conversation }: CustomerPanelProps) {
  const customerName = conversation.customer?.name ?? "Client";
  const avatarCls = avatarColor(customerName);
  const ini = initials(customerName);

  const { data: presenceData } = useSellerPresence(conversation.id);
  const { data: productsData } = useRecommendedProducts(conversation.id);
  const sendProductCard = useSendSellerProductCard();

  const customerPresence = presenceData?.data?.find(
    (p) => p.participant_type === "customer",
  );
  const isOnline = customerPresence?.is_online ?? false;
  const lastActive = customerPresence?.last_active;

  const products = productsData?.data ?? [];

  const handleShareProduct = (productId: string) => {
    sendProductCard.mutate(
      { convId: conversation.id, productId },
      {
        onSuccess: () => toast.success("Produit partagé dans le chat !"),
        onError: () => toast.error("Erreur lors du partage"),
      },
    );
  };

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden rounded-2xl">
      {/* Customer Info Header */}
      <div className="border-b border-gray-200/60 p-6 text-center dark:border-gray-800/60">
        {/* Avatar */}
        <div className="mx-auto mb-3 relative inline-block">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold",
              avatarCls,
            )}
          >
            {ini}
          </div>
          {isOnline && (
            <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
          )}
        </div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
          <User className="h-3 w-3" />
          Client
        </span>

        {/* Name */}
        <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
          {customerName}
        </h3>

        {/* Presence */}
        <p
          className={cn(
            "mt-1 text-xs",
            isOnline ? "text-green-500" : "text-muted-foreground",
          )}
        >
          {isOnline ? (
            <>● En ligne</>
          ) : lastActive ? (
            <>Vu {_lastActiveLabel(lastActive)}</>
          ) : (
            <>Hors ligne</>
          )}
        </p>
      </div>

      {/* Linked Order */}
      {conversation.order_id && (
        <div className="border-b border-gray-200/60 p-4 dark:border-gray-800/60">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Commande liée
          </h4>
          <a
            href={`/vendor/orders/${conversation.order_id}`}
            className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ShoppingBag className="h-4 w-4 text-sugu-500" />
            <span>Voir la commande</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-gray-400" />
          </a>
        </div>
      )}

      {/* Recommended Products */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Produits recommandés
          </h4>
          <a
            href="/vendor/products"
            className="text-xs font-medium text-sugu-500 hover:underline"
          >
            Voir
          </a>
        </div>

        <div className="mt-3 space-y-1">
          {products.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Aucun produit recommandé
            </p>
          ) : (
            products.slice(0, 10).map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onShare={handleShareProduct}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const LAST_ACTIVE_LABELS: Record<string, string> = {
  now: "maintenant",
  recently: "récemment",
  today: "aujourd'hui",
  long_ago: "il y a longtemps",
  never: "",
};

function _lastActiveLabel(status: string): string {
  return LAST_ACTIVE_LABELS[status] ?? status;
}
