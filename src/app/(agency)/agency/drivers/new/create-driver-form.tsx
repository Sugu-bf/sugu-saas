"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bike, FileText, KeyRound, Plus, Trash2, User, UserPlus } from "lucide-react";
import {
  Alert,
  Button,
  Checkbox,
  FormErrorSummary,
  FormField,
  IconButton,
  Input,
  PageHeader,
  Select,
  StepActions,
  Stepper,
} from "@/design-system";
import { CourierIdentityFields, CourierVehicleFields } from "@/features/agency/components/courier-fields";
import { AgencyPage } from "@/features/agency/components/page";
import { Panel } from "@/features/agency/components/panel";
import { addCourierDocument } from "@/features/agency/couriers/api";
import { DOCUMENT_TYPE_LABEL, documentLabel } from "@/features/agency/couriers/contract";
import {
  COURIER_FIELDS,
  COURIER_SERVER_FIELD,
  COURIER_STEPS,
  EMPTY_COURIER_FORM,
  registerRequestOf,
  validateCourierForm,
  type CourierField,
  type CourierForm,
} from "@/features/agency/couriers/courier-form";
import { useRegisterCourier } from "@/features/agency/couriers/hooks";
import { describeAgencyFailure } from "@/features/agency/errors";
import { useOneAtATime } from "@/features/agency/single-flight";
import { useAgencyId } from "@/features/agency/session";

const LIST = "/agency/drivers";
const STEPS = COURIER_STEPS.map((step) => ({ id: step.id, label: step.label }));
const DOCUMENT_TYPES = Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => ({ value, label }));
/** The backend takes pictures and PDF up to 5 MB each (AddCourierKycDocumentRequest). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENTS = 4;

type Errors = Partial<Record<CourierField, string>>;

interface PendingDocument {
  key: number;
  type: string;
  number: string;
  expiresOn: string;
  file: File | null;
  error: string | null;
}

/** What is wrong with the file of a document row, or null. A row without a file is not sent. */
function fileProblem(file: File | null): string | null {
  if (!file) return null;
  if (file.size > MAX_FILE_BYTES) return "Ce fichier dépasse 5 Mo.";
  return /\.(jpe?g|png|pdf)$/i.test(file.name) ? null : "Formats acceptés : JPG, PNG ou PDF.";
}

