import { Metadata } from "next";
import { CreateProductForm } from "./create-product-form";

export const metadata: Metadata = {
  title: "Ajouter un produit | SUGUPro Vendeur",
  description:
    "Créez un nouveau produit : informations, photos, prix, variantes et tarifs de gros.",
};

export default function CreateProductPage() {
  return <CreateProductForm />;
}
