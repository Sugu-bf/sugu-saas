"use client";

import { use } from "react";
import { useVendorOrderDetail } from "@/features/vendor/hooks";
import { OrderDetailContent } from "./order-detail-content";
import OrderDetailLoading from "./loading";
import { ErrorState } from "@/components/feedback";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, isError, error, refetch } = useVendorOrderDetail(id);

  if (isLoading) return <OrderDetailLoading />;

  if (isError) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
        <ErrorState
          title="Erreur de chargement"
          description={
            error?.message ?? "Impossible de charger la commande."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return <OrderDetailContent data={data} />;
}
