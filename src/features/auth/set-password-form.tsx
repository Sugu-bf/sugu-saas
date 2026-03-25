"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";

interface Props {
  token: string;
  email: string;
}

type TokenStatus = "checking" | "valid" | "invalid";

export function SetPasswordForm({ token, email }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Verify token on mount
  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch("/api/auth/verify-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        });
        const json = await res.json();
        setTokenStatus(json.data?.valid ? "valid" : "invalid");
      } catch {
        setTokenStatus("invalid");
      }
    }
    verifyToken();
  }, [email, token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const passwordConfirmation = formData.get("password_confirmation") as string;

    // Client validation
    const newErrors: Record<string, string> = {};
    if (!password) newErrors.password = "Le mot de passe est requis.";
    else if (password.length < 8) newErrors.password = "Minimum 8 caractères.";
    if (!passwordConfirmation) newErrors.password_confirmation = "Confirmez le mot de passe.";
    else if (password !== passwordConfirmation) newErrors.password_confirmation = "Les mots de passe ne correspondent pas.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.errors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.errors)) {
            mapped[k] = Array.isArray(v) ? v[0] : (v as string);
          }
          setErrors(mapped);
        } else {
          setServerError(json.message ?? "Erreur lors de la définition du mot de passe.");
        }
        setLoading(false);
        return;
      }

      // Success — cache user and redirect
      if (json.data?.user) {
        qc.setQueryData(queryKeys.auth.me(), json.data.user);
      }

      setSuccess(true);

      // Auto-redirect after delay
      setTimeout(() => {
        router.push("/vendor/dashboard");
      }, 2000);
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  // Token verification loading
  if (tokenStatus === "checking") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Vérification de votre lien...
        </p>
      </div>
    );
  }

  // Token invalid/expired
  if (tokenStatus === "invalid") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Lien expiré ou invalide
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="mt-2 flex items-center gap-2 rounded-full bg-sugu-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sugu-500/25 transition-all hover:bg-sugu-600 hover:shadow-sugu-500/40"
        >
          Demander un nouveau lien
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-7 w-7 text-green-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Mot de passe défini ! 🎉
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Redirection vers votre tableau de bord...
          </p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-sugu-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Email display */}
      <div className="rounded-xl border border-sugu-100 bg-sugu-50/50 px-4 py-3 dark:border-sugu-900/30 dark:bg-sugu-950/20">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Compte
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
          {email}
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {serverError}
        </div>
      )}

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
            <Lock className="h-5 w-5" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Minimum 8 caractères"
            className="w-full rounded-full border border-gray-200 bg-white/50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="password_confirmation" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
            <Lock className="h-5 w-5" />
          </div>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Retapez votre mot de passe"
            className="w-full rounded-full border border-gray-200 bg-white/50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
            aria-invalid={!!errors.password_confirmation}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password_confirmation && (
          <p className="mt-1.5 text-sm text-red-500">{errors.password_confirmation}</p>
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
            Définir et accéder à ma boutique
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </button>

      {/* Back to login */}
      <div className="pt-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
        Vous avez déjà un mot de passe ?{" "}
        <Link href="/login" className="text-sugu-500 hover:text-sugu-600 hover:underline">
          Se connecter
        </Link>
      </div>
    </form>
  );
}
