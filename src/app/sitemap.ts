import type { MetadataRoute } from "next";
import { marketingPages } from "@/lib/marketing-pages";
import { SUGU_PRO_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${SUGU_PRO_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    ...Object.values(marketingPages).map((page) => ({
      url: `${SUGU_PRO_URL}${page.path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: page.path === "/fonctionnalites" ? 0.9 : 0.8,
    })),
  ];
}
