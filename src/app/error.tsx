"use client";

import { createPageError } from "@/components/feedback/create-page-error";

export default createPageError({
  title: "Erreur inattendue",
  description: "Quelque chose s'est mal passé. Veuillez réessayer.",
  logPrefix: "[Global]",
  wrapperClassName: "flex min-h-screen items-center justify-center p-6",
});
