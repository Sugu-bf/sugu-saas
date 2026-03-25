"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail, ArrowLeft, CheckCircle, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Étape 1 : Demande du code (email)
  async function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setEmailError(null);

    const targetEmail = email.trim();

    if (!targetEmail) {
      setEmailError("L'adresse email est requise.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setEmailError("L'adresse email n'est pas valide.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.message ?? "Erreur lors de l'envoi du code.");
        setLoading(false);
        return;
      }

      setStep(2); // Passe à l'étape du code + réinitialisation
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  // Étape 2 : Vérification du code + Nouveau mot de passe
  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setPasswordErrors({});

    const newErrors: Record<string, string> = {};
    if (!code || code.length !== 6) newErrors.code = "Le code doit contenir 6 chiffres.";
    if (!password) newErrors.password = "Le mot de passe est requis.";
    else if (password.length < 8) newErrors.password = "Minimum 8 caractères.";
    if (!passwordConfirmation) newErrors.password_confirmation = "Confirmez le mot de passe.";
    else if (password !== passwordConfirmation) newErrors.password_confirmation = "Les mots de passe ne correspondent pas.";

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
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
          setPasswordErrors(mapped);
        } else {
          setServerError(json.message ?? "Erreur lors de la réinitialisation.");
        }
        setLoading(false);
        return;
      }

      setStep(3); // Succès total
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  // ── Rendu de l'Étape 3 : Succès Total ──
  if (step === 3) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-7 w-7 text-green-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Mot de passe modifié ! 🎉
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Votre mot de passe a bien été réinitialisé.
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

  // ── Rendu de l'Étape 2 : Code OTP + Nouveau Mot de passe ──
  if (step === 2) {
    return (
      <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {serverError}
          </div>
        )}

        <div className="rounded-xl border border-sugu-100 bg-green-50/50 px-4 py-3 dark:border-sugu-900/30 dark:bg-green-950/20 mb-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-400">
            Email envoyé à <strong>{email}</strong>
          </p>
          <p className="text-xs text-green-700 dark:text-green-500 mt-1">
            Veuillez entrer le code à 6 chiffres reçu pour réinitialiser votre mot de passe.
          </p>
        </div>

        {/* Code OTP */}
        <div>
          <label htmlFor="code" className="mb-2 block text-sm font-semibold text-gray-900 dark:text-gray-200">
            Code de vérification (6 chiffres)
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            maxLength={6}
            placeholder="Ex: 384730"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full rounded-full border border-sugu-200 bg-white/50 py-3.5 px-4 text-center text-lg font-bold tracking-widest text-gray-900 outline-none transition-all placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
            aria-invalid={!!passwordErrors.code}
          />
          {passwordErrors.code && (
            <p className="mt-1.5 text-sm text-red-500">{passwordErrors.code}</p>
          )}
        </div>

        {/* Nouveau mot de passe */}
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
              required
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white/50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
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
          {passwordErrors.password && (
            <p className="mt-1.5 text-sm text-red-500">{passwordErrors.password}</p>
          )}
        </div>

        {/* Confirmer mot de passe */}
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
              required
              placeholder="Retapez votre mot de passe"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white/50 py-3.5 pl-11 pr-12 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
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
          {passwordErrors.password_confirmation && (
            <p className="mt-1.5 text-sm text-red-500">{passwordErrors.password_confirmation}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center rounded-full bg-[#ea580c] px-6 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 transition-all hover:bg-[#dea83f] hover:shadow-orange-500/40 disabled:opacity-70 dark:bg-[#ea580c] dark:shadow-orange-500/20"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Réinitialiser
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Utiliser un autre email
          </button>
        </div>
      </form>
    );
  }

  // ── Rendu de l'Étape 1 : Demande email ──
  return (
    <form onSubmit={handleSendCode} className="space-y-5" noValidate>
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {serverError}
        </div>
      )}

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@votreentreprise.com"
            className="w-full rounded-full border border-sugu-200 bg-white/50 py-3.5 pl-11 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-sugu-500 focus:bg-white focus:ring-4 focus:ring-sugu-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:bg-gray-800"
            aria-invalid={!!emailError}
          />
        </div>
        {emailError && (
          <p className="mt-1.5 text-sm text-red-500">{emailError}</p>
        )}
      </div>

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
