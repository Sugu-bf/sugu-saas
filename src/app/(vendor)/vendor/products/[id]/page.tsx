"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX, ShieldAlert } from "lucide-react";
import { Button, EmptyState, ErrorState } from "@/design-system";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { useProduct } from "@/features/vendor/catalog/hooks";
import ProductDetailLoading from "./loading";
import { ProductDetailContent } from "./product-detail-content";

const backToList = (
  <Button asChild icon={ArrowLeft}>
    <Link href="/vendor/products">Retour aux produits</Link>
  </Button>
);

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = useProduct(id);

  if (product.data) return <ProductDetailContent product={product.data} />;
  if (!product.isError) return <ProductDetailLoading />;

  const failure = describeFailure(product.error);

  // A product of another seller answers 404 as well: nothing tells them apart.
  if (failure.kind === "not_found") {
    return (
      <div className="sugu-ui mx-auto w-full max-w-6xl rounded-panel border border-border bg-surface">
        <EmptyState
          icon={SearchX}
          title="Produit introuvable"
          description="Ce produit n'existe pas ou n'appartient pas à votre boutique."
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
        title="Le produit n'a pas pu être chargé"
        description={failure.message}
        onRetry={() => product.refetch()}
        retrying={product.isFetching}
      />
    </div>
  );
}
