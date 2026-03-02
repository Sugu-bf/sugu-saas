import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Détail commande | SUGUPro Vendeur",
  description:
    "Détails de la commande : articles, client, livraison, paiement et timeline.",
};

export default function OrderDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
