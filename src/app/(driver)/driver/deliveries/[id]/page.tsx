import type { Metadata } from "next";
import { MissionDetailContent } from "./mission-detail-content";

export const metadata: Metadata = {
  title: "Mission | SUGUPro Coursier",
  description: "Avancement, collecte, livraison et paiement d'une mission.",
};

export default async function DriverMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MissionDetailContent id={id} />;
}
