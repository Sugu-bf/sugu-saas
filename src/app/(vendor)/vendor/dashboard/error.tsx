"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Erreur du tableau de bord",
  description: "Impossible de charger le tableau de bord. Veuillez réessayer.",
  logPrefix: "[Vendor Dashboard]",
});
