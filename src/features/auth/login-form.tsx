"use client";

import { useState, type FormEvent } from "react";
import { useLogin, useVerifyOtp } from "@/features/auth";
import { loginSchema, type LoginPayload } from "@/features/auth/schema";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";

/**
 * Login form component.
 * Zero business logic — delegates to useLogin() hook.
 */
export function LoginForm() {
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp(); // new
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginPayload, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // 2FA state
  const [is2FA, setIs2FA] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const raw = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    // Client‑side Zod validation
    const result = loginSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginPayload;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const resp = await loginMutation.mutateAsync(result.data);
      if ("verification_required" in resp && resp.verification_required) {
        setIs2FA(true);
        setIdentifier(resp.identifier);
        setServerError(null);
      }
    } catch (err: unknown) {
      const error = err as Error & { status?: number; errors?: Record<string, string[]> };
      const status = error.status ?? 0;

      if (status === 422 && error.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v[0]]),
          ) as typeof errors,
        );
      } else if (status === 401) {
        setServerError("Email ou mot de passe incorrect.");
      } else if (status === 429) {
        setServerError("Trop de tentatives. Veuillez réessayer dans un moment.");
      } else {
        setServerError(error.message || "Une erreur inattendue est survenue.");
      }
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (otpCode.length !== 6) {
      setServerError("Le code doit contenir 6 chiffres.");
      return;
    }

    try {
      await verifyOtpMutation.mutateAsync({
        identifier,
        code: otpCode,
        type: 3, // LoginVerification
      });
    } catch (err: unknown) {
      const error = err as Error & { status?: number; errors?: Record<string, string[]> };
      setServerError(error.message || "Code incorrect.");
    }
  }

  if (is2FA) {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {serverError}
          </div>
        )}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Un code de vérification a été envoyé à <strong>{identifier}</strong>.
          </p>
        </div>
        <div>
          <label htmlFor="otp" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
            Code de vérification (6 chiffres)
          </label>
          <input
            id="otp"
            type="text"
            required
            maxLength={6}
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            className="w-full text-center tracking-widest text-lg rounded-full border border-sugu-200 bg-white/50 py-3.5 px-4 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
          />
        </div>
        <button
          type="submit"
          disabled={verifyOtpMutation.isPending || otpCode.length !== 6}
          className="mt-2 flex w-full items-center justify-center rounded-full bg-[#ea580c] px-6 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#dea83f] hover:shadow-orange-500/40 disabled:opacity-70 dark:bg-[#ea580c] dark:shadow-orange-500/20"
        >
          {verifyOtpMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Vérifier et se connecter"
          )}
        </button>
        <button
          type="button"
          onClick={() => setIs2FA(false)}
          className="mt-2 w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
        >
          Retour à la connexion
        </button>
      </form>
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

      {/* Email ou téléphone */}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
          Email ou téléphone
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
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-sm text-red-500">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
          Mot de passe
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
            <Lock className="h-5 w-5" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-full border border-gray-200 bg-white/50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-200/50 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-sm text-red-500">
            {errors.password}
          </p>
        )}
      </div>

      {/* Options Row */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded-md border-gray-300 text-sugu-500 focus:ring-sugu-500/20"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Se souvenir de moi
          </span>
        </label>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-sugu-500 hover:text-sugu-600 hover:underline"
          tabIndex={-1}
        >
          Mot de passe oublié ?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="mt-2 flex w-full items-center justify-center rounded-full bg-[#ea580c] px-6 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#dea83f] hover:shadow-orange-500/40 disabled:opacity-70 dark:bg-[#ea580c] dark:shadow-orange-500/20"
      >
        {loginMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : "Se connecter"}
      </button>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-gray-500 dark:bg-gray-900 dark:text-gray-400">ou</span>
        </div>
      </div>

      {/* Social Logins */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.5.05 2.87.68 3.56 1.83-3.13 1.87-2.64 5.92.48 7.16-.62 1.62-1.52 3.16-2.71 4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.4 2.4-1.95 4.31-3.74 4.25z" />
          </svg>
          Apple
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      {/* Footer Text */}
      <div className="pt-2 flex flex-col items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
        <p>
          Vous êtes livreur ?{" "}
          <Link href="/signup/driver" className="text-sugu-500 hover:text-sugu-600 hover:underline font-bold">
            Rejoindre avec un code
          </Link>
        </p>
      </div>
    </form>
  );
}
