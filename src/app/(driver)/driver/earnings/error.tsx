"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Erreur des gains",
  description: "Une erreur est survenue lors du chargement de vos gains.",
  logPrefix: "[Driver Gains]",
});
