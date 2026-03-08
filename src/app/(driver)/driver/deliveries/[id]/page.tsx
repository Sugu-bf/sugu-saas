import type { Metadata } from "next";
import { DriverDeliveryDetailContent } from "./delivery-detail-content";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "Détail livraison | SUGUPro Livreur",
  description:
    "Détails de votre course — itinéraire, collecte, code sécurité et suivi.",
};

// ============================================================
// Page — Server Component
// ============================================================

/**
 * Driver delivery detail page.
 *
 * Thin server component wrapper — passes the [id] param
 * to the client component which handles all data fetching
 * via React Query hooks.
 */
export default async function DriverDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full flex-col">
      <DriverDeliveryDetailContent deliveryId={id} />
    </div>
  );
}
