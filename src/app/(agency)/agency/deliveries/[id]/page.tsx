import type { Metadata } from "next";
import { DeliveryDetailContent } from "./delivery-detail-content";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "Détail livraison | SUGUPro Agence",
  description:
    "Détails complets d'une livraison — suivi, itinéraire, livreur, client et actions.",
};

// ============================================================
// Page — Server Component
// ============================================================

/**
 * Agency delivery detail page.
 *
 * Thin server component wrapper — passes the [id] param
 * to the client component which handles all data fetching
 * via React Query hooks.
 */
export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full flex-col">
      <DeliveryDetailContent shipmentId={id} />
    </div>
  );
}
