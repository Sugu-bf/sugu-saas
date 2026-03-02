import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace SUGU.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-400 to-sugu-600 shadow-lg shadow-sugu-500/25">
            <span className="text-2xl font-black text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connexion à <span className="text-sugu-500">SUGU</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Accédez à votre espace vendeur ou agence
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl shadow-gray-900/5 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-black/20">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
