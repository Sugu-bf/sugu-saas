import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord | SUGUPro Vendeur",
  description: "Ce qui se passe dans votre boutique, ce qui attend votre action et où agir : commandes, stock, messages, ventes de la période.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
