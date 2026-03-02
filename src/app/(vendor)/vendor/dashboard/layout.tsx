import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord | SUGUPro Vendeur",
  description:
    "Vue d'ensemble de votre activité commerciale : chiffre d'affaires, commandes, produits, évaluations et alertes stock.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
