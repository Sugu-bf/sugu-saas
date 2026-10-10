"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  FileUp,
  Hourglass,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  Alert,
  Button,
  FormField,
  Input,
  PasswordInput,
  Radio,
  RadioGroup,
  Select,
  Stepper,
  cn,
} from "@/design-system";
import { useLogout } from "@/features/auth";
import { AuthCard } from "@/features/auth/components/auth-frame";
import { OTP_LENGTH, OtpInput } from "@/features/auth/components/otp-input";
import { COURIER_STATUS_PENDING_KYC, homePathFor } from "@/lib/auth/session-user";
import { queryKeys } from "@/lib/query";

type Step = "CODE" | "PERSONAL" | "VERIFY_EMAIL" | "VEHICLE" | "DOCUMENTS" | "PENDING";

const STEPS = [
  { id: "code", label: "Code" },
  { id: "identity", label: "Identité" },
  { id: "vehicle", label: "Véhicule" },
  { id: "documents", label: "Pièces" },
];

const STEP_INDEX: Record<Exclude<Step, "PENDING">, number> = {
  CODE: 0,
  PERSONAL: 1,
  VERIFY_EMAIL: 1,
  VEHICLE: 2,
  DOCUMENTS: 3,
};

const PHONE_PREFIXES = [
  { value: "+226", label: "BF +226" },
  { value: "+225", label: "CI +225" },
  { value: "+229", label: "BJ +229" },
  { value: "+228", label: "TG +228" },
  { value: "+223", label: "ML +223" },
  { value: "+227", label: "NE +227" },
  { value: "+221", label: "SN +221" },
];

const VEHICLE_TYPES = [
  { value: "moto", label: "Moto" },
  { value: "velo", label: "Vélo" },
  { value: "voiture", label: "Voiture" },
];

const FILE_INPUT = cn(
  "w-full min-w-0 rounded-control border border-border-control bg-surface text-body text-foreground-muted",
  "file:mr-3 file:h-control file:cursor-pointer file:border-0 file:border-r file:border-border file:bg-surface-subtle file:px-3 file:text-label file:text-foreground",
  "touch:file:h-touch",
);

/**
 * Courier signup: agency code → identity → e-mail check → vehicle → KYC
 * documents → waiting for the agency.
 *
 * The page never activates anything: the account stays `PENDING_KYC` until
 * the agency approves it, and the API refuses courier operations until then.
 */
