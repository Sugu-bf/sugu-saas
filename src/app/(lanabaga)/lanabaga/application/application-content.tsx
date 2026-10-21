"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Clock, FileSignature, LayoutDashboard, Save, Send, Undo2 } from "lucide-react";
import { Alert, Badge, Button, Card, ConfirmDialog, ErrorState, FormActions, FormField, Input, PageHeader, Select, Skeleton, StatusBadge, Stepper, Textarea, type StepDefinition } from "@/design-system";
import { useSession } from "@/features/auth";
import { ConsentList, DocumentsPanel, HistoryList, ProvisionalNotice, TagInput, documentsProgress } from "@/features/lanaya/components/application";
import { EXPERIENCE_BANDS, LanayaPage, Panel, REFERENCE_RELATIONS, formatDate } from "@/features/lanaya/components/frame";
import { PhoneInput } from "@/features/lanaya/components/network";
import type { ApplicationInput, LanayaMe } from "@/features/lanaya/contract";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useLanayaMe, useSaveApplication, useStartApplication, useSubmitApplication, useWithdrawApplication } from "@/features/lanaya/hooks";

// ============================================================
// Candidature Lanabaga (maquette 7), in the order of the mission:
// Profil, Identité, Références, Validation, then the agreement, which
// comes only after the admission. The candidate never sets a state
// other than "submitted" and "withdrawn": the server decides the rest.
// ============================================================

const STEPS: StepDefinition[] = [
  { id: "profile", label: "Profil" },
  { id: "identity", label: "Identité" },
  { id: "references", label: "Références" },
  { id: "validation", label: "Validation" },
  { id: "agreement", label: "Convention" },
];

const DESCRIPTION = "Complétez votre candidature pour rejoindre le programme Lanaya comme partenaire indépendant de SUGU.";

interface ProfileDraft {
  country_code: string;
  city: string;
  specialties: string[];
  experience_band: string;
  structure_name: string;
  conflicts_declared: string;
}

interface ReferenceDraft {
  full_name: string;
  company: string;
  phone: string;
  relation: string;
}

const REGIONS = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["fr"], { type: "region" }) : null;

/** "BF" → "Burkina Faso". */
function countryName(code: string): string {
  try {
    return REGIONS?.of(code) ?? code;
  } catch {
    return code;
  }
}

const EMPTY_REFERENCE: ReferenceDraft = { full_name: "", company: "", phone: "", relation: "" };

function profileErrors(draft: ProfileDraft, needCountry: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (needCountry && !draft.country_code) errors.country_code = "Choisissez votre pays.";
  if (draft.city.trim().length < 2) errors.city = "Indiquez votre ville.";
  if (draft.specialties.length === 0) errors.specialties = "Ajoutez au moins une spécialité.";
  if (!draft.experience_band) errors.experience_band = "Indiquez vos années d'expérience.";
  return errors;
}

const referenceComplete = (reference: ReferenceDraft) =>
  reference.full_name.trim().length >= 2 && reference.company.trim().length >= 2 && reference.phone.trim().length >= 6 && reference.relation !== "";

function toInput(draft: ProfileDraft): ApplicationInput {
  return {
    city: draft.city.trim(),
    specialties: draft.specialties,
    experience_band: draft.experience_band || null,
    structure_name: draft.structure_name.trim() || null,
    conflicts_declared: draft.conflicts_declared.trim() || null,
  };
}

