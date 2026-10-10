import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-frame";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace SUGU.",
};

export default function LoginPage() {
  return (
    <AuthCard title="Connexion" description="Accédez à votre espace vendeur, agence ou coursier.">
      <LoginForm />
    </AuthCard>
  );
}
