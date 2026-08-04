import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingPages } from "@/lib/marketing-pages";
import { createPublicMetadata } from "@/lib/seo";

const page = marketingPages.coursiers;
export const metadata = createPublicMetadata({ title: "Application de livraison pour coursiers", description: page.description, path: page.path });
export default function CouriersMarketingPage() { return <MarketingPageShell page={page} />; }
