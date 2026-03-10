import type { VendorSettings } from "../schema";

// ============================================================
// Vendor Settings — Mock Data (Design-Only)
// ============================================================

export const mockVendorSettings: VendorSettings = {
  profile: {
    firstName: "Mamadou",
    lastName: "Diallo",
    email: "mamadou.diallo@email.com",
    emailVerified: true,
    phone: "+223 76 12 34 56",
    phoneSecondary: "",
    language: "Français",
    timezone: "Africa/Bamako (GMT+0)",
    avatarUrl: undefined,
  },
  shop: {
    name: "Boutique Mamadou",
    slug: "boutique-mamadou",
    baseUrl: "sugu.com/shop/",
    shortDescription:
      "Produits naturels et bio du Mali. Huiles, beurres, miels et épices, épices artisanaux.",
    city: "Bamako",
    quarter: "ACI 2000",
    fullAddress: "Rue 305, Porte 12",
    logoUrl: undefined,
    bannerUrl: undefined,
    mainCategory: "Alimentaire & Bio",
    subCategory: "Épices & Condiments",
  },
  socialLinks: [
    {
      id: "social-1",
      platform: "whatsapp",
      label: "WhatsApp Business",
      value: "+223 76 12 34 56",
      enabled: true,
    },
    {
      id: "social-2",
      platform: "facebook",
      label: "Facebook",
      value: "facebook.com/boutique.mamadou",
      enabled: true,
    },
    {
      id: "social-3",
      platform: "instagram",
      label: "Instagram",
      value: "@boutique_mamadou",
      enabled: true,
    },
    {
      id: "social-4",
      platform: "website",
      label: "Site web",
      value: "",
      enabled: false,
    },
  ],
  showSocialOnShop: false,
  businessHours: [
    { day: "Lundi", shortDay: "Lun", enabled: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Mardi", shortDay: "Mar", enabled: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Mercredi", shortDay: "Mer", enabled: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Jeudi", shortDay: "Jeu", enabled: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Vendredi", shortDay: "Ven", enabled: true, openTime: "08:00", closeTime: "13:00" },
    { day: "Samedi", shortDay: "Sam", enabled: true, openTime: "09:00", closeTime: "14:00" },
    { day: "Dimanche", shortDay: "Dim", enabled: false, openTime: "08:00", closeTime: "18:00" },
  ],
  showHoursOnShop: true,
  sameHoursEveryday: false,
  lastSavedAt: "2026-02-24T08:25:00Z",
  security: {
    isTwoFactorEnabled: false,
    lastPasswordChange: "2026-01-15T10:00:00Z",
    activeSessions: [],
    suspiciousLoginAlert: true,
    loginHistory: [],
  },
  notifications: {
    emailAlerts: {
      newOrder: true,
      lowStock: true,
      marketing: false,
    },
    pushNotifications: false,
  },
  legal: {
    businessName: null,
    legalStatus: "Individual",
    taxId: null,
    rccm: null,
    ninea: null,
    termsAccepted: true,
  },
  operations: {
    delivery: {
      pickup: false,
      localDelivery: false,
      shipping: false,
      international: false,
    },
    payment: {
      cash: true,
      orangeMoney: false,
      wave: false,
      card: false,
    },
    preferences: {
      currency: "XOF",
      language: "fr",
      timezone: "Africa/Dakar",
    },
    orderPrefix: "CMD-",
  },
};
