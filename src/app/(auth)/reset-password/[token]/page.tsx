import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-frame";
import { SetPasswordForm } from "@/features/auth/set-password-form";

export const metadata: Metadata = {
  title: "Définir votre mot de passe — SUGU Pro",
  description: "Définissez votre mot de passe pour accéder à votre espace SUGU Pro.",
};

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function SetPasswordPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { email } = await searchParams;

  return (
    <AuthCard
      title="Définir votre mot de passe"
      description="Choisissez le mot de passe qui protégera votre espace professionnel."
    >
      <SetPasswordForm token={token} email={typeof email === "string" ? email : ""} />
    </AuthCard>
  );
}
