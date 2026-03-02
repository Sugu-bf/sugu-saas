import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commandes | SUGUPro Vendeur",
  description:
    "Gérez vos commandes clients : suivi, filtrage par statut, détails et export.",
};

export default function VendorOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
