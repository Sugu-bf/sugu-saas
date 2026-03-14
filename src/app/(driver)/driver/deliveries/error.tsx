"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Impossible de charger les livraisons",
  description: "Une erreur est survenue lors du chargement de vos livraisons.",
  logPrefix: "[Driver Livraisons]",
});
