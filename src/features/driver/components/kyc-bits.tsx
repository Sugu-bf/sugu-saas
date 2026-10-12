"use client";

import { useState } from "react";
import { CircleCheck, Clock, FileText, FileWarning, RefreshCw, XCircle } from "lucide-react";
import { Alert, Badge, Button, cn, type Tone } from "@/design-system";
import { useSession } from "@/features/auth";
import { formatDay } from "@/features/agency/format";
import { DOCUMENT_LABEL, documentFileHref, verificationMessage, type DocumentStatus, type KycDocument, type Verification } from "../kyc/contract";

// The pieces of the file of a courier: where the verification stands, the
// status of a document, the picture of a document. A document is read
// through the portal, behind the session, and only by its courier.

const STATUS: Record<DocumentStatus, { label: string; tone: Tone; icon: typeof Clock }> = {
  verified: { label: "Approuvé", tone: "success", icon: CircleCheck },
  pending: { label: "En attente", tone: "warning", icon: Clock },
  rejected: { label: "Refusé", tone: "danger", icon: XCircle },
  not_uploaded: { label: "À transmettre", tone: "neutral", icon: FileWarning },
};

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const { label, tone, icon } = STATUS[status];
  return (
    <Badge tone={tone} icon={icon} data-document-status={status} className={className}>
      {label}
    </Badge>
  );
}

/** Where the file stands, in the badge of the profile. */
const STATE_BADGE: Record<string, { label: string; tone: Tone }> = {
  approved: { label: "Approuvé", tone: "success" },
  pending: { label: "En vérification", tone: "info" },
  incomplete: { label: "Incomplet", tone: "warning" },
  rejected: { label: "Refusé", tone: "danger" },
  paused: { label: "En pause", tone: "neutral" },
  suspended: { label: "Suspendu", tone: "danger" },
};

export function VerificationBadge({ verification }: { verification: Verification }) {
  const state = STATE_BADGE[verification.state] ?? { label: "État inconnu", tone: "neutral" as Tone };
  return (
    <Badge tone={state.tone} data-verification={verification.state}>
      {state.label}
    </Badge>
  );
}

/**
 * What the courier is told about their file, and — while they cannot work —
 * a way to ask the server again once the agency has decided.
 */
export function VerificationBanner({ verification, onRefresh, refreshing }: { verification: Verification; onRefresh?: () => void; refreshing?: boolean }) {
  const { tone, title, body } = verificationMessage(verification);
  const { refetch, isFetching } = useSession();
  const waiting = !verification.canDeliver;

  return (
    <Alert
      tone={tone === "neutral" ? "info" : tone}
      title={title}
      actionsPlacement="end"
      actions={
        waiting && (
          <Button
            size="compact"
            icon={RefreshCw}
            loading={refreshing || isFetching}
            onClick={() => {
              // The file, and the session with it: an approval opens the missions.
              onRefresh?.();
              void refetch();
            }}
          >
            Vérifier mon statut
          </Button>
        )
      }
    >
      {body}
      {verification.missing.length > 0 && (
        <span className="mt-1 block">
          {verification.missing.length > 1 ? "Pièces à transmettre : " : "Pièce à transmettre : "}
          {verification.missing.map((type) => DOCUMENT_LABEL[type].title).join(", ")}.
        </span>
      )}
    </Alert>
  );
}

/**
 * The picture of a document: itself when it is an image, a sheet otherwise
 * (a PDF, or a file that is no longer on the server). An image that cannot
 * be read falls back to the sheet instead of a broken picture.
 */
export function DocumentThumbnail({ document, className }: { document: KycDocument; className?: string }) {
  const source = document.id !== null && document.isImage && document.fileAvailable ? `${documentFileHref(document.id)}?v=${encodeURIComponent(document.uploadedAt ?? "")}` : null;
  // Remembered per file: a document sent again is tried again.
  const [broken, setBroken] = useState<string | null>(null);
  const showImage = source !== null && broken !== source;

  return (
    <span className={cn("flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-subtle", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a private document relayed with the session: nothing for the image optimiser, which would cache it.
        <img src={source} alt="" loading="lazy" decoding="async" onError={() => setBroken(source)} className="size-full object-cover" />
      ) : (
        <FileText className="size-6 text-foreground-subtle" aria-hidden="true" />
      )}
    </span>
  );
}

/** « Envoyé le 12 oct. » under a document, or what is expected when nothing was sent. */
export function documentLine(document: KycDocument): string {
  if (document.status === "not_uploaded") return document.required ? "Pièce obligatoire" : "Pièce facultative";
  return document.uploadedAt ? `Transmis le ${formatDay(document.uploadedAt)}` : "Transmis";
}
