"use client";

import { useState, type FormEvent } from "react";
import { useLogin } from "@/features/auth";
import { loginSchema, type LoginPayload } from "@/features/auth/schema";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

/**
 * Login form component.
 * Zero business logic — delegates to useLogin() hook.
 */
export function LoginForm() {
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginPayload, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

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
      await loginMutation.mutateAsync(result.data);
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
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="votre@email.com"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-sugu-400"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-500">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-sugu-400"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-500">
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-sugu-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sugu-500/25 transition-all duration-200 hover:bg-sugu-600 hover:shadow-sugu-500/35 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loginMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {loginMutation.isPending ? "Connexion…" : "Se connecter"}
      </button>

      {/* Demo credentials */}
      <div className="mt-6 rounded-lg border border-sugu-200 bg-sugu-50/50 p-4 dark:border-sugu-900/40 dark:bg-sugu-950/20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sugu-600 dark:text-sugu-400">
          Comptes démo
        </p>
        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <p>
            <span className="font-medium text-gray-900 dark:text-gray-200">Vendeur :</span>{" "}
            seller@sugu.pro / 12345678
          </p>
          <p>
            <span className="font-medium text-gray-900 dark:text-gray-200">Agence :</span>{" "}
            courier1@sugu.pro / 12345678
          </p>
        </div>
      </div>
    </form>
  );
}
