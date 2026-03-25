import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié — SUGU Pro",
  description: "Réinitialisez votre mot de passe SUGU Pro.",
};

export default function ForgotPasswordPage() {
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mot de passe oublié ?
            </h1>
            <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              Entrez votre email pour recevoir un code de réinitialisation
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
