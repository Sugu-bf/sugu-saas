import type { Metadata } from "next";
import { AgencyStatisticsScreen } from "@/features/agency/statistics/screen";

export const metadata: Metadata = {
  title: "Statistiques | SUGUPro Agence",
  description: "L'activité de livraison de votre agence sur 7, 30 ou 90 jours.",
};

export default function Page() {
  return <AgencyStatisticsScreen />;
}
