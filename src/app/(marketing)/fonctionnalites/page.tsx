import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingPages } from "@/lib/marketing-pages";
import { createPublicMetadata } from "@/lib/seo";

const page = marketingPages.fonctionnalites;
export const metadata = createPublicMetadata({ title: "Fonctionnalités de gestion commerciale", description: page.description, path: page.path });
export default function FeaturesMarketingPage() { return <MarketingPageShell page={page} />; }
