import type { Metadata } from "next";
import { DashboardContent } from "./dashboard-content";

export const metadata: Metadata = {
  title: "Tableau de bord | SUGUPro Agence",
  description: "La journée de votre agence : courses à assigner, en cours, livrées, en retard, et vos livreurs en activité.",
};

export default function AgencyDashboardPage() {
  return <DashboardContent />;
}
