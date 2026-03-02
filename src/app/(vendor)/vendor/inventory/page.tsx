import { Metadata } from "next";
import { InventoryPageClient } from "./inventory-page-client";

export const metadata: Metadata = {
  title: "Inventaire | SUGUPro Vendeur",
  description:
    "Gérez votre stock produit : niveaux, alertes, mouvements d'entrées/sorties, et tendances de stock en temps réel.",
};

export default function VendorInventoryPage() {
  return <InventoryPageClient />;
}
