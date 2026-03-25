import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth/set-password-form";

export const metadata: Metadata = {
  title: "Définir votre mot de passe — SUGU Pro",
  description: "Définissez votre mot de passe pour accéder à votre espace vendeur SUGU.",
};

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function SetPasswordPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-4xl font-black tracking-tight text-sugu-500">
              SUGU
            </span>
          </div>
          <p className="text-base font-medium text-gray-800 dark:text-gray-200">
            Espace vendeur professionnel
          </p>
        </div>

        {/* Form Card */}
        <div className="relative rounded-[2rem] border border-white/40 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/70 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sugu-50 dark:bg-sugu-900/30">
              <svg className="h-7 w-7 text-sugu-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Définir votre mot de passe
            </h1>
            <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              Choisissez un mot de passe sécurisé pour accéder à votre boutique
            </p>
          </div>

          <SetPasswordForm token={token} email={email ?? ""} />
        </div>
      </div>
    </div>
  );
}
