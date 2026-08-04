import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingPages } from "@/lib/marketing-pages";
import { createPublicMetadata } from "@/lib/seo";

const page = marketingPages.tarifs;
export const metadata = createPublicMetadata({ title: "Tarifs et conditions Sugu Pro", description: page.description, path: page.path });
export default function PricingMarketingPage() { return <MarketingPageShell page={page} />; }
