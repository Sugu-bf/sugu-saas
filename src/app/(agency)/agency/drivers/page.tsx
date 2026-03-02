import type { Metadata } from "next";
import { DriversContent } from "./drivers-content";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "Livreurs | SUGUPro Agence",
  description:
    "Gérez votre flotte de livreurs — statuts en temps réel, performances, notes et assignations.",
};

// ============================================================
// Page — Server Component
// ============================================================

/**
 * Agency drivers page.
 *
 * Data is fetched client-side via useAgencyDrivers() hook
 * which injects agencyId from the session automatically.
 */
export default function AgencyDriversPage() {
  return (
    <div className="flex h-full flex-col">
      <DriversContent />
    </div>
  );
}
