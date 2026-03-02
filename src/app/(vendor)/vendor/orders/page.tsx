"use client";

import { useVendorOrders } from "@/features/vendor/hooks";
import { OrdersContent } from "./orders-content";
import VendorOrdersLoading from "./loading";
import { ErrorState } from "@/components/feedback";

export default function VendorOrdersPage() {
  const { data, isLoading, isError, error, refetch } = useVendorOrders();

  if (isLoading) return <VendorOrdersLoading />;

  if (isError) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
        <ErrorState
          title="Erreur de chargement"
          description={
            error?.message ??
            "Impossible de charger les commandes. Veuillez réessayer."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return <OrdersContent data={data} />;
}
