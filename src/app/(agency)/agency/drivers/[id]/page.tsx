import type { Metadata } from "next";
import { DriverProfileContent } from "./driver-profile-content";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "Profil Livreur | SUGUPro Agence",
  description:
    "Consultez le profil complet du livreur — statistiques, revenus, documents, historique et incidents.",
};

// ============================================================
// Page — Server Component
// ============================================================

/**
 * Driver profile detail page.
 *
 * Data is fetched client-side via useDriverProfileData() hook
 * which injects agencyId from session automatically.
 */
export default async function DriverProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DriverProfileContent courierId={id} />;
}
