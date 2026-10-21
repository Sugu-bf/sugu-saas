"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Alert, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from "@/design-system";
import { DocumentsPanel } from "@/features/lanaya/components/application";
import { LanayaPage } from "@/features/lanaya/components/frame";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useLanayaMe } from "@/features/lanaya/hooks";

export function DocumentsContent() {
  const me = useLanayaMe();
  const header = <PageHeader title="Documents" description="Les pièces de votre dossier Lanabaga et leur examen par SUGU." hideDescriptionOnPhone />;

  if (me.isError) {
    return (
      <LanayaPage>
        {header}
        <Card flush>
          <ErrorState title="Vos documents n'ont pas pu être chargés" description={describeLanayaFailure(me.error).message} onRetry={() => me.refetch()} retrying={me.isFetching} />
        </Card>
      </LanayaPage>
    );
  }

  if (!me.data) {
    return (
      <LanayaPage aria-busy>
        {header}
        <Skeleton className="h-72 rounded-panel" />
      </LanayaPage>
    );
  }

  const profile = me.data.profile;
  if (!profile) {
    return (
      <LanayaPage>
        {header}
        <Card flush>
          <EmptyState
            icon={FileText}
            title="Aucun dossier pour l'instant"
            description="Vos pièces se déposent pendant votre candidature."
            action={
              <Button asChild variant="primary">
                <Link href="/lanabaga/application">Commencer ma candidature</Link>
              </Button>
            }
          />
        </Card>
      </LanayaPage>
    );
  }

  return (
    <LanayaPage>
      {header}
      {!profile.editable && (
        <Alert tone="info" title="Vos pièces ne se modifient plus depuis cet espace">
          Votre dossier est en cours d&apos;examen ou déjà décidé. Pour remplacer une pièce, contactez l&apos;équipe Risk &amp; Compliance de SUGU.
        </Alert>
      )}
      <DocumentsPanel me={me.data} editable={profile.editable} title="Vos pièces" description="Chaque pièce est examinée par l'équipe Risk & Compliance de SUGU." />
    </LanayaPage>
  );
}
