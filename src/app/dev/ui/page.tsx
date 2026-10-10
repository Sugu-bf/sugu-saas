import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isUiGalleryEnabled } from "@/lib/env/ui-gallery";
import { Gallery } from "./gallery";

// Evaluated per request so the production gate reads the runtime environment.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export default function UiGalleryPage() {
  if (!isUiGalleryEnabled()) notFound();
  return <Gallery />;
}
