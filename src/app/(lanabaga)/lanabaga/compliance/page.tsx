import type { Metadata } from "next";
import { ComplianceContent } from "./compliance-content";

export const metadata: Metadata = {
  title: "Conformité | SUGUPro Lanabaga",
  description: "L'état de votre compte, de votre convention et de vos engagements.",
};

export default function LanabagaCompliancePage() {
  return <ComplianceContent />;
}
