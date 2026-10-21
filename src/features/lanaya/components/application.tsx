"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Building2, Camera, Eye, FileText, IdCard, Info, Upload, X, type LucideIcon } from "lucide-react";
import { Alert, Button, Checkbox, IconButton, Input, StatusBadge, cn } from "@/design-system";
import { Panel, formatDateTime } from "./frame";
import { ACCEPTED_FILES, documentFileHref, fileRefusal, type LanabagaDocument, type LanayaConsent, type LanayaMe } from "../contract";
import { describeLanayaFailure } from "../errors";
import { useUploadLanayaDocument } from "../hooks";

// ============================================================
// Lanaya — pieces of the application (wizard, documents, compliance).
// ============================================================

const DOCUMENT_COPY: Record<string, { icon: LucideIcon; hint: string }> = {
  identity: { icon: IdCard, hint: "Carte nationale d'identité, passeport ou titre de séjour" },
  professional_photo: { icon: Camera, hint: "Photo nette de votre visage, de face" },
  reference_letter: { icon: FileText, hint: "Lettre d'un partenaire ou d'un client" },
  structure_registration: { icon: Building2, hint: "Registre de commerce de votre structure" },
};

/** The latest document of each type, the ones the server still considers. */
function latestByType(documents: LanabagaDocument[]): Map<string, LanabagaDocument> {
  const map = new Map<string, LanabagaDocument>();
  for (const document of documents) {
    if (document.review_status.value === "superseded") continue;
    const current = map.get(document.document_type.value);
    if (!current || (document.uploaded_at ?? "") > (current.uploaded_at ?? "")) map.set(document.document_type.value, document);
  }
  return map;
}

/** A required document counts once it has been sent and not refused. */
export function documentsProgress(me: LanayaMe): { done: number; total: number } {
  const latest = latestByType(me.documents);
  const total = me.requirements.documents.length;
  const done = me.requirements.documents.filter((type) => {
    const status = latest.get(type.value)?.review_status.value;
    return status === "pending" || status === "approved";
  }).length;
  return { done, total };
}

/**
 * The documents the country's policy requires, each with its review state.
 * Files are sent through the relay to the private disk; a file is opened
 * through the relay too, never from the API host.
 */
export function DocumentsPanel({ me, editable, title = "Documents requis", description = "Téléchargez les documents nécessaires pour valider votre candidature." }: { me: LanayaMe; editable: boolean; title?: string; description?: string }) {
  const latest = latestByType(me.documents);
  const required = me.requirements.documents.map((type) => type.value);
  // Documents sent for a type the policy no longer asks for stay visible.
  const extra = [...latest.values()].filter((document) => !required.includes(document.document_type.value));
  const rows = [
    ...me.requirements.documents.map((type) => ({ type: type.value, label: type.label, required: true, document: latest.get(type.value) ?? null })),
    ...extra.map((document) => ({ type: document.document_type.value, label: document.document_type.label, required: false, document })),
  ];

  return (
    <Panel title={title} description={description}>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <DocumentRow key={row.type} {...row} editable={editable} />
        ))}
      </ul>
      {rows.length === 0 && <p className="text-body text-foreground-muted">Aucune pièce n&apos;est demandée pour votre pays.</p>}
      <Alert tone="info" title="Formats acceptés : PDF, JPG, PNG (5 Mo maximum par fichier)" className="mt-3">
        Vos pièces sont conservées sur un espace privé de SUGU. Seule l&apos;équipe Risk &amp; Compliance peut les consulter.
      </Alert>
    </Panel>
  );
}