/** Share of what the submission requires that the server already holds. */
function completion(me: LanayaMe): number {
  const profile = me.profile;
  if (!profile) return 0;
  const documents = documentsProgress(me);
  const fields = [profile.city.length >= 2, profile.specialties.length > 0, Boolean(profile.experience_band)];
  const references = Math.min(me.references.length, me.requirements.references);
  const consents = me.consents.filter((consent) => consent.given).length;
  const total = fields.length + documents.total + me.requirements.references + me.consents.length;
  const done = fields.filter(Boolean).length + documents.done + references + consents;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function ApplicationContent() {
  const me = useLanayaMe();

  if (me.isError) {
    return (
      <LanayaPage>
        <PageHeader title="Candidature Lanabaga" description={DESCRIPTION} hideDescriptionOnPhone />
        <Card flush>
          <ErrorState title="Votre candidature n'a pas pu être chargée" description={describeLanayaFailure(me.error).message} onRetry={() => me.refetch()} retrying={me.isFetching} />
        </Card>
      </LanayaPage>
    );
  }

  if (!me.data) {
    return (
      <LanayaPage aria-busy>
        <p role="status" className="sr-only">
          Chargement de votre candidature…
        </p>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-16 rounded-panel" />
        <Skeleton className="h-96 rounded-panel" />
      </LanayaPage>
    );
  }

  const profile = me.data.profile;
  if (!profile) return <StartApplication me={me.data} />;
  if (profile.editable) return <ApplicationWizard key={profile.id} me={me.data} />;
  return <ApplicationStatusView me={me.data} />;
}

// ── Account facts (read only) ────────────────────────────────

function AccountFields() {
  const { data: user } = useSession();
  return (
    <>
      <FormField label="Nom complet" hint="Celui de votre compte SUGU.">
        <Input value={user?.name ?? ""} readOnly disabled />
      </FormField>
      <FormField label="E-mail" hint="Celui de votre compte SUGU.">
        <Input value={user?.email ?? ""} readOnly disabled />
      </FormField>
    </>
  );
}

function ProfileFields({ draft, set, errors, countries, countryLocked, countryName }: { draft: ProfileDraft; set: <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => void; errors: Record<string, string>; countries: { code: string; name: string }[]; countryLocked: boolean; countryName?: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <AccountFields />
      <FormField label="Ville" required error={errors.city}>
        <Input value={draft.city} onChange={(e) => set("city", e.target.value)} maxLength={100} placeholder="Ex. Ouagadougou" autoComplete="address-level2" />
      </FormField>
      <FormField label="Pays" required error={errors.country_code} hint={countryLocked ? "Le pays ne change plus une fois la candidature commencée." : "Seuls les pays ouverts au programme sont proposés."}>
        {countryLocked ? (
          <Input value={countryName ?? draft.country_code} readOnly disabled />
        ) : (
          <Select value={draft.country_code} onChange={(e) => set("country_code", e.target.value)} options={countries.map((country) => ({ value: country.code, label: country.name }))} placeholder="Choisir un pays" />
        )}
      </FormField>
      <FormField label="Spécialités" required error={errors.specialties} hint="Les familles de produits que vous connaissez. Huit au maximum." className="md:col-span-2">
        <TagInput value={draft.specialties} onChange={(next) => set("specialties", next)} invalid={Boolean(errors.specialties)} />
      </FormField>
      <FormField label="Années d'expérience" required error={errors.experience_band}>
        <Select value={draft.experience_band} onChange={(e) => set("experience_band", e.target.value)} options={EXPERIENCE_BANDS} placeholder="Choisir" />
      </FormField>
      <FormField label="Nom de votre structure" error={errors.structure_name} hint="Facultatif, si vous travaillez au sein d'une entreprise.">
        <Input value={draft.structure_name} onChange={(e) => set("structure_name", e.target.value)} maxLength={150} />
      </FormField>
      <FormField label="Liens à déclarer" error={errors.conflicts_declared} hint="Facultatif. Un lien familial ou financier avec un vendeur ou un employé de SUGU." className="md:col-span-2">
        <Textarea value={draft.conflicts_declared} onChange={(e) => set("conflicts_declared", e.target.value)} maxLength={1000} rows={3} />
      </FormField>
    </div>
  );
}

function AgreementCard() {
  return (
    <Card className="flex flex-wrap items-center gap-4">
      <FileSignature className="size-6 shrink-0 text-foreground-subtle" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-64">
        <h2 className="text-section-title text-foreground">Convention Lanabaga</h2>
        <p className="mt-0.5 text-body text-foreground-muted">Une fois votre candidature admise, l&apos;équipe SUGU vous remet la convention à signer. Votre compte s&apos;ouvre quand elle est signée et contrôlée.</p>
      </div>
      <Badge tone="neutral" icon={Clock}>
        Signature après validation
      </Badge>
    </Card>
  );
}

// ── No application yet ───────────────────────────────────────

function StartApplication({ me }: { me: LanayaMe }) {
  const start = useStartApplication();
  const [draft, setDraft] = useState<ProfileDraft>({ country_code: me.countries.length === 1 ? me.countries[0].code : "", city: "", specialties: [], experience_band: "", structure_name: "", conflicts_declared: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));

  async function submit() {
    const found = profileErrors(draft, true);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await start.mutateAsync({ ...toInput(draft), country_code: draft.country_code });
      toast.success("Candidature commencée. Déposez maintenant vos pièces.");
    } catch (error) {
      const failure = describeLanayaFailure(error);
      setErrors(failure.fields);
      toast.error(failure.message);
    }
  }

  return (
    <LanayaPage className="pb-4">
      <PageHeader title="Candidature Lanabaga" description={DESCRIPTION} hideDescriptionOnPhone />
      <Stepper steps={STEPS} currentStep={0} label="Étapes de la candidature" />
      {me.countries.length === 0 ? (
        <Alert tone="info" title="Le programme n'accepte pas de candidature pour l'instant">
          Les candidatures ouvrent pays par pays. Revenez plus tard : rien n&apos;a été enregistré.
        </Alert>
      ) : (
        <>
          <Panel title="Informations professionnelles" description="Renseignez votre activité pour que SUGU puisse examiner votre candidature.">
            <ProfileFields draft={draft} set={set} errors={errors} countries={me.countries} countryLocked={false} />
          </Panel>
          <AgreementCard />
          <ProvisionalNotice />
          <FormActions sticky>
            <Button variant="primary" trailingIcon={ArrowRight} loading={start.isPending} onClick={submit}>
              Commencer ma candidature
            </Button>
          </FormActions>
        </>
      )}
    </LanayaPage>
  );
}

