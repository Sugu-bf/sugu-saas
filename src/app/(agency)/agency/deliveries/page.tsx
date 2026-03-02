import type { Metadata } from "next";
import { DeliveriesContent } from "./deliveries-content";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "Livraisons | SUGUPro Agence",
  description:
    "Gérez et suivez toutes vos livraisons en temps réel — assignation, statuts, ETA et actions rapides.",
};

// ============================================================
// Page — Server Component
// ============================================================

/**
 * Agency deliveries page.
 *
 * The page is a thin server component wrapper.
 * All data fetching is done client-side via React Query hooks
 * in DeliveriesContent for real-time filter/pagination support.
 */
export default function AgencyDeliveriesPage() {
  return (
    <div className="flex h-full flex-col">
      <DeliveriesContent />
    </div>
  );
}
