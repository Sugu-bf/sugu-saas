import type { Metadata } from "next";
import { LandingPageV3 } from "@/components/landing-page-v3";
import { JsonLd } from "@/components/seo/json-ld";
import {
  createPublicMetadata,
  suguOrganizationJsonLd,
  suguProServiceJsonLd,
  suguProWebSiteJsonLd,
} from "@/lib/seo";

// ============================================================
// SEO Metadata
// ============================================================
const description = "Sugu Pro relie boutique, commandes, livraison, paiement et revenus dans un seul système pour les vendeurs et équipes de livraison.";

export const metadata: Metadata = createPublicMetadata({
  title: "Le système derrière chaque commande",
  description,
  path: "/",
});

// ============================================================
// Landing Page — Entrypoint
// ============================================================
export default function LandingPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            suguOrganizationJsonLd(),
            suguProWebSiteJsonLd(),
            suguProServiceJsonLd(),
          ],
        }}
      />
      <LandingPageV3 />
    </>
  );
}
