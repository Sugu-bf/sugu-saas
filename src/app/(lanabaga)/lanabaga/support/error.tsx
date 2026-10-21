"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Erreur de chargement",
  description: "Impossible de charger vos demandes.",
  logPrefix: "[Lanabaga Support]",
});
