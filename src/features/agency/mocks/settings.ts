import type { AgencySettingsResponse } from "../schema";

export const mockAgencySettings: AgencySettingsResponse = {
  agencyName: "Express Bamako Livraison",
  shortName: "EBL",
  email: "contact@expressbamako.ml",
  emailVerified: true,
  phonePrimary: "+223 76 45 23 18",
  phoneSecondary: "+223 65 00 11 22",
  rccm: "ML-BKO-2024-B-4521",
  createdAt: "15 Mars 2024",
  logoUrl: null,

  address: "Rue 305, Porte 12",
  city: "Bamako",
  quartier: "ACI 2000",
  country: "Mali",
  countryFlag: "🇲🇱",
  locationDescription: "",

  agencyType: "Livraison express",
  dailyCapacity: "200 livraisons/jour",
  vehicles: [
    { type: "Moto", icon: "🛵", selected: true },
    { type: "Voiture", icon: "🚗", selected: true },
    { type: "Vélo", icon: "🚲", selected: false },
    { type: "Camionnette", icon: "🚐", selected: false },
  ],
  description:
    "Express Bamako Livraison la SUGU Delivery Agency Portal l'er descriptiorrrnnagence dans se apore:presenit ou ces recheewment envers une tonnement d'unnandono..",

  schedule: [
    { day: "Lundi", enabled: true, openTime: "07:00", closeTime: "21:00" },
    { day: "Mardi", enabled: true, openTime: "07:00", closeTime: "21:00" },
    { day: "Mercredi", enabled: true, openTime: "07:00", closeTime: "21:00" },
    { day: "Jeudi", enabled: true, openTime: "07:00", closeTime: "21:00" },
    { day: "Vendredi", enabled: true, openTime: "07:00", closeTime: "19:00" },
    { day: "Samedi", enabled: true, openTime: "08:00", closeTime: "18:00" },
    { day: "Dimanche", enabled: false, openTime: "", closeTime: "" },
  ],
  sameHoursWeekdays: false,
  acceptAfterHours: false,
  afterHoursSurcharge: "50%",

  socialLinks: [
    { id: "sl-1", platform: "WhatsApp Business", value: "+223 76 45 23 18", icon: "whatsapp", enabled: true, visibleOnSugu: true },
    { id: "sl-2", platform: "Facebook", value: "facebook.com/expressbamako", icon: "facebook", enabled: true, visibleOnSugu: true },
    { id: "sl-3", platform: "Site web", value: "", icon: "globe", enabled: false, visibleOnSugu: false },
  ],

  lastSaved: "il y a 2 min",
};
