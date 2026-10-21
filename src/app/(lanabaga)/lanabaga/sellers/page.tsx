import type { Metadata } from "next";
import { SellersContent } from "./sellers-content";

export const metadata: Metadata = {
  title: "Mes vendeurs | SUGUPro Lanabaga",
  description: "Les boutiques que vous avez présentées à SUGU.",
};

export default function LanabagaSellersPage() {
  return <SellersContent />;
}