export function DriverSignupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const logout = useLogout();

  // `?step=pending`: a signed-in courier still awaiting approval (see RoleGuard).
  const [step, setStep] = useState<Step>(() => (searchParams?.get("step") === "pending" ? "PENDING" : "CODE"));

  // -- Step 1: Code --
  const [code, setCode] = useState(() => (searchParams?.get("ref") ?? "").toUpperCase());
  const hasCode = code.length >= 6;
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [partnerId, setPartnerId] = useState<number | string>("");

  const handleNextToPersonal = async (e: FormEvent) => {
    e.preventDefault();
    if (!hasCode) {
      setCodeError("Saisissez le code fourni par votre agence.");
      return;
    }
    setIsVerifying(true);
    setCodeError("");
    try {
      const { validateCourierCode } = await import("@/features/auth/service");
      const res = await validateCourierCode(code);
      setAgencyName(res.agency_name);
      setPartnerId(res.partner_id);
      setStep("PERSONAL");
    } catch (error: Error | unknown) {
      setAgencyName("");
      setCodeError((error as Error).message || "Code invalide");
    } finally {
      setIsVerifying(false);
    }
  };

  // -- Step 2: Personal Info --
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+226");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");

  const hasMinChars = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const [courierId, setCourierId] = useState("");
  // The session lives in an httpOnly cookie set by the register route; the
  // page only needs to know that it exists.
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegisterUser = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setRegisterError("Les mots de passe ne correspondent pas");
      return;
    }
    if (!firstName || !lastName || !phone || !email || !password) {
      setRegisterError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setRegisterError("");
    setIsRegistering(true);

    try {
      const { registerCourier } = await import("@/features/auth/service");
      const payload: Record<string, unknown> = {
        code,
        first_name: firstName,
        last_name: lastName,
        phone: phonePrefix + phone,
        email,
        password,
      };
      if (gender) payload.gender = gender;

      const res = await registerCourier(payload);

      // Refresh the session so the app knows we are logged in
      const { getMe } = await import("@/features/auth/service");
      await getMe().catch(() => {});

      if ("courier_id" in res && res.courier_id) setCourierId(res.courier_id);
      if ("user" in res) setIsRegistered(true);

      if ("email_verification_required" in res && res.email_verification_required) {
        setStep("VERIFY_EMAIL");
      } else {
        setStep("VEHICLE");
      }
    } catch (error: unknown) {
      const err = error as Error & { errors?: Record<string, string[]> };
      if (err.errors && err.errors.email) {
        setRegisterError(err.errors.email[0]);
      } else if (err.errors && err.errors.phone) {
        setRegisterError(err.errors.phone[0]);
      } else {
        setRegisterError(err.message || "Erreur lors de l'inscription");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // -- Step 2.5: Verify Email --
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleVerifyEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (otpCode.length < OTP_LENGTH) {
      setOtpError("Veuillez saisir le code à 6 chiffres.");
      return;
    }
    setOtpError("");
    setIsVerifyingOtp(true);
    try {
      const { verifyEmailOtp } = await import("@/features/auth/service");
      await verifyEmailOtp({ identifier: email, code: otpCode, type: 1 });
      setStep("VEHICLE");
    } catch (error: unknown) {
      setOtpError((error as Error).message || "Code invalide ou expiré.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // -- Step 3: Vehicle Info --
  const [vehicleType, setVehicleType] = useState("moto");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [quartier, setQuartier] = useState("");

  const handleSaveVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleMake || !vehiclePlate || !quartier) {
      setRegisterError("Veuillez remplir les informations de votre véhicule");
      return;
    }
    setRegisterError("");
    setIsRegistering(true);
    try {
      const { updateVehicleCourier } = await import("@/features/auth/service");
      const payload: Record<string, unknown> = {
        vehicle_type: vehicleType,
        vehicle_make: vehicleMake,
        vehicle_plate: vehiclePlate,
        quartier,
      };

      await updateVehicleCourier(payload);
      setStep("DOCUMENTS");
    } catch (error: unknown) {
      setRegisterError((error as Error).message || "Erreur lors de l'enregistrement du véhicule");
    } finally {
      setIsRegistering(false);
    }
  };

  // -- Step 4: Documents --
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [permisFile, setPermisFile] = useState<File | null>(null);
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUploadDocuments = async () => {
    if (!courierId || !isRegistered) {
      setStep("PENDING");
      return;
    }
    setIsUploading(true);
    try {
      const { apiFetch } = await import("@/lib/http/client");

      const upload = async (file: File, type: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        const fd = new FormData();
        fd.append("files[]", file);
        fd.append("document_type", type);
        fd.append("document_name", type);
        const res = await apiFetch(`agencies/${partnerId}/couriers/${courierId}/kyc-documents`, {
          method: "POST",
          body: fd,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Upload ${type} failed: ${res.status}`);
      };

      if (cniFile) await upload(cniFile, "id_card");
      if (permisFile) await upload(permisFile, "driver_license");
      if (carteGriseFile) await upload(carteGriseFile, "vehicle_registration");
      setUploadError("");
    } catch {
      setUploadError("Certains documents n'ont pas pu être envoyés. Signalez-le à votre agence.");
    } finally {
      setIsUploading(false);
      setStep("PENDING");
    }
  };

  // -- Pending: ask the API where the account stands --
  const [isChecking, setIsChecking] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ tone: "info" | "danger"; text: string } | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusNotice(null);
    try {
      const { getMe } = await import("@/features/auth/service");
      const user = await getMe();
      if (!user) {
        router.push("/login");
        return;
      }
      if (user.role === "courier" && user.courier_status === COURIER_STATUS_PENDING_KYC) {
        setStatusNotice({ tone: "info", text: "Votre dossier est toujours en cours d'examen par votre agence." });
        return;
      }
      queryClient.setQueryData(queryKeys.auth.me(), user);
      router.push(homePathFor(user));
    } catch {
      setStatusNotice({ tone: "danger", text: "Impossible de vérifier votre statut pour le moment. Réessayez." });
    } finally {
      setIsChecking(false);
    }
  };

  const stepper =
    step === "PENDING" ? undefined : (
      <Stepper steps={STEPS} currentStep={STEP_INDEX[step]} label="Inscription coursier" />
    );

  if (step === "CODE") {
    return (
      <AuthCard
        wide
        header={stepper}
        title="Rejoindre une agence"
        description="Saisissez le code de recrutement remis par votre agence de livraison."
      >
        <form onSubmit={handleNextToPersonal} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Code de recrutement"
            id="recruitment-code"
            error={codeError || null}
            hint="Vous n'avez pas de code ? Contactez votre agence."
            required
          >
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeError("");
              }}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="font-medium tracking-wide uppercase"
            />
          </FormField>
          <Button type="submit" variant="primary" trailingIcon={ArrowRight} loading={isVerifying} className="h-touch w-full">
            Vérifier le code
          </Button>
          <Button asChild variant="quiet" icon={ArrowLeft} className="w-full">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "PERSONAL") {
    return (
      <AuthCard
        wide
        header={stepper}
        title="Créer votre compte"
        description="Vos informations personnelles. Le véhicule et les pièces viennent ensuite."
      >
        <form onSubmit={handleRegisterUser} className="flex flex-col gap-4" noValidate>
          {agencyName && (
            <Alert tone="success" title={`Agence : ${agencyName}`}>
              Code vérifié. Votre compte sera rattaché à cette agence.
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nom" id="last-name" required>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </FormField>
            <FormField label="Prénom" id="first-name" required>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </FormField>
          </div>

          <FormField label="Téléphone" id="phone" hint="Ce numéro sera utilisé pour vous contacter." required>
            <PhoneRow prefix={phonePrefix} onPrefixChange={setPhonePrefix}>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </PhoneRow>
          </FormField>

          <FormField label="Genre (facultatif)" id="gender">
            <Select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="Non précisé"
              options={[
                { value: "homme", label: "Homme" },
                { value: "femme", label: "Femme" },
              ]}
            />
          </FormField>

          <FormField label="Adresse e-mail" id="email" required>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label="Mot de passe" id="password" required>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </FormField>
          <ul className="-mt-2 flex flex-col gap-1 text-meta text-foreground-muted" aria-label="Critères du mot de passe">
            <Criterion met={hasMinChars}>Au moins 8 caractères</Criterion>
            <Criterion met={hasUppercase}>Une lettre majuscule</Criterion>
            <Criterion met={hasNumber}>Un chiffre</Criterion>
          </ul>

          <FormField label="Confirmer le mot de passe" id="password-confirmation" required>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>

          {registerError && <Alert tone="danger" title={registerError} />}

          <Button type="submit" variant="primary" icon={UserPlus} loading={isRegistering} className="h-touch w-full">
            Créer mon compte
          </Button>
          <Button variant="quiet" icon={ArrowLeft} onClick={() => setStep("CODE")} disabled={isRegistering} className="w-full">
            Changer de code
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "VERIFY_EMAIL") {
    return (
      <AuthCard
        wide
        header={stepper}
        title="Vérifier votre e-mail"
        description={
          <>
            Un code à 6 chiffres a été envoyé à <strong className="break-all">{email}</strong>.
          </>
        }
      >
        <form onSubmit={handleVerifyEmail} className="flex flex-col gap-4" noValidate>
          <FormField label="Code de confirmation" id="email-otp" error={otpError || null} required>
            <OtpInput value={otpCode} onChange={setOtpCode} autoFocus />
          </FormField>
          <Button type="submit" variant="primary" icon={MailCheck} loading={isVerifyingOtp} className="h-touch w-full">
            Vérifier l&apos;e-mail
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "VEHICLE") {
    return (
      <AuthCard
        wide
        header={stepper}
        title="Votre véhicule"
        description="Votre compte est créé. Indiquez votre zone et votre véhicule."
      >
        <form onSubmit={handleSaveVehicle} className="flex flex-col gap-4" noValidate>
          <FormField label="Quartier principal" id="quartier" hint="La zone où vous livrez le plus souvent." required>
            <Input value={quartier} onChange={(e) => setQuartier(e.target.value)} />
          </FormField>

          <RadioGroup label="Type de véhicule" value={vehicleType} onValueChange={setVehicleType} required>
            {VEHICLE_TYPES.map((type) => (
              <Radio key={type.value} value={type.value} label={type.label} />
            ))}
          </RadioGroup>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Marque et modèle" id="vehicle-make" required>
              <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
            </FormField>
            <FormField label="Plaque d'immatriculation" id="vehicle-plate" required>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                autoCapitalize="characters"
                className="uppercase"
              />
            </FormField>
          </div>

          {registerError && <Alert tone="danger" title={registerError} />}

          <Button type="submit" variant="primary" trailingIcon={ArrowRight} loading={isRegistering} className="h-touch w-full">
            Continuer
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "DOCUMENTS") {
    return (
      <AuthCard
        wide
        header={stepper}
        title="Pièces justificatives"
        description="Votre agence en a besoin pour valider votre compte. Photo ou PDF."
      >
        <div className="flex flex-col gap-4">
          <FormField label="Pièce d'identité (CNI ou passeport)" id="doc-id" required>
            <input
              id="doc-id"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setCniFile(e.target.files?.[0] || null)}
              className={FILE_INPUT}
            />
          </FormField>
          <FormField label="Permis de conduire" id="doc-license" required>
            <input
              id="doc-license"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setPermisFile(e.target.files?.[0] || null)}
              className={FILE_INPUT}
            />
          </FormField>
          <FormField label="Carte grise (facultatif)" id="doc-registration">
            <input
              id="doc-registration"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setCarteGriseFile(e.target.files?.[0] || null)}
              className={FILE_INPUT}
            />
          </FormField>

          <Button
            variant="primary"
            icon={FileUp}
            onClick={handleUploadDocuments}
            loading={isUploading}
            disabled={!cniFile || !permisFile}
            className="h-touch w-full"
          >
            Envoyer mes pièces
          </Button>
          {(!cniFile || !permisFile) && (
            <p className="-mt-2 text-center text-meta text-foreground-muted">
              La pièce d&apos;identité et le permis sont nécessaires pour l&apos;envoi.
            </p>
          )}
          <Button variant="quiet" onClick={() => setStep("PENDING")} disabled={isUploading} className="w-full">
            Continuer sans envoyer maintenant
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      wide
      title="Compte en attente de validation"
      description="Votre agence de livraison doit valider votre compte avant vos premières courses."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-panel border border-warning-border bg-warning-bg p-3 text-warning-fg">
          <Hourglass className="mt-0.5 size-4 shrink-0 text-warning-icon" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-body font-semibold">En attente de votre agence</p>
            <p className="mt-0.5 text-body">
              {agencyName ? `${agencyName} examine votre dossier.` : "Votre agence examine votre dossier."} Vous
              pourrez accepter des livraisons dès sa validation.
            </p>
          </div>
        </div>

        {uploadError && <Alert tone="warning" title={uploadError} />}
        {statusNotice && <Alert tone={statusNotice.tone} title={statusNotice.text} />}

        <Button variant="primary" icon={RefreshCw} onClick={handleCheckStatus} loading={isChecking} className="h-touch w-full">
          Vérifier mon statut
        </Button>
        <Button icon={LogOut} onClick={() => logout.mutate()} loading={logout.isPending} className="w-full">
          Se déconnecter
        </Button>
        <p className="flex items-start gap-2 text-meta text-foreground-muted">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-foreground-subtle" aria-hidden="true" />
          Une question sur votre dossier ? Adressez-vous directement à votre agence.
        </p>
      </div>
    </AuthCard>
  );
}

function Criterion({ met, children }: { met: boolean; children: ReactNode }) {
  const Icon = met ? Check : Circle;
  return (
    <li className={cn("flex items-center gap-1.5", met && "text-success-fg")}>
      <Icon className={cn("size-3.5 shrink-0", met ? "text-success-icon" : "text-foreground-subtle")} aria-hidden="true" />
      <span>{children}</span>
      <span className="sr-only">{met ? " (respecté)" : " (à respecter)"}</span>
    </li>
  );
}

function PhoneRow({
  prefix,
  onPrefixChange,
  children,
}: {
  prefix: string;
  onPrefixChange: (prefix: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <div className="w-28 shrink-0">
        <Select
          aria-label="Indicatif du pays"
          // Outside the field wiring: the label and the id belong to the number.
          id="phone-prefix"
          required={false}
          value={prefix}
          onChange={(e) => onPrefixChange(e.target.value)}
          options={PHONE_PREFIXES}
        />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
