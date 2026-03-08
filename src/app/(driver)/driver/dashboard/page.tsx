import { Metadata } from "next";
import DriverDashboardClient from "./DriverDashboardClient";

// --- SEO ---
export const metadata: Metadata = {
  title: "Dashboard | SUGUPro Livreur",
  description:
    "Tableau de bord livreur : livraisons en cours, gains, performance.",
};

// ════════════════════════════════════════════════════════════
// Server Component wrapper — delegates to Client component
// that uses the useDriverDashboard() hook for mock data.
// ════════════════════════════════════════════════════════════

export default function DriverDashboardPage() {
  return <DriverDashboardClient />;
}
