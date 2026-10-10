import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-frame";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié — SUGU Pro",
  description: "Réinitialisez votre mot de passe SUGU Pro.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      description="Recevez un code par e-mail, puis choisissez un nouveau mot de passe."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
