import type { Metadata } from "next";
import { DeliveryDetailContent } from "./delivery-detail-content";

export const metadata: Metadata = {
  title: "Livraison | SUGUPro Agence",
  description: "Avancement, destinataire, livreur, paiement et notes d'une livraison.",
};

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeliveryDetailContent id={id} />;
}
