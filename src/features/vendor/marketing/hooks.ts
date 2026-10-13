"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts } from "@/features/vendor/catalog/api";
import { createCoupon, createPromotion, deletePromotion, fetchMarketing, setPromotionActive, toggleCoupon, updatePromotion } from "./api";
import type { CouponDraft, PromotionDraft } from "./contract";

export const marketingKeys = {
  all: ["marketing"] as const,
  board: () => ["marketing", "board"] as const,
  products: (search: string) => ["marketing", "products", search] as const,
};

export const useMarketing = () => useQuery({ queryKey: marketingKeys.board(), queryFn: fetchMarketing, staleTime: 30_000 });

/** Products on sale, searched by the server over the whole catalog: only they can be promoted. */
export const usePromotableProducts = (search: string, enabled: boolean) =>
  useQuery({ queryKey: marketingKeys.products(search), queryFn: () => fetchProducts({ status: "active", search, sort: "name", direction: "asc", page: 1 }), enabled, staleTime: 60_000 });

export type MarketingCommand =
  | { type: "create-coupon"; draft: CouponDraft }
  | { type: "toggle-coupon"; id: string }
  | { type: "create-promotion"; draft: PromotionDraft }
  | { type: "update-promotion"; id: string; draft: PromotionDraft }
  | { type: "switch-promotion"; id: string; active: boolean }
  | { type: "delete-promotion"; id: string };

function run(command: MarketingCommand) {
  switch (command.type) {
    case "create-coupon":
      return createCoupon(command.draft);
    case "toggle-coupon":
      return toggleCoupon(command.id);
    case "create-promotion":
      return createPromotion(command.draft);
    case "update-promotion":
      return updatePromotion(command.id, command.draft);
    case "switch-promotion":
      return setPromotionActive(command.id, command.active);
    case "delete-promotion":
      return deletePromotion(command.id);
  }
}

/**
 * Every change of the board. Nothing is shown as done before the server
 * said so: the board is asked again once it answered, whatever it answered.
 */
export function useMarketingCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => queryClient.invalidateQueries({ queryKey: marketingKeys.board() }),
  });
}
