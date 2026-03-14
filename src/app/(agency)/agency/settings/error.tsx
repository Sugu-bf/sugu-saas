"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Impossible de charger les paramètres",
  description: "Une erreur est survenue lors du chargement des paramètres.",
  logPrefix: "[Agency Paramètres]",
});
