import type { Metadata } from "next";
import { MissionStepsContent } from "./mission-steps-content";

export const metadata: Metadata = {
  title: "Mettre à jour la mission | SUGUPro Coursier",
  description: "Les étapes d'une mission : collecte, transit, arrivée, remise.",
};

export default async function DriverMissionStepsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MissionStepsContent id={id} />;
}
