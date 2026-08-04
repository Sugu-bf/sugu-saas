import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingPages } from "@/lib/marketing-pages";
import { createPublicMetadata } from "@/lib/seo";

const page = marketingPages.faq;
export const metadata = createPublicMetadata({ title: "Questions fréquentes", description: page.description, path: page.path });
export default function FaqMarketingPage() { return <MarketingPageShell page={page} />; }
