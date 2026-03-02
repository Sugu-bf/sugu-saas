import type { Metadata } from "next";
import MarketingPage from "./marketing-page";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "Marketing | SUGUPro Vendeur",
  description:
    "Gérez vos promotions, codes promo et produits mis en avant pour booster vos ventes sur SUGUPro.",
};

// ============================================================
// Page — Server Component (renders the client wrapper)
// ============================================================

export default function VendorMarketingPage() {
  return <MarketingPage />;
}