export function CreateDriverForm() {
  const router = useRouter();
  const agencyId = useAgencyId();
  const register = useRegisterCourier();
  const [form, setForm] = useState<CourierForm>(EMPTY_COURIER_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const sequence = useRef(0);
  const top = useRef<HTMLDivElement>(null);

  const step = COURIER_STEPS[stepIndex];
  const errorSteps = [...new Set(Object.keys(errors).map((name) => COURIER_FIELDS[name as CourierField].step))];
  const busy = register.isPending || uploading;

  const set = <Field extends CourierField>(name: Field, value: CourierForm[Field]) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  function showErrors(found: Errors) {
    setErrors(found);
    const first = COURIER_STEPS.findIndex((candidate) => Object.keys(found).some((name) => COURIER_FIELDS[name as CourierField].step === candidate.id));
    if (first >= 0) setStepIndex(first);
    top.current?.scrollIntoView({ block: "start" });
  }

  function goTo(index: number) {
    setStepIndex(index);
    top.current?.scrollIntoView({ block: "start" });
  }

  function next() {
    const found = validateCourierForm(form, "register", step.id);
    if (Object.keys(found).length > 0) showErrors(found);
    else {
      setErrors({});
      goTo(stepIndex + 1);
    }
  }

  const patchDocument = (key: number, patch: Partial<PendingDocument>) =>
    setDocuments((current) => current.map((document) => (document.key === key ? { ...document, ...patch } : document)));

  // One at a time: a second click joins the registration under way.
  const submit = useOneAtATime(async () => {
    const found = validateCourierForm(form, "register");
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }
    // A file that the server would refuse is said before the account is created.
    const checked = documents.map((document) => ({ ...document, error: fileProblem(document.file) }));
    if (checked.some((document) => document.error)) {
      setDocuments(checked);
      return;
    }

    let courierId: string;
    try {
      ({ courierId } = await register.mutateAsync(registerRequestOf(form)));
    } catch (error) {
      const failure = describeAgencyFailure(error);
      const fromServer: Errors = {};
      for (const [name, message] of Object.entries(failure.fields)) {
        const local = COURIER_SERVER_FIELD[name];
        if (local) fromServer[local] = message;
      }
      if (Object.keys(fromServer).length > 0) showErrors(fromServer);
      toast.error(failure.message);
      return;
    }

    // The account exists. Its documents follow, one by one: one that fails does not undo the others.
    const toSend = checked.filter((document) => document.file);
    let failed = 0;
    if (toSend.length > 0 && agencyId) {
      setUploading(true);
      for (const document of toSend) {
        try {
          await addCourierDocument(agencyId, courierId, {
            type: document.type,
            name: documentLabel(document.type),
            number: document.number.trim() || undefined,
            expiresOn: document.expiresOn || undefined,
            file: document.file!,
          });
        } catch {
          failed += 1;
        }
      }
      setUploading(false);
    }

    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    if (failed > 0) {
      toast.warning(`${name} est enregistré, mais ${failed} pièce${failed > 1 ? "s n'ont" : " n'a"} pas pu être envoyée${failed > 1 ? "s" : ""}. Ajoutez-${failed > 1 ? "les" : "la"} depuis sa fiche.`);
    } else {
      toast.success(`${name} est enregistré. Son compte est à vérifier.`);
    }
    router.push(`${LIST}/${courierId}${toSend.length > 0 || failed > 0 ? "#pieces" : ""}`);
  });

  return (
    <AgencyPage className="max-w-3xl">
      <div ref={top} className="scroll-mt-4" />
      <PageHeader
        title="Nouveau livreur"
        description="Créez son compte et rattachez-le à votre agence. Il pourra recevoir des courses une fois ses pièces validées."
        back={{ label: "Retour aux livreurs", href: LIST }}
      />

      <Stepper steps={STEPS} currentStep={stepIndex} errorSteps={errorSteps} label="Étapes du nouveau livreur" />

      <FormErrorSummary errors={errors as Record<string, string>} fields={COURIER_FIELDS} />

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (stepIndex === COURIER_STEPS.length - 1) void submit();
          else next();
        }}
      >
        {step.id === "identity" && (
          <Panel title="Identité" icon={User} tone="info" description="Qui il est, et comment le joindre.">
            <CourierIdentityFields form={form} set={set} errors={errors} mode="register" />
          </Panel>
        )}

        {step.id === "vehicle" && (
          <Panel title="Véhicule" icon={Bike} description="Ce avec quoi il livre.">
            <CourierVehicleFields form={form} set={set} errors={errors} mode="register" />
          </Panel>
        )}

        {step.id === "access" && (
          <>
            <Panel
              title="Pièces justificatives"
              icon={FileText}
              tone="warning"
              description="Facultatif ici : vous pourrez les ajouter depuis sa fiche. Photo ou PDF, 5 Mo au plus."
            >
              <div className="flex flex-col gap-3">
                {documents.length === 0 && <p className="text-body text-foreground-muted">Aucune pièce jointe pour le moment.</p>}
                {documents.map((document, index) => (
                  <fieldset key={document.key} className="flex flex-col gap-3 rounded-control border border-border p-3" disabled={busy}>
                    <legend className="sr-only">Pièce {index + 1}</legend>
                    <div className="flex items-start gap-2">
                      <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
                        <FormField label="Type de pièce">
                          <Select value={document.type} onChange={(event) => patchDocument(document.key, { type: event.target.value })} options={DOCUMENT_TYPES} />
                        </FormField>
                        <FormField label="Numéro">
                          <Input value={document.number} onChange={(event) => patchDocument(document.key, { number: event.target.value })} maxLength={100} autoComplete="off" />
                        </FormField>
                        <FormField label="Expire le">
                          <Input type="date" value={document.expiresOn} onChange={(event) => patchDocument(document.key, { expiresOn: event.target.value })} />
                        </FormField>
                      </div>
                      <IconButton icon={Trash2} label={`Retirer la pièce ${index + 1}`} className="mt-6" onClick={() => setDocuments((current) => current.filter((entry) => entry.key !== document.key))} />
                    </div>
                    {/* A native file field: wired to its label and error by hand. */}
                    <FormField
                      id={`courier-document-file-${document.key}`}
                      label="Fichier"
                      error={document.error}
                      hint={document.file ? undefined : "Sans fichier, cette pièce n'est pas envoyée."}
                    >
                      <input
                        id={`courier-document-file-${document.key}`}
                        type="file"
                        aria-invalid={document.error ? true : undefined}
                        aria-describedby={document.error ? `courier-document-file-${document.key}-error` : undefined}
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          patchDocument(document.key, { file, error: fileProblem(file) });
                        }}
                        className="block w-full text-body text-foreground file:mr-3 file:h-control file:cursor-pointer file:rounded-button file:border file:border-solid file:border-border-strong file:bg-surface file:px-3 file:text-label file:font-medium file:text-foreground hover:file:bg-surface-subtle"
                      />
                    </FormField>
                  </fieldset>
                ))}
                {documents.length < MAX_DOCUMENTS && (
                  <Button
                    icon={Plus}
                    className="self-start"
                    disabled={busy}
                    onClick={() =>
                      setDocuments((current) => [
                        ...current,
                        { key: (sequence.current += 1), type: current.some((entry) => entry.type === "id_card") ? "driver_license" : "id_card", number: "", expiresOn: "", file: null, error: null },
                      ])
                    }
                  >
                    Joindre une pièce
                  </Button>
                )}
              </div>
            </Panel>

            <Panel title="Accès" icon={KeyRound} tone="neutral">
              <div className="flex flex-col gap-4">
                <p className="text-body text-foreground">
                  Le livreur se connecte à l&apos;application avec son numéro de téléphone et un code à usage unique : il n&apos;a pas de mot de passe à retenir.
                </p>
                <div id={COURIER_FIELDS.sendInvitation.id}>
                  <Checkbox
                    checked={form.sendInvitation}
                    onChange={(event) => set("sendInvitation", event.target.checked)}
                    disabled={form.email.trim() === "" || busy}
                    label="Lui envoyer aussi une invitation par e-mail"
                    description={
                      form.email.trim() === ""
                        ? "Indiquez son adresse e-mail à l'étape Identité pour pouvoir l'inviter."
                        : `Un lien pour définir un mot de passe est envoyé à ${form.email.trim()}.`
                    }
                  />
                  {errors.sendInvitation && (
                    <p role="alert" className="mt-1 text-meta text-danger-fg">
                      {errors.sendInvitation}
                    </p>
                  )}
                </div>
                <Alert tone="info" title="Son compte sera « À vérifier »">
                  Il ne reçoit aucune course tant que vous n&apos;avez pas validé ses pièces depuis sa fiche.
                </Alert>
              </div>
            </Panel>
          </>
        )}

        <StepActions
          isFirstStep={stepIndex === 0}
          isLastStep={stepIndex === COURIER_STEPS.length - 1}
          onPrevious={() => goTo(stepIndex - 1)}
          onNext={next}
          onSubmit={submit}
          submitLabel="Enregistrer le livreur"
          submitIcon={UserPlus}
          submitting={busy}
          sticky
        />
      </form>
    </AgencyPage>
  );
}
