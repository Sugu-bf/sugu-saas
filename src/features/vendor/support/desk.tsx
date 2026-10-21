"use client";

import { createContext, useContext, type ReactNode } from "react";
import { TICKET_CATEGORIES } from "./contract";

// ============================================================
// Support — which desk the screen talks to. The same screen serves
// the seller (tickets of their stores, answered by the SUGU team)
// and the Lanabaga (requests to the programme, answered by the
// Lanaya team, DEC-35). Laravel decides who reads what; the desk
// only says where to ask and how the form names things.
// ============================================================

export interface SupportKind {
  value: string;
  label: string;
}

export interface SupportDesk {
  id: "seller" | "lanabaga";
  /** API path of the tickets, read through the BFF. */
  apiBase: string;
  /** Page of the portal that shows them. */
  route: string;
  /** Who answers, as a sentence says it. */
  team: string;
  /** What the form asks for: a category, or the subject of a request to the programme. */
  kindLabel: string;
  kinds: readonly SupportKind[];
  /** A seller's ticket is tied to their store. */
  needsStore: boolean;
  empty: string;
  /** Said above the form of a new request, when there is something to say. */
  formNotice: string | null;
}

/** `LanayaTicketTopic::forSeller()`, in the same list as the categories (DEC-35). */
const SELLER_PROGRAMME_KINDS: SupportKind[] = [
  { value: "lanaya:my_lanabaga", label: "Programme Lanaya – mon Lanabaga" },
  { value: "lanaya:conduct", label: "Programme Lanaya – signaler un comportement" },
];

export const SELLER_DESK: SupportDesk = {
  id: "seller",
  apiBase: "sellers/support/tickets",
  route: "/vendor/tickets",
  team: "l'équipe SUGU",
  kindLabel: "Catégorie",
  kinds: [...TICKET_CATEGORIES, ...SELLER_PROGRAMME_KINDS],
  needsStore: true,
  empty: "Une question, un problème de paiement ou de livraison ? Écrivez à l'équipe SUGU.",
  formNotice: null,
};

/** `LanayaTicketTopic::forLanabaga()`. */
export const LANABAGA_TOPICS: SupportKind[] = [
  { value: "application", label: "Ma candidature" },
  { value: "documents", label: "Pièces et identité" },
  { value: "agreement", label: "Convention" },
  { value: "stores", label: "Boutiques confiées" },
  { value: "orders", label: "Commandes suivies" },
  { value: "account", label: "Compte et accès" },
  { value: "conduct", label: "Signaler un comportement" },
  { value: "other", label: "Autre question" },
];

export const LANABAGA_DESK: SupportDesk = {
  id: "lanabaga",
  apiBase: "lanaya/me/tickets",
  route: "/lanabaga/support",
  team: "l'équipe Lanaya",
  // « Sujet » is the title of the request: the list is its theme.
  kindLabel: "Thème",
  kinds: LANABAGA_TOPICS,
  needsStore: false,
  empty: "Une question sur votre candidature, vos pièces, votre convention ou une boutique confiée ? Écrivez à l'équipe Lanaya.",
  formNotice: "N'envoyez jamais votre pièce d'identité ici : déposez-la dans « Documents », où elle est protégée. Un signalement de comportement est lu en priorité.",
};

const DeskContext = createContext<SupportDesk>(SELLER_DESK);

export function SupportDeskProvider({ desk, children }: { desk: SupportDesk; children: ReactNode }) {
  return <DeskContext.Provider value={desk}>{children}</DeskContext.Provider>;
}

export const useSupportDesk = (): SupportDesk => useContext(DeskContext);

/** The fields Laravel reads for the kind chosen in the form. */
export function kindFields(desk: SupportDesk, value: string): Record<string, string> {
  if (desk.id === "lanabaga") return { topic: value };
  if (value.startsWith("lanaya:")) return { category: "lanaya", topic: value.slice("lanaya:".length) };
  return { category: value };
}
