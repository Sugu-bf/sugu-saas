import { Metadata } from "next";
import { CreateOrderForm } from "./create-order-form";

export const metadata: Metadata = {
  title: "Nouvelle vente | SUGUPro Vendeur",
  description: "Enregistrez une vente directe : articles, client, remise ou livraison.",
};

export default function CreateOrderPage() {
  return <CreateOrderForm />;
}
