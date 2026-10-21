import type { Metadata } from "next";
import { ApplicationContent } from "./application-content";

export const metadata: Metadata = {
  title: "Candidature | SUGUPro Lanabaga",
  description: "Votre candidature au programme Lanaya : profil, pièces, références et engagements.",
};

export default function LanabagaApplicationPage() {
  return <ApplicationContent />;
}
