"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button, EmptyState, ErrorState } from "@/design-system";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { ProductForm } from "@/features/vendor/catalog/form/product-form";
import { useProduct } from "@/features/vendor/catalog/hooks";
import ProductFormLoading from "../../new/loading";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = useProduct(id);

  // Keyed by product: the form is built once from the stored product and is
  // not reset by a background refetch while the seller is typing.
  if (product.data) return <ProductForm key={product.data.id} product={product.data} />;
  if (!product.isError) return <ProductFormLoading />;

  const failure = describeFailure(product.error);

  // A product of another seller answers 404 as well: nothing tells them apart.
  if (failure.kind === "not_found") {
    return (
      <div className="sugu-ui mx-auto w-full max-w-6xl rounded-panel border border-border bg-surface">
        <EmptyState
          icon={SearchX}
          title="Produit introuvable"
          description="Ce produit n'existe pas ou n'appartient pas à votre boutique."
          action={
            <Button asChild icon={ArrowLeft}>
              <Link href="/vendor/products">Retour aux produits</Link>
            </Button>
          }
        />
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
