"use client";

import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { Button, Card, ErrorState, Skeleton } from "@/design-system";
import { ActionBar, DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { DocumentStatusBadge, DocumentThumbnail, VerificationBanner, documentLine } from "@/features/driver/components/kyc-bits";
import { describeDriverFailure } from "@/features/driver/errors";
import { DOCUMENT_LABEL, documentFileHref, type KycDocument } from "@/features/driver/kyc/contract";
import { useCourierFile } from "@/features/driver/kyc/hooks";

// « Mes documents », after its mock-up: where the file stands, then each
// document with its picture, its status and its file. This screen is open to
// a courier who cannot work yet: it is where the file gets completed.

export function DocumentsContent() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCourierFile();
  const back = { label: "Retour au profil", href: "/driver/profile" };

  return (
    <DriverPage>
      <ScreenHeader title="Mes documents" back={back} />

      {isLoading ? (
        <>
          <Skeleton className="h-20 rounded-panel" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-panel" />
          ))}
        </>
      ) : isError || !data ? (
        <Card flush>
          <ErrorState title="Impossible de charger vos documents" description={describeDriverFailure(error).message} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      ) : (
        <>
          <VerificationBanner verification={data.verification} onRefresh={() => refetch()} refreshing={isFetching} />

          <ul className="flex flex-col gap-3" aria-label="Pièces du dossier">
            {data.documents.map((document) => (
              <DocumentRow key={document.type} document={document} />
            ))}
          </ul>

          <p className="text-center text-meta text-foreground-muted md:text-left">Formats acceptés : JPG, PNG, PDF (5 Mo au plus). Vos pièces ne sont lues que par votre agence et les équipes autorisées.</p>
          <ActionBar>
            <Button asChild variant="primary" icon={FilePlus2} className="h-touch w-full md:w-auto">
              <Link href="/driver/documents/new">Ajouter un document</Link>
            </Button>
          </ActionBar>
        </>
      )}
    </DriverPage>
  );
}

function DocumentRow({ document }: { document: KycDocument }) {
  const { title, hint } = DOCUMENT_LABEL[document.type];
  const sent = document.status !== "not_uploaded";
  // A record can outlive its file (a storage that was replaced): said, and no link that cannot work.
  const lost = sent && document.hasFile && !document.fileAvailable;

  return (
    <li>
      <Card data-document={document.type} className="flex gap-3">
        <DocumentThumbnail document={document} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="min-w-0">
            <h2 className="text-body font-semibold text-foreground">{title}</h2>
            <p className="text-label font-normal text-foreground-muted">{hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <DocumentStatusBadge status={document.status} />
            <span className="text-label font-normal text-foreground-muted tabular-nums">{documentLine(document)}</span>
          </div>
          {document.status === "rejected" && <p className="text-label font-normal text-danger-fg">{document.rejectionReason ? `Motif du refus : ${document.rejectionReason}` : "Cette pièce a été refusée : transmettez-la de nouveau."}</p>}
          {lost && <p className="text-label font-normal text-warning-fg">Le fichier n&apos;est plus sur le serveur. Transmettez de nouveau cette pièce.</p>}

          <div className="mt-1 flex flex-wrap gap-2">
            {sent && document.id && document.fileAvailable && (
              <Button asChild size="compact" variant="outline">
                <a href={documentFileHref(document.id)} target="_blank" rel="noreferrer" aria-label={`Voir le fichier : ${title}`}>
                  Voir le fichier
                </a>
              </Button>
            )}
            <Button asChild size="compact">
              <Link href={`/driver/documents/new?type=${document.type}`} aria-label={`${sent ? "Remplacer" : "Transmettre"} : ${title}`}>
                {sent ? "Remplacer" : "Transmettre"}
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}
