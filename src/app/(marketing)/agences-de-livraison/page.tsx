import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingPages } from "@/lib/marketing-pages";
import { createPublicMetadata } from "@/lib/seo";

const page = marketingPages["agences-de-livraison"];
export const metadata = createPublicMetadata({ title: "Gestion pour agences de livraison", description: page.description, path: page.path });
export default function AgenciesMarketingPage() { return <MarketingPageShell page={page} />; }
