import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingPages } from "@/lib/marketing-pages";
import { createPublicMetadata } from "@/lib/seo";

const page = marketingPages.vendeurs;
export const metadata = createPublicMetadata({ title: "Gestion de boutique pour vendeurs", description: page.description, path: page.path });
export default function VendorsMarketingPage() { return <MarketingPageShell page={page} />; }
