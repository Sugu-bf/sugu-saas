import type { VendorMarketing } from "../schema";

// ============================================================
// Vendor Marketing — Mock Data (Design-only)
// ============================================================

export const mockVendorMarketing: VendorMarketing = {
  kpis: {
    activePromotions: 3,
    totalPromotions: 5,
    clientSavings: 124500,
    codesUsed: 47,
    codesTotal: 100,
  },
  promoCodes: [
    {
      id: "pc-1",
      code: "SUG10",
      discount: "-10%",
      conditions: "Min. 5 000 FCFA",
      usages: 18,
      usagesMax: 50,
      expiresAt: "2026-02-28",
      expiresLabel: "28 Fév 2026",
      status: "active",
      statusLabel: "Actif",
    },
    {
      id: "pc-2",
      code: "BIENVENUE",
      discount: "-15%",
      conditions: "1ère commande",
      usages: 29,
      usagesMax: 29,
      expiresAt: "2026-03-31",
      expiresLabel: "31 Mars 2026",
      status: "active",
      statusLabel: "Actif",
    },
    {
      id: "pc-3",
      code: "NOEL2025",
      discount: "-20%",
      conditions: "Min. 10 000 FCFA",
      usages: 45,
      usagesMax: 50,
      expiresAt: "2025-12-31",
      expiresLabel: "31 Déc 2025",
      status: "expired",
      statusLabel: "Expiré",
    },
  ],
  promotedProducts: [
    {
      id: "pp-1",
      name: "Huile de Palme Bio 1L",
      image: "",
      originalPrice: 6000,
      promoPrice: 4500,
      discountPercent: 25,
      expiresLabel: "28 Fév",
      active: true,
    },
    {
      id: "pp-2",
      name: "Miel du Sahel 500ml",
      image: "",
      originalPrice: 15000,
      promoPrice: 12000,
      discountPercent: 20,
      expiresLabel: "28 Fév",
      active: true,
    },
    {
      id: "pp-3",
      name: "Beurre de Karité 250g",
      image: "",
      originalPrice: 4000,
      promoPrice: 3200,
      discountPercent: 20,
      expiresLabel: "28 Fév",
      active: true,
    },
  ],
};
