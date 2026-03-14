"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Impossible de charger le coursier",
  description: "Une erreur est survenue lors du chargement du profil du coursier.",
  logPrefix: "[Agency Coursier Détail]",
});
