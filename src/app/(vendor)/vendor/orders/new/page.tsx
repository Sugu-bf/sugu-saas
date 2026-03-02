import { Metadata } from "next";
import { CreateOrderForm } from "./create-order-form";

export const metadata: Metadata = {
  title: "Nouvelle commande | SUGUPro Vendeur",
  description:
    "Créez une commande : sélection de produits, client, livraison, remise et paiement.",
};

export default function CreateOrderPage() {
  return <CreateOrderForm />;
}
