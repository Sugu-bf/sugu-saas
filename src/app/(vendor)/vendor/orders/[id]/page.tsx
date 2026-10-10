"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX, ShieldAlert } from "lucide-react";
import { Button, EmptyState, ErrorState } from "@/design-system";
import { describeFailure } from "@/features/vendor/orders/errors";
import { useOrder } from "@/features/vendor/orders/hooks";
import OrderDetailLoading from "./loading";
import { OrderDetailContent } from "./order-detail-content";

const backToList = (
  <Button asChild icon={ArrowLeft}>
    <Link href="/vendor/orders">Retour aux commandes</Link>
  </Button>
);

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = useOrder(id);

  if (order.data) return <OrderDetailContent order={order.data} />;
  if (!order.isError) return <OrderDetailLoading />;

  const failure = describeFailure(order.error);

  // An order of another seller answers 404 as well: nothing tells them apart.
  if (failure.kind === "not_found") {
    return (
      <div className="sugu-ui mx-auto w-full max-w-6xl rounded-panel border border-border bg-surface">
        <EmptyState
          icon={SearchX}
          title="Commande introuvable"
          description="Cette commande n'existe pas ou n'appartient pas à votre boutique."
          action={backToList}
        />
      </div>
    );
  }

  if (failure.kind === "forbidden") {
    return (
      <div className="sugu-ui mx-auto w-full max-w-6xl rounded-panel border border-border bg-surface">
        <EmptyState icon={ShieldAlert} title="Accès refusé" description={failure.message} action={backToList} />
      </div>
    );
  }

  return (
    <div className="sugu-ui mx-auto w-full max-w-6xl rounded-panel border border-border bg-surface">
      <ErrorState
        title="La commande n'a pas pu être chargée"
        description={failure.message}
        onRetry={() => order.refetch()}
        retrying={order.isFetching}
      />
    </div>
  );
}
