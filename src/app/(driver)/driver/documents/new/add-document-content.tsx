"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CloudUpload, FileText, X } from "lucide-react";
import { Alert, Button, Card, FormField, IconButton, Select, cn } from "@/design-system";
import { useOneAtATime } from "@/features/agency/single-flight";
import { ActionBar, DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { describeDriverFailure } from "@/features/driver/errors";
import { ACCEPTED_FILES, DOCUMENT_LABEL, DOCUMENT_TYPES, fileRefusal, formatFileSize, type DocumentType } from "@/features/driver/kyc/contract";
import { useCourierFile, useUploadDocument } from "@/features/driver/kyc/hooks";

// « Ajouter un document », after its mock-up: which document, its file, what
// was chosen, and the button that sends it. The file is checked here to
// answer at once; the server checks it again and is the one that decides.

const isType = (value: string | null): value is DocumentType => (DOCUMENT_TYPES as readonly string[]).includes(value ?? "");

export function AddDocumentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("type");
  const { data } = useCourierFile();
  const upload = useUploadDocument();

  const [type, setType] = useState<DocumentType | "">(isType(asked) ? asked : "");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // The picture of an image, read from the device: nothing leaves it before « Envoyer ».
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (chosen: File | null | undefined) => {
    setRefusal(null);
    if (!chosen) return;
    const refused = fileRefusal(chosen);
    setFileError(refused);
    setFile(refused ? null : chosen);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
  };

  const submit = useOneAtATime(async () => {
    setRefusal(null);
    setTypeError(type ? null : "Choisissez le type de document.");
    if (!file) setFileError((current) => current ?? "Joignez le fichier de la pièce.");
    if (!type || !file) return;
    try {
      await upload.mutateAsync({ type, file });
      toast.success(`${DOCUMENT_LABEL[type].title} : document transmis. Votre agence va le vérifier.`);
      router.push("/driver/documents");
    } catch (error) {
      const failure = describeDriverFailure(error);
      setRefusal(failure.fields.file ?? failure.fields.document_type ?? failure.message);
    }
  });

  const existing = type ? data?.documents.find((document) => document.type === type && document.status !== "not_uploaded") : undefined;

  return (
    <DriverPage>
      <ScreenHeader title={existing ? "Remplacer un document" : "Ajouter un document"} back={{ label: "Retour aux documents", href: "/driver/documents" }} />

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void submit();
        }}
      >
        {refusal && <Alert tone="danger" title={refusal} />}

        <Card className="flex flex-col gap-4">
          <FormField label="Type de document" required error={typeError} hint={type ? DOCUMENT_LABEL[type].hint : undefined}>
            <Select
              value={type}
              onChange={(event) => {
                setType(event.target.value as DocumentType | "");
                setTypeError(null);
              }}
              placeholder="Choisir un type"
              options={DOCUMENT_TYPES.map((value) => ({ value, label: DOCUMENT_LABEL[value].title }))}
            />
          </FormField>

          {existing && <Alert tone="info" title="Une pièce de ce type est déjà transmise : le nouveau fichier la remplace, et repasse en vérification." />}

          <div className="flex flex-col gap-1.5">
            <span id="fichier-libelle" className="text-label text-foreground">
              Fichier <span aria-hidden="true">*</span>
            </span>
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-panel border border-dashed px-4 py-8 text-center transition-colors duration-100",
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring",
                dragging ? "border-primary bg-brand-subtle" : fileError ? "border-danger-border bg-danger-bg" : "border-border-control bg-surface hover:bg-surface-subtle",
              )}
            >
              <CloudUpload className="size-7 text-info-icon" aria-hidden="true" />
              <span className="text-body font-medium text-foreground">Cliquez pour sélectionner un fichier</span>
              <span className="text-label font-normal text-foreground-muted">ou glissez-déposez ici</span>
              <span className="mt-1 text-meta text-foreground-muted">JPG, PNG ou PDF (5 Mo au plus)</span>
              <input
                ref={input}
                type="file"
                accept={ACCEPTED_FILES}
                aria-labelledby="fichier-libelle"
                aria-describedby={fileError ? "fichier-erreur" : undefined}
                aria-invalid={fileError ? true : undefined}
                className="sr-only"
                onChange={(event) => {
                  choose(event.target.files?.[0]);
                  // The same file can be chosen again after being removed.
                  event.target.value = "";
                }}
              />
            </label>
            {fileError && (
              <p id="fichier-erreur" role="alert" className="text-label font-normal text-danger-fg">
                {fileError}
              </p>
            )}
          </div>

          {file && (
            <section aria-label="Aperçu" className="flex flex-col gap-1.5">
              <h2 className="text-label text-foreground">Aperçu</h2>
              <div className="flex items-center gap-3 rounded-panel border border-border bg-surface-subtle p-2.5">
                <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file (blob URL), never sent anywhere.
                    <img src={preview} alt="" className="size-full object-cover" />
                  ) : (
                    <FileText className="size-6 text-foreground-subtle" aria-hidden="true" />
                  )}
                </span>
                <p className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium text-foreground">{file.name}</span>
                  <span className="text-label font-normal text-foreground-muted tabular-nums">{formatFileSize(file.size)}</span>
                </p>
                <IconButton
                  icon={X}
                  label="Retirer ce fichier"
                  onClick={() => {
                    setFile(null);
                    input.current?.focus();
                  }}
                />
              </div>
            </section>
          )}
        </Card>

        <ActionBar>
          <Button type="submit" variant="primary" loading={upload.isPending} className="h-touch w-full md:w-auto">
            Envoyer le document
          </Button>
        </ActionBar>
      </form>
    </DriverPage>
  );
}
