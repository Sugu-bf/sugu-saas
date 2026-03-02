"use client";

import { useState } from "react";
import { useVendorMarketing, useToggleCoupon, useCreateCoupon, useCreatePromotion, useDeletePromotion, useUpdatePromotion } from "@/features/vendor/hooks";
import { MarketingContent } from "./marketing-content";
import { CreateCouponModal } from "./create-coupon-modal";
import { CreatePromotionModal } from "./create-promotion-modal";
import { EditPromotionModal } from "./edit-promotion-modal";
import MarketingLoading from "./loading";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { CreateCouponRequest, CreatePromotionRequest, UpdatePromotionRequest } from "@/features/vendor/service";
import type { PromotedProduct } from "@/features/vendor/schema";
import { toast } from "sonner";

// ============================================================
// Marketing Page — Client Wrapper (React Query)
// ============================================================

export default function MarketingPage() {
  const { data, isLoading, isError, error, refetch } = useVendorMarketing();
  const toggleCoupon = useToggleCoupon();
  const createCoupon = useCreateCoupon();
  const createPromotion = useCreatePromotion();
  const deletePromotion = useDeletePromotion();
  const updatePromotion = useUpdatePromotion();

  // Modal states
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotedProduct | null>(null);

  const handleCreateCoupon = (couponData: CreateCouponRequest) => {
    createCoupon.mutate(couponData, {
      onSuccess: () => {
        setShowCouponModal(false);
        toast.success("Coupon créé avec succès ✓");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la création du coupon"
        );
      },
    });
  };

  const handleCreatePromotion = (promoData: CreatePromotionRequest) => {
    createPromotion.mutate(promoData, {
      onSuccess: () => {
        setShowPromotionModal(false);
        toast.success("Promotion créée avec succès ✓");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la création de la promotion"
        );
      },
    });
  };

  const handleToggleCoupon = (couponId: string) => {
    toggleCoupon.mutate(couponId, {
      onSuccess: () => {
        toast.success("Statut du coupon mis à jour ✓");
      },
      onError: () => {
        toast.error("Erreur lors de la mise à jour du coupon");
      },
    });
  };

  const handleTogglePromotion = (promotionId: string, currentlyActive: boolean) => {
    updatePromotion.mutate(
      { promotionId, data: { is_active: !currentlyActive } },
      {
        onSuccess: () => {
          toast.success(currentlyActive ? "Promotion désactivée ✓" : "Promotion réactivée ✓");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Erreur lors de la mise à jour"
          );
        },
      },
    );
  };

  const handleEditPromotion = (promotionId: string, editData: UpdatePromotionRequest) => {
    updatePromotion.mutate(
      { promotionId, data: editData },
      {
        onSuccess: () => {
          setEditingPromotion(null);
          toast.success("Promotion modifiée avec succès ✓");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Erreur lors de la modification"
          );
        },
      },
    );
  };

  const handleDeletePromotion = (promotionId: string) => {
    deletePromotion.mutate(promotionId, {
      onSuccess: () => {
        toast.success("Promotion supprimée avec succès ✓");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la suppression de la promotion"
        );
      },
    });
  };

  if (isLoading) return <MarketingLoading />;

  if (isError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Impossible de charger Marketing
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error instanceof Error
              ? error.message
              : "Une erreur est survenue lors du chargement de vos données marketing."}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sugu-500/25 hover:bg-sugu-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <MarketingContent
        data={data}
        onToggleCoupon={handleToggleCoupon}
        onOpenCreateCoupon={() => setShowCouponModal(true)}
        onOpenCreatePromotion={() => setShowPromotionModal(true)}
        onDeletePromotion={handleDeletePromotion}
        onTogglePromotion={handleTogglePromotion}
        onEditPromotion={(product) => setEditingPromotion(product)}
        isTogglingPromotion={updatePromotion.isPending}
      />

      <CreateCouponModal
        open={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        onSubmit={handleCreateCoupon}
        isPending={createCoupon.isPending}
      />

      <CreatePromotionModal
        open={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        onSubmit={handleCreatePromotion}
        isPending={createPromotion.isPending}
      />

      <EditPromotionModal
        open={editingPromotion !== null}
        product={editingPromotion}
        onClose={() => setEditingPromotion(null)}
        onSubmit={(editData) => {
          if (editingPromotion?.promotionId) {
            handleEditPromotion(editingPromotion.promotionId, editData);
          }
        }}
        isPending={updatePromotion.isPending}
      />
    </>
  );
}
