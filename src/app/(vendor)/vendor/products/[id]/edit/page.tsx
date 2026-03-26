import { Metadata } from "next";
import { EditProductForm } from "./edit-product-form";

export const metadata: Metadata = {
  title: "Modifier le produit | SUGUPro Vendeur",
  description:
    "Modifiez les informations, photos, prix et stock de votre produit.",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProductForm id={id} />;
}
