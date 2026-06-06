import type { Metadata } from "next";
import { LandingPageV3 } from "@/components/landing-page-v3";

// ============================================================
// SEO Metadata
// ============================================================
export const metadata: Metadata = {
  title: "SUGUPro - Le système derrière chaque commande",
  description:
    "SUGUPro relie boutique, commandes, livraison, paiement et revenus dans un seul système pour les vendeurs africains.",
  openGraph: {
    title: "SUGUPro - Le système derrière chaque commande",
    description:
      "SUGUPro relie boutique, commandes, livraison, paiement et revenus dans un seul système pour les vendeurs africains.",
    type: "website",
  },
};

// ============================================================
// Landing Page — Entrypoint
// ============================================================
export default function LandingPage() {
  return <LandingPageV3 />;
}
