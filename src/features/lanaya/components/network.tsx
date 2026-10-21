"use client";

import { forwardRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, MessageCircle, Package, Send, UserPlus, Users } from "lucide-react";
import { Button, Checkbox, Dialog, DialogContent, FormField, Input, Select, Skeleton, Textarea, cn, type InputProps } from "@/design-system";
import { CapacityRing, LEAD_SOURCES, PHONE_PREFIX, Panel } from "./frame";
import { invitationShareText, type LanayaCapacity, type LanayaInvitation, type LanayaLead } from "../contract";
import { describeLanayaFailure } from "../errors";
import { useCreateInvitation, useCreateLead } from "../hooks";

// ============================================================
// Lanaya — pieces of the network pages (prospects, invitations, sellers).
// ============================================================

const NETWORK_TABS = [
  { id: "prospects", label: "Prospects", href: "/lanabaga/prospects", icon: UserPlus },
  { id: "invitations", label: "Invitations", href: "/lanabaga/invitations", icon: Send },
  { id: "sellers", label: "Vendeurs", href: "/lanabaga/sellers", icon: Users },
] as const;

/** The three lists of the network, as on the mockup: links to the pages of the menu, not a second navigation. */
export function NetworkTabs({ current }: { current: (typeof NETWORK_TABS)[number]["id"] }) {
  return (
    <nav aria-label="Votre réseau" className="flex w-full gap-1 rounded-button border border-border bg-surface p-1 sm:w-auto">
      {NETWORK_TABS.map(({ id, label, href, icon: Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            // Three across a 375 px phone: tighter there, as on the mockup from 640 px.
            "inline-flex h-control flex-1 items-center justify-center gap-1.5 rounded-button px-2 text-label whitespace-nowrap sm:flex-none sm:gap-2 sm:px-4",
            // As the menu marks its current entry: dark text on the tint (orange text on it lacks contrast), the icon in orange.
            id === current ? "bg-brand-subtle font-medium text-foreground" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground",
          )}
        >
          <Icon className={cn("size-4 shrink-0", id === current && "text-primary")} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** A national number: the country code is shown, and added by the server when it is not typed. */
export const PhoneInput = forwardRef<HTMLInputElement, InputProps>(function PhoneInput({ className, ...props }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-foreground-muted tabular-nums" aria-hidden="true">
        {PHONE_PREFIX}
      </span>
      <Input ref={ref} type="tel" inputMode="tel" autoComplete="off" placeholder="70 12 34 56" {...props} className={cn("pl-14 tabular-nums", className)} />
    </div>
  );
});

/** Capacity read from the server: active sellers against the effective capacity. */
export function CapacityCard({ capacity, loading }: { capacity?: LanayaCapacity | null; loading?: boolean }) {
  return (
    <Panel title="Capacité actuelle" description="Suivi de votre capacité de vendeurs." icon={Package} tone="success">
      {loading || !capacity ? (
        <Skeleton className="h-24 rounded-control" />
      ) : (
        <div className="flex items-center gap-5">
          <CapacityRing active={capacity.active} effective={capacity.effective} />
          <dl className="flex min-w-0 flex-1 flex-col gap-2 text-body">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-foreground-muted">
                <span className="size-2.5 rounded-full bg-success-icon" aria-hidden="true" />
                Vendeurs actifs
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">{capacity.active}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-foreground-muted">
                <span className="size-2.5 rounded-full bg-surface-hover ring-1 ring-border" aria-hidden="true" />
                Places disponibles
              </dt>
              <dd className="font-semibold text-foreground tabular-nums">{capacity.available}</dd>
            </div>
          </dl>
        </div>
      )}
      {capacity && capacity.active === 0 && (
        <p className="mt-3 text-meta text-foreground-muted">Un vendeur devient « actif » quand SUGU vous confie son accompagnement : cette étape n&apos;est pas encore ouverte.</p>
      )}
    </Panel>
  );
}

// ── Invitation ───────────────────────────────────────────────

const MESSAGE_MAX = 300;

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface InvitationDraft {
  contact_name: string;
  phone: string;
  company_name: string;
  message: string;
}

const EMPTY_DRAFT: InvitationDraft = { contact_name: "", phone: "", company_name: "", message: "" };

/**
 * "Invitation rapide" (mockup 6). The invitation goes out as SUGU's own
 * text with the personal note under it; the link is given once, since the
 * server keeps only its fingerprint.
 */
export function QuickInvitation({ lead, onLeadUsed, id }: { lead?: LanayaLead | null; onLeadUsed?: () => void; id?: string }) {
  const create = useCreateInvitation();
  const [draft, setDraft] = useState<InvitationDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [key, setKey] = useState(newKey);
  const [result, setResult] = useState<{ invitation: LanayaInvitation; link: string | null } | null>(null);
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  // A lead chosen in the list fills the form once; the user can still edit it.
  if (lead && lead.id !== prefilledFor) {
    setPrefilledFor(lead.id);
    setDraft({ contact_name: lead.contact_name, phone: lead.phone, company_name: lead.company_name, message: "" });
    setErrors({});
    setResult(null);
    setKey(newKey());
  }

  const set = (field: keyof InvitationDraft) => (value: string) => setDraft((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const missing: Record<string, string> = {};
    if (draft.contact_name.trim().length < 2) missing.contact_name = "Indiquez le nom du vendeur.";
    if (draft.phone.trim().length < 6) missing.phone = "Indiquez son numéro de téléphone.";
    if (draft.company_name.trim().length < 2) missing.company_name = "Indiquez le nom de son entreprise.";
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;

    try {
      const created = await create.mutateAsync({
        key,
        input: {
          lead_id: lead && prefilledFor === lead.id ? lead.id : null,
          contact_name: draft.contact_name.trim(),
          phone: draft.phone.trim(),
          company_name: draft.company_name.trim(),
          message: draft.message.trim() || null,
        },
      });
      setResult(created);
      setDraft(EMPTY_DRAFT);
      setKey(newKey());
      onLeadUsed?.();
    } catch (error) {
      const failure = describeLanayaFailure(error);
      setErrors(failure.fields);
      toast.error(failure.message);
    }
  }

  return (
    <Panel id={id} title="Invitation rapide" description="Invitez directement un vendeur à rejoindre SUGU." icon={Send} tone="brand">
      {result ? (
        <InvitationResult result={result} onAnother={() => setResult(null)} />
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-3">
          <FormField label="Nom du vendeur" required error={errors.contact_name}>
            <Input value={draft.contact_name} onChange={(e) => set("contact_name")(e.target.value)} placeholder="Ex. Amadou Diallo" maxLength={150} autoComplete="off" />
          </FormField>
          <FormField label="Téléphone" required error={errors.phone} hint={`Sans indicatif, le ${PHONE_PREFIX} est ajouté.`}>
            <PhoneInput value={draft.phone} onChange={(e) => set("phone")(e.target.value)} maxLength={30} />
          </FormField>
          <FormField label="Nom de l'entreprise" required error={errors.company_name}>
            <Input value={draft.company_name} onChange={(e) => set("company_name")(e.target.value)} placeholder="Ex. Boutique Diallo" maxLength={150} autoComplete="off" />
          </FormField>
          <FormField
            label="Mot personnel"
            error={errors.message}
            hint={
              <span className="flex justify-between gap-3">
                <span>Ajouté sous le texte de SUGU. Les liens et numéros sont retirés.</span>
                <span className="shrink-0 tabular-nums" aria-live="polite">
                  {draft.message.length}/{MESSAGE_MAX}
                </span>
              </span>
            }
          >
            <Textarea value={draft.message} onChange={(e) => set("message")(e.target.value.slice(0, MESSAGE_MAX))} rows={3} placeholder="Ex. Je vous accompagne pour ouvrir votre boutique." />
          </FormField>
          <Button type="submit" variant="primary" icon={Send} loading={create.isPending} className="w-full">
            Créer l&apos;invitation
          </Button>
        </form>
      )}
    </Panel>
  );
}

function InvitationResult({ result, onAnother }: { result: { invitation: LanayaInvitation; link: string | null }; onAnother: () => void }) {
  const { invitation, link } = result;
  const text = link ? invitationShareText(invitation.company_name, link, invitation.message) : null;
  const whatsapp = text ? `https://wa.me/${invitation.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}` : null;

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message d'invitation copié.");
    } catch {
      toast.error("La copie n'a pas été possible. Sélectionnez le message pour le recopier.");
    }
  }

  return (
    <div className="flex flex-col gap-3" role="status">
      <p className="text-body font-medium text-foreground">Invitation créée pour {invitation.company_name}.</p>
      {text ? (
        <>
          <p className="text-label font-normal text-foreground-muted">Envoyez ce message au vendeur. Le lien ne sera plus affiché : SUGU n&apos;en garde qu&apos;une empreinte.</p>
          <output className="block rounded-control border border-border bg-surface-subtle p-3 text-label font-normal break-words whitespace-pre-line text-foreground select-all">{text}</output>
          <div className="flex flex-wrap gap-2">
            <Button size="compact" icon={Copy} onClick={copy}>
              Copier le message
            </Button>
            {whatsapp && (
              <Button asChild size="compact" icon={MessageCircle}>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  Envoyer par WhatsApp
                </a>
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="text-label font-normal text-foreground-muted">Cette invitation existait déjà : son lien a été donné à sa création.</p>
      )}
      <Button variant="quiet" size="compact" onClick={onAnother} className="self-start">
        Préparer une autre invitation
      </Button>
    </div>
  );
}

// ── Prospect ─────────────────────────────────────────────────

interface LeadDraft {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  sector: string;
  declared_source: string;
  relation_to_lanabaga: string;
  contact_permission: boolean;
}

const EMPTY_LEAD: LeadDraft = {
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  city: "",
  sector: "",
  declared_source: "",
  relation_to_lanabaga: "",
  contact_permission: false,
};

/** "Ajouter un prospect": the permission to contact is a box the Lanabaga ticks, never ticked for them. */
export function AddLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateLead();
  const [draft, setDraft] = useState<LeadDraft>(EMPTY_LEAD);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof LeadDraft>(field: K, value: LeadDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));

  function close(next: boolean) {
    if (!next) {
      setDraft(EMPTY_LEAD);
      setErrors({});
    }
    onOpenChange(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const missing: Record<string, string> = {};
    if (draft.company_name.trim().length < 2) missing.company_name = "Indiquez le nom de l'entreprise.";
    if (draft.contact_name.trim().length < 2) missing.contact_name = "Indiquez le nom du contact.";
    if (draft.phone.trim().length < 6) missing.phone = "Indiquez un numéro de téléphone.";
    if (draft.city.trim().length < 2) missing.city = "Indiquez la ville.";
    if (!draft.declared_source) missing.declared_source = "Indiquez comment vous l'avez connu.";
    if (!draft.contact_permission) missing.contact_permission = "Confirmez que cette personne accepte d'être contactée.";
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;

    try {
      await create.mutateAsync({
        company_name: draft.company_name.trim(),
        contact_name: draft.contact_name.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim() || null,
        city: draft.city.trim(),
        sector: draft.sector.trim() || null,
        declared_source: draft.declared_source,
        relation_to_lanabaga: draft.relation_to_lanabaga.trim() || null,
        contact_permission: true,
      });
      toast.success("Prospect ajouté.");
      close(false);
    } catch (error) {
      const failure = describeLanayaFailure(error);
      setErrors(failure.fields);
      toast.error(failure.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Ajouter un prospect"
        description="Un vendeur que vous connaissez et qui accepte d'être contacté."
        size="lg"
        footer={
          <>
            <Button onClick={() => close(false)}>Annuler</Button>
            <Button type="submit" form="lanaya-lead-form" variant="primary" icon={UserPlus} loading={create.isPending}>
              Ajouter le prospect
            </Button>
          </>
        }
      >
        <form id="lanaya-lead-form" noValidate onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Nom de l'entreprise" required error={errors.company_name}>
              <Input value={draft.company_name} onChange={(e) => set("company_name", e.target.value)} maxLength={150} autoComplete="off" />
            </FormField>
            <FormField label="Nom du contact" required error={errors.contact_name}>
              <Input value={draft.contact_name} onChange={(e) => set("contact_name", e.target.value)} maxLength={150} autoComplete="off" />
            </FormField>
            <FormField label="Téléphone" required error={errors.phone} hint={`Sans indicatif, le ${PHONE_PREFIX} est ajouté.`}>
              <PhoneInput value={draft.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
            </FormField>
            <FormField label="E-mail" error={errors.email}>
              <Input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} maxLength={255} autoComplete="off" />
            </FormField>
            <FormField label="Ville" required error={errors.city}>
              <Input value={draft.city} onChange={(e) => set("city", e.target.value)} maxLength={100} placeholder="Ex. Ouagadougou" autoComplete="off" />
            </FormField>
            <FormField label="Secteur d'activité" error={errors.sector}>
              <Input value={draft.sector} onChange={(e) => set("sector", e.target.value)} maxLength={100} placeholder="Ex. Électronique" autoComplete="off" />
            </FormField>
            <FormField label="Comment l'avez-vous connu ?" required error={errors.declared_source}>
              <Select value={draft.declared_source} onChange={(e) => set("declared_source", e.target.value)} options={LEAD_SOURCES} placeholder="Choisir une source" />
            </FormField>
            <FormField label="Votre lien avec lui" error={errors.relation_to_lanabaga} hint="Facultatif. Un lien familial ou financier est à déclarer.">
              <Input value={draft.relation_to_lanabaga} onChange={(e) => set("relation_to_lanabaga", e.target.value)} maxLength={255} autoComplete="off" />
            </FormField>
          </div>
          <Checkbox
            checked={draft.contact_permission}
            onChange={(e) => set("contact_permission", e.target.checked)}
            label="Cette personne accepte d'être contactée au sujet de SUGU."
            description="Vous l'attestez. Le prospect reste visible de vous seul et de l'équipe SUGU."
            aria-invalid={errors.contact_permission ? true : undefined}
          />
          {errors.contact_permission && <p className="text-label font-normal text-danger-fg">{errors.contact_permission}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