function DocumentRow({ type, label, required, document, editable }: { type: string; label: string; required: boolean; document: LanabagaDocument | null; editable: boolean }) {
  const upload = useUploadLanayaDocument();
  const input = useRef<HTMLInputElement>(null);
  const copy = DOCUMENT_COPY[type] ?? { icon: FileText, hint: "" };
  const Icon = copy.icon;
  const status = document?.review_status.value;
  const canSend = editable && status !== "approved";

  async function send(file: File | undefined) {
    if (!file) return;
    const refusal = fileRefusal(file);
    if (refusal) {
      toast.error(refusal);
      return;
    }
    try {
      await upload.mutateAsync({ type, file });
      toast.success(`${label} reçue.`);
    } catch (error) {
      toast.error(describeLanayaFailure(error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-control border border-border p-3">
      <Icon className="size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-body font-medium text-foreground">
          {label}
          {required && (
            <span className="text-danger-fg" aria-hidden="true">
              {" "}
              *
            </span>
          )}
          {required && <span className="sr-only"> (obligatoire)</span>}
        </p>
        {copy.hint && <p className="text-meta text-foreground-muted">{copy.hint}</p>}
        {document?.rejection_reason && status === "rejected" && <p className="mt-1 text-meta text-danger-fg">Refusée : {document.rejection_reason}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {document ? <StatusBadge domain="lanayaDocument" code={document.review_status.value} /> : <span className="text-label font-normal text-foreground-muted">À déposer</span>}
        {document && (
          <Button asChild size="compact" variant="quiet" icon={Eye}>
            <a href={documentFileHref(document.id)} target="_blank" rel="noopener noreferrer" title={document.file_name}>
              <span className="max-w-36 truncate">{document.file_name}</span>
            </a>
          </Button>
        )}
        {canSend && (
          <>
            <input ref={input} type="file" accept={ACCEPTED_FILES} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => send(e.target.files?.[0])} />
            <Button size="compact" variant={document ? "secondary" : "outline"} icon={Upload} loading={upload.isPending} onClick={() => input.current?.click()}>
              {document ? "Remplacer" : "Télécharger"}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/** Specialties as tags: typed, then Enter or a comma. */
export function TagInput({ value, onChange, max = 8, id, invalid }: { value: string[]; onChange: (next: string[]) => void; max?: number; id?: string; invalid?: boolean }) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (tag.length < 2 || tag.length > 60) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Spécialités choisies">
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-badge border border-border bg-surface-subtle py-0.5 pr-0.5 pl-2.5 text-label font-normal text-foreground">
              {tag}
              <IconButton icon={X} label={`Retirer ${tag}`} size="compact" tooltip={false} className="size-6 touch:size-8" onClick={() => onChange(value.filter((t) => t !== tag))} />
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        disabled={value.length >= max}
        placeholder={value.length >= max ? `${max} spécialités au maximum` : "Ex. Électronique, puis Entrée"}
        aria-invalid={invalid || undefined}
        maxLength={60}
      />
    </div>
  );
}

/** Each consent is its own box, never ticked in advance, with its version. */
export function ConsentList({ consents, checked, onChange, disabled }: { consents: LanayaConsent[]; checked: Record<string, boolean>; onChange: (key: string, value: boolean) => void; disabled?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {consents.map((consent) => (
        <li key={consent.key} className="rounded-control border border-border p-3">
          <Checkbox
            checked={consent.given || checked[consent.key] === true}
            disabled={disabled || consent.given}
            onChange={(e) => onChange(consent.key, e.target.checked)}
            label={consent.text}
            description={consent.given ? `Accepté · version ${consent.version}` : `Version ${consent.version}`}
          />
        </li>
      ))}
    </ul>
  );
}

const EVENT_LABELS: Record<string, string> = {
  "application.created": "Candidature commencée",
  "application.submitted": "Candidature soumise",
  "application.review_started": "Examen commencé par SUGU",
  "application.info_requested": "Complément demandé par SUGU",
  "application.approved": "Candidature admise",
  "application.rejected": "Candidature refusée",
  "application.withdrawn": "Candidature retirée",
  "account.activated": "Compte activé",
  "account.suspended": "Compte suspendu",
  "account.reactivated": "Compte réactivé",
  "document.uploaded": "Pièce déposée",
  "document.reviewed": "Pièce examinée",
  "agreement.verified": "Convention contrôlée",
  "identity.verified": "Identité vérifiée",
  "identity.rejected": "Identité non vérifiée",
};

/** The events of one's own file that the server lets the candidate read (no internal note). */
export function HistoryList({ history }: { history: LanayaMe["history"] }) {
  if (history.length === 0) return <p className="text-body text-foreground-muted">Aucun événement pour l&apos;instant.</p>;
  return (
    <ol className="flex flex-col">
      {history.map((entry, index) => (
        <li key={`${entry.event}-${entry.occurred_at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
          <span className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", entry.by_sugu ? "bg-primary" : "bg-foreground-subtle")} aria-hidden="true" />
          {index < history.length - 1 && <span className="absolute top-4 bottom-0 left-[0.3rem] w-px bg-border" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="text-body font-medium text-foreground">{EVENT_LABELS[entry.event] ?? "Mise à jour du dossier"}</p>
            <p className="text-meta text-foreground-muted">
              {formatDateTime(entry.occurred_at)} · {entry.by_sugu ? "Équipe SUGU" : "Vous"}
            </p>
            {entry.note && <p className="mt-1 text-label font-normal text-foreground">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ProvisionalNotice() {
  return (
    <p className="flex items-start gap-2 text-meta text-foreground-muted">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Programme pilote : les textes et la liste des pièces peuvent évoluer. Rien de ce que vous avez accepté ne sera modifié sans vous le demander.
    </p>
  );
}
