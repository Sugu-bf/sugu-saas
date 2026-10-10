"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Lock, LogIn, Mail, Send } from "lucide-react";
import { Alert, Button, FormField, Input, PasswordInput } from "@/design-system";
import { OTP_LENGTH, OtpInput } from "./components/otp-input";

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

  // Step 1: ask for the code (e-mail)
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
        return;
      }

      setStep(2);
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: code + new password
  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setPasswordErrors({});

    const newErrors: Record<string, string> = {};
    if (!code || code.length !== OTP_LENGTH) newErrors.code = "Le code doit contenir 6 chiffres.";
    if (!password) newErrors.password = "Le mot de passe est requis.";
    else if (password.length < 8) newErrors.password = "Minimum 8 caractères.";
    if (!passwordConfirmation) newErrors.password_confirmation = "Confirmez le mot de passe.";
    else if (password !== passwordConfirmation)
      newErrors.password_confirmation = "Les mots de passe ne correspondent pas.";

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
        return;
      }

      setStep(3);
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (step === 3) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Mot de passe modifié">
          Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </Alert>
        <Button asChild variant="primary" icon={LogIn} className="h-touch w-full">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={handleResetPassword} className="flex flex-col gap-4" noValidate>
        <Alert tone="info" title="Code envoyé">
          Saisissez le code à 6 chiffres reçu à <strong className="break-all">{email}</strong>.
        </Alert>
        {serverError && <Alert tone="danger" title={serverError} />}

        <FormField label="Code de vérification" id="code" error={passwordErrors.code} required>
          <OtpInput value={code} onChange={setCode} autoFocus />
        </FormField>

        <FormField
          label="Nouveau mot de passe"
          id="password"
          hint="8 caractères minimum."
          error={passwordErrors.password}
          required
        >
          <PasswordInput
            name="password"
            autoComplete="new-password"
            leadingIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <FormField
          label="Confirmer le mot de passe"
          id="password_confirmation"
          error={passwordErrors.password_confirmation}
          required
        >
          <PasswordInput
            name="password_confirmation"
            autoComplete="new-password"
            leadingIcon={Lock}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
        </FormField>

        <Button type="submit" variant="primary" icon={KeyRound} loading={loading} className="h-touch w-full">
          Réinitialiser le mot de passe
        </Button>
        <Button
          variant="quiet"
          icon={ArrowLeft}
          onClick={() => {
            setStep(1);
            setServerError(null);
          }}
          className="w-full"
        >
          Utiliser une autre adresse
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="flex flex-col gap-4" noValidate>
      {serverError && <Alert tone="danger" title={serverError} />}

      <FormField label="Adresse e-mail" id="email" error={emailError} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          leadingIcon={Mail}
          placeholder="vous@entreprise.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <Button type="submit" variant="primary" icon={Send} loading={loading} className="h-touch w-full">
        Envoyer le code
      </Button>
      <Button asChild variant="quiet" icon={ArrowLeft} className="w-full">
        <Link href="/login">Retour à la connexion</Link>
      </Button>
    </form>
  );
}
