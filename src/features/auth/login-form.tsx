"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { Alert, Button, FormField, Input, PasswordInput } from "@/design-system";
import { useLogin, useVerifyOtp } from "@/features/auth";
import { loginSchema, type LoginPayload } from "@/features/auth/schema";
import { OTP_LENGTH, OtpInput } from "./components/otp-input";

const LINK = "rounded-compact font-medium text-primary underline underline-offset-2 hover:text-primary-hover";

/**
 * Login form component.
 * Zero business logic — delegates to useLogin() / useVerifyOtp().
 */
export function LoginForm() {
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();
  const [errors, setErrors] = useState<Partial<Record<keyof LoginPayload, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Arriving from an expired session (see lib/auth/session-expiry).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "expired") {
      setSessionExpired(true);
    }
  }, []);

  // 2FA state
  const [is2FA, setIs2FA] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setSessionExpired(false);

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
        fieldErrors[field] ??= issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const resp = await loginMutation.mutateAsync(result.data);
      if ("verification_required" in resp && resp.verification_required) {
        setIs2FA(true);
        setIdentifier(resp.identifier);
        setOtpCode("");
        setServerError(null);
      }
    } catch (err: unknown) {
      const error = err as Error & { status?: number; errors?: Record<string, string[]> };
      const status = error.status ?? 0;

      if (status === 422 && error.errors) {
        setErrors(
          Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])) as typeof errors,
        );
      } else if (status === 401) {
        setServerError("Email ou mot de passe incorrect.");
      } else if (status === 429) {
        setServerError("Trop de tentatives. Veuillez réessayer dans un moment.");
      } else {
        // Only an HTTP refusal carries a message written for the user; a
        // network failure or an unexpected payload gets a plain sentence.
        setServerError((status && error.message) || "Une erreur inattendue est survenue.");
      }
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (otpCode.length !== OTP_LENGTH) {
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
      const error = err as Error & { status?: number };
      setServerError(
        error.status ? error.message || "Code incorrect." : "Vérification impossible pour le moment. Réessayez.",
      );
    }
  }

  if (is2FA) {
    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4" noValidate>
        <Alert tone="info" title="Vérification en deux étapes">
          Un code à 6 chiffres a été envoyé à <strong className="break-all">{identifier}</strong>.
        </Alert>
        {serverError && <Alert tone="danger" title={serverError} />}
        <FormField label="Code de vérification" id="otp" required>
          <OtpInput value={otpCode} onChange={setOtpCode} name="otp" autoFocus />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          icon={ShieldCheck}
          loading={verifyOtpMutation.isPending}
          className="h-touch w-full"
        >
          Vérifier et se connecter
        </Button>
        <Button
          variant="quiet"
          icon={ArrowLeft}
          onClick={() => {
            setIs2FA(false);
            setServerError(null);
          }}
          className="w-full"
        >
          Retour à la connexion
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {sessionExpired && !serverError && (
        <Alert tone="warning" title="Votre session a expiré">
          Reconnectez-vous pour continuer.
        </Alert>
      )}
      {serverError && <Alert tone="danger" title={serverError} />}

      <FormField label="Adresse e-mail" id="email" error={errors.email} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          leadingIcon={Mail}
          placeholder="vous@entreprise.com"
        />
      </FormField>

      <FormField label="Mot de passe" id="password" error={errors.password} required>
        <PasswordInput name="password" autoComplete="current-password" leadingIcon={Lock} />
      </FormField>

      <p className="-mt-1 text-right text-label">
        <Link href="/forgot-password" className={LINK}>
          Mot de passe oublié ?
        </Link>
      </p>

      <Button type="submit" variant="primary" icon={LogIn} loading={loginMutation.isPending} className="h-touch w-full">
        Se connecter
      </Button>

      <p className="border-t border-border pt-4 text-center text-body text-foreground-muted">
        Vous êtes coursier ?{" "}
        <Link href="/signup/driver" className={LINK}>
          Rejoindre avec un code d&apos;agence
        </Link>
      </p>
    </form>
  );
}
