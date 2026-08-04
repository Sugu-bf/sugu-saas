import type { MetadataRoute } from "next";
import { SUGU_PRO_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    host: SUGU_PRO_URL,
    sitemap: `${SUGU_PRO_URL}/sitemap.xml`,
  };
}
