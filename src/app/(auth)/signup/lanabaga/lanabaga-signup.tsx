"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MailCheck } from "lucide-react";
import { Alert, Button, FormField, Input, PasswordInput, Stepper } from "@/design-system";
import { AuthCard } from "@/features/auth/components/auth-frame";
import { OTP_LENGTH, OtpInput } from "@/features/auth/components/otp-input";
import { registerLanabaga, verifyEmailOtp } from "@/features/auth/service";
import { PhoneInput } from "@/features/lanaya/components/network";
import { LANABAGA_FILE_PATH } from "@/lib/auth/session-user";
import { queryKeys } from "@/lib/query";

// ============================================================
// Devenir Lanabaga — a new SUGU account and its draft application.
//
// An ordinary account (no new user type). An address or a number already
// known gets one neutral answer from the server, which does not say who is
// registered; the existing account applies from its own space.
// ============================================================

/** Pilot country (DEC-05). The server refuses any country whose onboarding is closed. */
const PILOT_COUNTRY = { code: "BF", name: "Burkina Faso" };

const STEPS = [
  { id: "account", label: "Compte" },
  { id: "email", label: "E-mail" },
  { id: "application", label: "Candidature" },
];

type Fields = "first_name" | "last_name" | "phone" | "email" | "password" | "confirm" | "city";

export function LanabagaSignup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"account" | "email">("account");
  const [values, setValues] = useState<Record<Fields, string>>({ first_name: "", last_name: "", phone: "", email: "", password: "", confirm: "", city: "" });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const set = (field: Fields) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function finish() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    router.replace(LANABAGA_FILE_PATH);
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    const found: Partial<Record<Fields, string>> = {};
    if (values.first_name.trim().length < 2) found.first_name = "Indiquez votre prénom.";
    if (values.last_name.trim().length < 2) found.last_name = "Indiquez votre nom.";
    if (values.phone.trim().length < 6) found.phone = "Indiquez votre numéro de téléphone.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) found.email = "Indiquez une adresse e-mail valide.";
    if (values.password.length < 8 || !/[A-Z]/.test(values.password) || !/[a-z]/.test(values.password) || !/\d/.test(values.password)) {
      found.password = "Au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.";
    }
    if (values.confirm !== values.password) found.confirm = "Les deux mots de passe ne correspondent pas.";
    if (values.city.trim().length < 2) found.city = "Indiquez votre ville.";
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const result = await registerLanabaga({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        password: values.password,
        country_code: PILOT_COUNTRY.code,
        city: values.city.trim(),
      });
      if (result.email_verification_required) {
        setStep("email");
      } else {
        await finish();
      }
    } catch (error) {
      const failure = error as Error & { errors?: Record<string, string[]> };
      const fieldErrors: Partial<Record<Fields, string>> = {};
      for (const field of ["first_name", "last_name", "phone", "email", "password", "city"] as Fields[]) {
        const message = failure.errors?.[field]?.[0];
        if (message) fieldErrors[field] = message;
      }
      setErrors(fieldErrors);
      // The server words its refusals for the user, the code prefix aside.
      setProblem(Object.keys(fieldErrors).length > 0 ? null : (failure.message ?? "").replace(/^SUGU-[A-Z0-9-]+:\s*/, "") || "L'inscription n'a pas pu aboutir.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (code.length < OTP_LENGTH) {
      setCodeError(`Saisissez le code à ${OTP_LENGTH} chiffres.`);
      return;
    }
    setCodeError(null);
    setBusy(true);
    try {
      await verifyEmailOtp({ identifier: values.email.trim(), code, type: 1 });
      await finish();
    } catch (error) {
      setCodeError((error as Error).message || "Code invalide ou expiré.");
    } finally {
      setBusy(false);
    }
  }

  const stepper = <Stepper steps={STEPS} currentStep={step === "account" ? 0 : 1} label="Étapes de l'inscription" />;

  if (step === "email") {
    return (
      <AuthCard
        wide
        header={stepper}
        title="Vérifier votre e-mail"
        description={
          <>
            Un code à {OTP_LENGTH} chiffres a été envoyé à <strong className="break-all">{values.email.trim()}</strong>.
          </>
        }
      >
        <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
          <FormField label="Code de confirmation" id="email-otp" error={codeError} required>
            <OtpInput value={code} onChange={setCode} autoFocus />
          </FormField>
          <Button type="submit" variant="primary" icon={MailCheck} loading={busy} className="h-touch w-full">
            Vérifier l&apos;e-mail
          </Button>
          <Button variant="quiet" onClick={finish} disabled={busy}>
            Vérifier plus tard et continuer ma candidature
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      wide
      header={stepper}
      title="Devenir Lanabaga"
      description="Créez votre compte SUGU, puis complétez votre candidature au programme Lanaya. SUGU examine chaque candidature avant de l'admettre."
    >
      <form onSubmit={register} className="flex flex-col gap-4" noValidate>
        {problem && (
          <Alert tone="danger" title="Inscription impossible">
            {problem}
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Prénom" id="first-name" error={errors.first_name} required>
            <Input value={values.first_name} onChange={(e) => set("first_name")(e.target.value)} autoComplete="given-name" maxLength={100} />
          </FormField>
          <FormField label="Nom" id="last-name" error={errors.last_name} required>
            <Input value={values.last_name} onChange={(e) => set("last_name")(e.target.value)} autoComplete="family-name" maxLength={100} />
          </FormField>
        </div>
        <FormField label="Téléphone" id="phone" error={errors.phone} hint="Sans indicatif, le +226 est ajouté." required>
          <PhoneInput value={values.phone} onChange={(e) => set("phone")(e.target.value)} autoComplete="tel-national" maxLength={30} />
        </FormField>
        <FormField label="E-mail" id="email" error={errors.email} required>
          <Input type="email" value={values.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" maxLength={255} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Pays" id="country" hint="Pays pilote du programme.">
            <Input value={PILOT_COUNTRY.name} readOnly disabled />
          </FormField>
          <FormField label="Ville" id="city" error={errors.city} required>
            <Input value={values.city} onChange={(e) => set("city")(e.target.value)} autoComplete="address-level2" placeholder="Ex. Ouagadougou" maxLength={100} />
          </FormField>
        </div>
        <FormField label="Mot de passe" id="password" error={errors.password} hint="Au moins 8 caractères, dont une majuscule, une minuscule et un chiffre." required>
          <PasswordInput value={values.password} onChange={(e) => set("password")(e.target.value)} autoComplete="new-password" />
        </FormField>
        <FormField label="Confirmer le mot de passe" id="password-confirm" error={errors.confirm} required>
          <PasswordInput value={values.confirm} onChange={(e) => set("confirm")(e.target.value)} autoComplete="new-password" />
        </FormField>
        <Button type="submit" variant="primary" trailingIcon={ArrowRight} loading={busy} className="h-touch w-full">
          Créer mon compte
        </Button>
        <p className="text-center text-label font-normal text-foreground-muted">
          Vous avez déjà un compte SUGU ?{" "}
          <Link href={`/login?redirect=${encodeURIComponent(LANABAGA_FILE_PATH)}`} className="rounded-compact font-medium text-foreground underline underline-offset-2 hover:text-primary">
            Connectez-vous
          </Link>{" "}
          pour candidater depuis votre espace.
        </p>
      </form>
    </AuthCard>
  );
}
