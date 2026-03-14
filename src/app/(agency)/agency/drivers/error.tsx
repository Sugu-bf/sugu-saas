"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Impossible de charger les coursiers",
  description: "Une erreur est survenue lors du chargement de la page coursiers.",
  logPrefix: "[Agency Coursiers]",
});
