import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistiques | SUGUPro Vendeur",
  description: "Analytics complètes : revenus, produits, conversion, ventes par ville et avis clients.",
};

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
