import type { Metadata } from "next";
import { ProductForm } from "@/features/vendor/catalog/form/product-form";

export const metadata: Metadata = {
  title: "Nouveau produit | SUGUPro Vendeur",
  description: "Ajoutez un produit à votre catalogue : informations, photos, prix, stock et variantes.",
};

export default function CreateProductPage() {
  return <ProductForm />;
}
