import type { Metadata } from "next";
import { LanabagaSignup } from "./lanabaga-signup";

export const metadata: Metadata = {
  title: "Devenir Lanabaga | SUGU",
  description: "Créez votre compte SUGU et candidatez au programme Lanaya : SUGU examine chaque candidature avant de l'admettre.",
};

export default function LanabagaSignupPage() {
  return <LanabagaSignup />;
}
