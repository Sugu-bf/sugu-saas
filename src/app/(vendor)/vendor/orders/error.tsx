"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Erreur de chargement",
  description: "Impossible de charger les commandes. Veuillez réessayer.",
  logPrefix: "[Vendor Commandes]",
});
