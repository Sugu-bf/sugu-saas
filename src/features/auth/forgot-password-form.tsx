"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail, ArrowLeft, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setEmailError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();

    if (!email) {
      setEmailError("L'adresse email est requise.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("L'adresse email n'est pas valide.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.message ?? "Erreur lors de l'envoi du code.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-7 w-7 text-green-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Email envoyé ! 📩
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Si un compte existe avec cet email, vous recevrez un code de vérification.
            Consultez votre boîte de réception.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-2 flex items-center gap-2 rounded-full bg-gray-100 px-6 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Server error */}
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {serverError}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
          Adresse email
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sugu-500">
            <Mail className="h-5 w-5" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="hello@votreentreprise.com"
            className="w-full rounded-full border border-sugu-200 bg-white/50 py-3.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
            aria-invalid={!!emailError}
          />
        </div>
        {emailError && (
          <p className="mt-1.5 text-sm text-red-500">{emailError}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex w-full items-center justify-center rounded-full bg-[#ea580c] px-6 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#dea83f] hover:shadow-orange-500/40 disabled:opacity-70 dark:bg-[#ea580c] dark:shadow-orange-500/20"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Envoyer le code
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </button>

      {/* Back to login */}
      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>
      </div>
    </form>
  );
}