// ── Draft, or a complement asked by SUGU ─────────────────────

function ApplicationWizard({ me }: { me: LanayaMe }) {
  const profile = me.profile!;
  const save = useSaveApplication();
  const submitApplication = useSubmitApplication();
  const requiredReferences = Math.max(me.requirements.references, 0);

  const [draft, setDraft] = useState<ProfileDraft>({
    country_code: profile.country_code,
    city: profile.city,
    specialties: profile.specialties,
    experience_band: profile.experience_band ?? "",
    structure_name: profile.structure_name ?? "",
    conflicts_declared: profile.conflicts_declared ?? "",
  });
  const [references, setReferences] = useState<ReferenceDraft[]>(() =>
    Array.from({ length: Math.max(requiredReferences, me.references.length) }, (_, index) => {
      const saved = me.references[index];
      return saved ? { full_name: saved.full_name, company: saved.company, phone: saved.phone, relation: saved.relation.value } : EMPTY_REFERENCE;
    }),
  );
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(() => {
    if (Object.keys(profileErrors(draft, false)).length > 0) return 0;
    const documents = documentsProgress(me);
    if (documents.done < documents.total) return 1;
    if (me.references.length < requiredReferences) return 2;
    return 3;
  });

  const set = <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const setReference = (index: number, field: keyof ReferenceDraft, value: string) =>
    setReferences((current) => current.map((reference, i) => (i === index ? { ...reference, [field]: value } : reference)));

  const documents = documentsProgress(me);
  const percent = completion(me);

  async function persist(): Promise<boolean> {
    try {
      await save.mutateAsync({ ...toInput(draft), references: references.filter(referenceComplete).map((r) => ({ ...r, full_name: r.full_name.trim(), company: r.company.trim(), phone: r.phone.trim() })) });
      return true;
    } catch (error) {
      const failure = describeLanayaFailure(error);
      setErrors(failure.fields);
      toast.error(failure.message);
      return false;
    }
  }

  function stepErrors(index: number): Record<string, string> {
    if (index === 0) return profileErrors(draft, false);
    if (index === 1 && documents.done < documents.total) return { documents: "Déposez chacune des pièces obligatoires." };
    if (index === 2) {
      const found: Record<string, string> = {};
      references.forEach((reference, i) => {
        if (i < requiredReferences && !referenceComplete(reference)) found[`reference_${i}`] = `Complétez la référence ${i + 1}.`;
      });
      return found;
    }
    if (index === 3) {
      const missing = me.consents.filter((consent) => !consent.given && !consents[consent.key]);
      if (missing.length > 0) return { consents: "Cochez chacun des engagements pour soumettre." };
    }
    return {};
  }

  async function saveDraft() {
    if (await persist()) toast.success("Brouillon enregistré.");
  }

  async function next() {
    const found = stepErrors(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step === 0 || step === 2) {
      if (!(await persist())) return;
    }
    setStep((current) => Math.min(current + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    // Every step, not only the last one: a box ticked does not make up for a missing document.
    for (const index of [0, 1, 2, 3]) {
      const found = stepErrors(index);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        setStep(index);
        return;
      }
    }
    if (!(await persist())) return;
    try {
      await submitApplication.mutateAsync(Object.fromEntries(me.consents.map((consent) => [consent.key, true])));
      toast.success("Candidature soumise : SUGU va l'examiner.");
    } catch (error) {
      toast.error(describeLanayaFailure(error).message);
    }
  }

  const infoRequested = profile.application_status.value === "info_requested";

  return (
    <LanayaPage className="pb-4">
      <PageHeader
        title="Candidature Lanabaga"
        titleAddon={<Badge tone={percent === 100 ? "success" : "info"}>{`Profil complété à ${percent} %`}</Badge>}
        description={DESCRIPTION}
        hideDescriptionOnPhone
      />

      {infoRequested && (
        <Alert tone="warning" title="SUGU vous demande un complément">
          {profile.decision_note ?? "Complétez votre dossier puis soumettez-le de nouveau."}
        </Alert>
      )}

      <Stepper
        steps={STEPS}
        currentStep={step}
        completedSteps={[0, 1, 2].filter((index) => index !== step && Object.keys(stepErrors(index)).length === 0).map((index) => STEPS[index].id)}
        label="Étapes de la candidature"
        onStepSelect={(index) => {
          setErrors({});
          setStep(index);
        }}
      />

      {step === 0 && (
        <Panel title="Informations professionnelles" description="Renseignez votre activité pour que SUGU puisse examiner votre candidature.">
          <ProfileFields draft={draft} set={set} errors={errors} countries={[]} countryLocked countryName={countryName(profile.country_code)} />
        </Panel>
      )}

      {step === 1 && (
        <>
          {errors.documents && <Alert tone="danger" title={errors.documents} />}
          <DocumentsPanel me={me} editable />
        </>
      )}

      {step === 2 && (
        <Panel title="Références" description={`Les coordonnées de ${requiredReferences > 1 ? `${requiredReferences} personnes` : "une personne"} qui peuvent attester de votre sérieux. SUGU peut les appeler.`}>
          {requiredReferences === 0 && references.length === 0 ? (
            <p className="text-body text-foreground-muted">Aucune référence n&apos;est demandée pour votre pays.</p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {references.map((reference, index) => {
                const saved = me.references[index];
                return (
                  <fieldset key={index} className="rounded-control border border-border p-3">
                    <legend className="flex items-center gap-2 px-1 text-body font-semibold text-foreground">
                      Référence {index + 1}
                      {saved ? <StatusBadge domain="lanayaReference" code={saved.verification_status.value} /> : <Badge tone="warning">À compléter</Badge>}
                    </legend>
                    {errors[`reference_${index}`] && <p className="mb-2 text-label font-normal text-danger-fg">{errors[`reference_${index}`]}</p>}
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Nom complet" required>
                        <Input value={reference.full_name} onChange={(e) => setReference(index, "full_name", e.target.value)} maxLength={150} autoComplete="off" />
                      </FormField>
                      <FormField label="Entreprise" required>
                        <Input value={reference.company} onChange={(e) => setReference(index, "company", e.target.value)} maxLength={150} autoComplete="off" />
                      </FormField>
                      <FormField label="Téléphone" required>
                        <PhoneInput value={reference.phone} onChange={(e) => setReference(index, "phone", e.target.value)} maxLength={30} />
                      </FormField>
                      <FormField label="Relation" required>
                        <Select value={reference.relation} onChange={(e) => setReference(index, "relation", e.target.value)} options={REFERENCE_RELATIONS} placeholder="Choisir" />
                      </FormField>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {step === 3 && (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel title="Récapitulatif" description="Ce que SUGU recevra.">
            <ul className="flex flex-col gap-2 text-body">
              <RecapRow done={Object.keys(profileErrors(draft, false)).length === 0} label="Informations professionnelles" onEdit={() => setStep(0)} />
              <RecapRow done={documents.done === documents.total} label={`Pièces déposées : ${documents.done} sur ${documents.total}`} onEdit={() => setStep(1)} />
              <RecapRow done={references.filter(referenceComplete).length >= requiredReferences} label={`Références : ${Math.min(references.filter(referenceComplete).length, requiredReferences)} sur ${requiredReferences}`} onEdit={() => setStep(2)} />
            </ul>
          </Panel>
          <Panel title="Vos engagements" description="Chaque engagement se coche séparément. Rien n'est coché à votre place.">
            {errors.consents && <p className="mb-2 text-label font-normal text-danger-fg">{errors.consents}</p>}
            <ConsentList consents={me.consents} checked={consents} onChange={(key, value) => setConsents((current) => ({ ...current, [key]: value }))} disabled={submitApplication.isPending} />
          </Panel>
        </div>
      )}

      <AgreementCard />
      <ProvisionalNotice />

      <FormActions sticky>
        {step > 0 && (
          <Button variant="quiet" onClick={() => setStep((current) => current - 1)} disabled={save.isPending || submitApplication.isPending} className="max-md:hidden">
            Précédent
          </Button>
        )}
        <Button icon={Save} onClick={saveDraft} loading={save.isPending && !submitApplication.isPending} disabled={submitApplication.isPending}>
          {/* Beside « Soumettre ma candidature », the long label does not fit a 375 px phone. */}
          <span className="sm:hidden">Enregistrer</span>
          <span className="max-sm:hidden">Enregistrer le brouillon</span>
        </Button>
        {step < 3 ? (
          <Button variant="primary" trailingIcon={ArrowRight} onClick={next} loading={save.isPending}>
            Continuer
          </Button>
        ) : step === 3 ? (
          <Button variant="primary" icon={Send} onClick={submit} loading={submitApplication.isPending}>
            Soumettre ma candidature
          </Button>
        ) : (
          <Button variant="primary" icon={Send} onClick={() => setStep(3)}>
            Revenir à la validation
          </Button>
        )}
      </FormActions>
    </LanayaPage>
  );
}

function RecapRow({ done, label, onEdit }: { done: boolean; label: string; onEdit: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-control border border-border p-3">
      <span className="flex min-w-0 items-center gap-2">
        <Badge tone={done ? "success" : "warning"}>{done ? "Complet" : "À compléter"}</Badge>
        <span className="min-w-0 text-foreground">{label}</span>
      </span>
      <Button size="compact" variant="quiet" onClick={onEdit}>
        Modifier
      </Button>
    </li>
  );
}

// ── Submitted, decided, withdrawn ────────────────────────────

function ApplicationStatusView({ me }: { me: LanayaMe }) {
  const profile = me.profile!;
  const withdraw = useWithdrawApplication();
  const [confirming, setConfirming] = useState(false);
  const status = profile.application_status.value;
  const canWithdraw = status === "submitted" || status === "in_review";
  const stepIndex = status === "approved" ? 4 : 3;

  async function confirmWithdraw() {
    try {
      await withdraw.mutateAsync();
      toast.success("Candidature retirée.");
    } catch (error) {
      toast.error(describeLanayaFailure(error).message);
      throw error;
    }
  }

  return (
    <LanayaPage>
      <PageHeader
        title="Candidature Lanabaga"
        titleAddon={<StatusBadge domain="lanayaApplication" code={status} />}
        description={`Dossier ${profile.public_code}${profile.submitted_at ? `, soumis le ${formatDate(profile.submitted_at)}` : ""}.`}
        moreActions={canWithdraw ? [{ label: "Retirer ma candidature", icon: Undo2, onSelect: () => setConfirming(true), tone: "danger" }] : []}
      />

      <Stepper steps={STEPS} currentStep={stepIndex} completedSteps={STEPS.slice(0, stepIndex).map((s) => s.id)} label="Étapes de la candidature" />

      <StatusAlert me={me} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DocumentsPanel me={me} editable={false} title="Vos pièces" description="Les pièces jointes à votre candidature et leur examen." />
        <Panel title="Historique" description="Les étapes de votre dossier.">
          <HistoryList history={me.history} />
        </Panel>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Retirer votre candidature ?"
        description="SUGU arrêtera son examen. Vos pièces sont conservées le temps prévu par la politique de conservation, puis supprimées."
        confirmLabel="Retirer ma candidature"
        confirmIcon={Undo2}
        tone="danger"
        onConfirm={confirmWithdraw}
      />
    </LanayaPage>
  );
}

function StatusAlert({ me }: { me: LanayaMe }) {
  const profile = me.profile!;
  switch (profile.application_status.value) {
    case "submitted":
    case "in_review":
      return (
        <Alert tone="info" title="Votre candidature est en cours d'examen">
          L&apos;équipe SUGU vérifie votre identité et vos références. Vous serez prévenu de sa décision ; vous ne pouvez plus modifier le dossier pendant l&apos;examen.
        </Alert>
      );
    case "approved":
      return profile.can_work ? (
        <Alert
          tone="success"
          title="Vous êtes Lanabaga"
          actions={
            <Button asChild size="compact" variant="primary" icon={LayoutDashboard}>
              <Link href="/lanabaga/dashboard">Ouvrir mon tableau de bord</Link>
            </Button>
          }
        >
          Votre candidature est admise et votre convention est en vigueur.
        </Alert>
      ) : profile.account_status.value === "suspended" ? (
        <Alert tone="danger" title="Votre compte Lanabaga est suspendu">
          Vous ne pouvez plus inviter de vendeurs pour l&apos;instant. Contactez l&apos;équipe SUGU pour en connaître la raison.
        </Alert>
      ) : (
        <Alert tone="success" title="Votre candidature est admise">
          Dernière étape : l&apos;équipe SUGU vous remet la convention Lanabaga. Votre compte s&apos;ouvre dès qu&apos;elle est signée et contrôlée.
        </Alert>
      );
    case "rejected":
      return (
        <Alert tone="danger" title="Votre candidature n'a pas été retenue">
          {profile.decision_note ?? "Contactez l'équipe SUGU pour en savoir plus."}
        </Alert>
      );
    case "withdrawn":
      return (
        <Alert tone="info" title="Vous avez retiré votre candidature">
          Pour candidater de nouveau, contactez l&apos;équipe SUGU.
        </Alert>
      );
    default:
      return null;
  }
}
