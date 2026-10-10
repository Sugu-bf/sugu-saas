"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Loader2, Lock, RefreshCw, Send } from "lucide-react";
import { Alert, Button, FormField, PasswordInput } from "@/design-system";
import { postLoginPath } from "@/lib/auth/session-user";
import { queryKeys } from "@/lib/query";
import { userSchema } from "./schema";

interface Props {
  token: string;
  email: string;
}

/**
 * `unavailable` is not `invalid`: an outage must not tell someone their
 * link is dead.
 */
type TokenStatus = "checking" | "valid" | "invalid" | "unavailable";

const LINK = "rounded-compact font-medium text-primary underline underline-offset-2 hover:text-primary-hover";

/** First access: the link received by e-mail lets the owner choose a password. Needs no session. */
export function SetPasswordForm({ token, email }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const incomplete = !token || !email;

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Verify the link on mount (and on retry).
  useEffect(() => {
    if (incomplete) return;
    let cancelled = false;
    async function verifyToken() {
      let status: TokenStatus;
      try {
        const res = await fetch("/api/auth/verify-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status >= 500) status = "unavailable";
        else status = res.ok && json.data?.valid ? "valid" : "invalid";
      } catch {
        status = "unavailable";
      }
      if (!cancelled) setTokenStatus(status);
    }
    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [email, token, incomplete, attempt]);

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
    else if (password !== passwordConfirmation)
      newErrors.password_confirmation = "Les mots de passe ne correspondent pas.";

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

      // The route signed the user in. Land in THEIR space: the profile is
      // re-validated here, and anything unexpected goes through /login
      // rather than being assumed to be a vendor.
      const user = userSchema.safeParse(json.data?.user);
      setSuccess(true);
      if (user.success) {
        qc.setQueryData(queryKeys.auth.me(), user.data);
        router.replace(postLoginPath(user.data));
      } else {
        router.replace("/login");
      }
    } catch {
      setServerError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  if (incomplete) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="danger" title="Lien incomplet">
          Ce lien ne contient pas toutes les informations nécessaires. Ouvrez-le directement depuis l&apos;e-mail
          reçu, ou demandez-en un nouveau.
        </Alert>
        <RecoveryLinks />
      </div>
    );
  }

  if (tokenStatus === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-6" role="status">
        <Loader2 className="size-6 animate-ds-spin text-foreground-subtle" aria-hidden="true" />
        <p className="text-body text-foreground-muted">Vérification de votre lien…</p>
      </div>
    );
  }

  if (tokenStatus === "unavailable") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="warning" title="Vérification impossible pour le moment">
          Le service ne répond pas. Votre lien n&apos;est pas remis en cause : réessayez dans un instant.
        </Alert>
        <Button
          variant="primary"
          icon={RefreshCw}
          onClick={() => {
            setTokenStatus("checking");
            setAttempt((current) => current + 1);
          }}
          className="h-touch w-full"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="danger" title="Lien expiré ou invalide">
          Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau code pour définir votre mot de passe.
        </Alert>
        <RecoveryLinks />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6" role="status">
        <Loader2 className="size-6 animate-ds-spin text-foreground-subtle" aria-hidden="true" />
        <p className="text-body font-medium text-foreground">Mot de passe défini</p>
        <p className="text-body text-foreground-muted">Ouverture de votre espace…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="rounded-control border border-border bg-surface-subtle px-3 py-2">
        <p className="text-meta text-foreground-muted">Compte</p>
        <p className="text-body font-medium break-all text-foreground">{email}</p>
      </div>

      {serverError && <Alert tone="danger" title={serverError} />}

      <FormField label="Nouveau mot de passe" id="password" hint="8 caractères minimum." error={errors.password} required>
        <PasswordInput name="password" autoComplete="new-password" leadingIcon={Lock} />
      </FormField>

      <FormField
        label="Confirmer le mot de passe"
        id="password_confirmation"
        error={errors.password_confirmation}
        required
      >
        <PasswordInput name="password_confirmation" autoComplete="new-password" leadingIcon={Lock} />
      </FormField>

      <Button type="submit" variant="primary" icon={KeyRound} loading={loading} className="h-touch w-full">
        Définir mon mot de passe
      </Button>

      <p className="text-center text-body text-foreground-muted">
        Vous avez déjà un mot de passe ?{" "}
        <Link href="/login" className={LINK}>
          Se connecter
        </Link>
      </p>
    </form>
  );
}

function RecoveryLinks() {
  return (
    <>
      <Button asChild variant="primary" icon={Send} className="h-touch w-full">
        <Link href="/forgot-password">Demander un nouveau code</Link>
      </Button>
      <Button asChild variant="quiet" icon={ArrowLeft} className="w-full">
        <Link href="/login">Retour à la connexion</Link>
      </Button>
    </>
  );
}
