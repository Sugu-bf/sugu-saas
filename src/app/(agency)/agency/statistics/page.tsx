import type { Metadata } from "next";
import { getAgencyStats } from "@/features/agency/service";
import { StatisticsContent } from "./statistics-content";

export const metadata: Metadata = {
  title: "Statistiques | SUGUPro Agence",
  description:
    "Tableau de bord analytique — livraisons, taux de réussite, revenus, top livreurs et raisons d'échec.",
};

/**
 * Agency statistics page — Server Component.
 *
 * READY FOR API: Replace only getAgencyStats() body in service.ts.
 */
export default async function AgencyStatisticsPage() {
  const data = await getAgencyStats();
  return <StatisticsContent data={data} />;
}
