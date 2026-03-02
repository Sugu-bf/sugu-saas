import { Metadata } from "next";
import AgencyDashboardClient from "./AgencyDashboardClient";

// --- SEO ---
export const metadata: Metadata = {
  title: "Dashboard | SUGUPro Agence de Livraison",
  description:
    "Tableau de bord agence : livraisons en cours, taux de réussite, performance livreurs et réclamations.",
};

// ════════════════════════════════════════════════════════════
// Server Component wrapper — delegates to Client component
// that uses the useAgencyDashboard() hook for real API data.
// ════════════════════════════════════════════════════════════

export default function AgencyDashboardPage() {
  return <AgencyDashboardClient />;
}
