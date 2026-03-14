"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Impossible de charger l'historique",
  description: "Une erreur est survenue lors du chargement de votre historique.",
  logPrefix: "[Driver Historique]",
});
