"use client";

import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, DescriptionList, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from "@/design-system";
import { HistoryList } from "@/features/lanaya/components/application";
import { LanayaPage, Panel, formatDate } from "@/features/lanaya/components/frame";
import { describeLanayaFailure } from "@/features/lanaya/errors";
import { useLanayaMe } from "@/features/lanaya/hooks";

/** What a Lanabaga may and may not do (cahier §1.4 « hors périmètre V1 », §13): said plainly, once. */
const RULES_DO = [
  "Présenter SUGU aux vendeurs que vous connaissez, avec leur accord.",
  "Utiliser l'invitation officielle de SUGU, sans en changer le texte.",
  "Déclarer tout lien familial ou financier avec un vendeur.",
];
const RULES_DONT = [
  "Encaisser de l'argent, en espèces ou autrement, au nom de SUGU ou d'un vendeur.",
  "Modifier le bénéficiaire d'un paiement ou débloquer des fonds.",
  "Arbitrer un litige, ou vous présenter comme agent bancaire ou assureur.",
  "Promettre une garantie, des ventes ou une visibilité que SUGU n'offre pas.",
];

export function ComplianceContent() {
  const me = useLanayaMe();
  const header = <PageHeader title="Conformité" description="L'état de votre compte, de votre convention et de vos engagements." hideDescriptionOnPhone />;

  if (me.isError) {
    return (
      <LanayaPage>
        {header}
        <Card flush>
          <ErrorState title="Votre conformité n'a pas pu être chargée" description={describeLanayaFailure(me.error).message} onRetry={() => me.refetch()} retrying={me.isFetching} />
        </Card>
      </LanayaPage>
    );
  }

  if (!me.data) {
    return (
      <LanayaPage aria-busy>
        {header}
        <Skeleton className="h-60 rounded-panel" />
        <Skeleton className="h-60 rounded-panel" />
      </LanayaPage>
    );
  }

  const { profile, consents, history } = me.data;
  if (!profile) {
    return (
      <LanayaPage>
        {header}
        <Card flush>
          <EmptyState
            icon={ShieldCheck}
            title="Aucun dossier pour l'instant"
            description="Votre conformité se suit à partir de votre candidature."
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

  const agreement = profile.agreement;

  return (
    <LanayaPage>
      {header}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel
          title="Votre compte"
          description={`Dossier ${profile.public_code}`}
          actions={
            <Button asChild size="compact" variant="quiet" trailingIcon={ArrowRight}>
              <Link href="/lanabaga/application">Voir ma candidature</Link>
            </Button>
          }
        >
          <DescriptionList
            items={[
              { label: "Candidature", value: <StatusBadge domain="lanayaApplication" code={profile.application_status.value} /> },
              { label: "Compte", value: <StatusBadge domain="lanayaAccount" code={profile.account_status.value} /> },
              { label: "Identité", value: <StatusBadge domain="lanayaIdentity" code={profile.identity_status.value} /> },
              { label: "Admis le", value: profile.application_status.value === "approved" ? formatDate(profile.decided_at) : "—" },
            ]}
          />
        </Panel>

        <Panel title="Convention Lanabaga" description="Le contrat qui ouvre votre compte.">
          {agreement ? (
            <DescriptionList
              items={[
                { label: "Statut", value: <StatusBadge domain="lanayaAgreement" code={agreement.status.value} /> },
                { label: "Référence", value: agreement.reference },
                { label: "Version", value: agreement.version },
                { label: "Signée le", value: formatDate(agreement.signed_at) },
                { label: "Valable", value: agreement.valid_until ? `du ${formatDate(agreement.valid_from)} au ${formatDate(agreement.valid_until)}` : `depuis le ${formatDate(agreement.valid_from)}` },
              ]}
            />
          ) : (
            <p className="text-body text-foreground-muted">
              {profile.application_status.value === "approved"
                ? "Aucune convention en vigueur : l'équipe SUGU vous la remet après votre admission."
                : "La convention vient après l'admission de votre candidature."}
            </p>
          )}
        </Panel>

        <Panel title="Vos engagements" description="Ce que vous avez accepté, dans sa version.">
          <ul className="flex flex-col gap-2">
            {consents.map((consent) => (
              <li key={consent.key} className="flex items-start gap-3 rounded-control border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body text-foreground">{consent.text}</p>
                  <p className="mt-1 text-meta text-foreground-muted">Version {consent.version}</p>
                </div>
                {consent.given ? <Badge tone="success">Accepté</Badge> : <Badge tone="neutral">Non accepté</Badge>}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Règles du programme" description="Ce qu'un Lanabaga fait, et ce qu'il ne fait jamais.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <ul className="flex flex-col gap-2">
              {RULES_DO.map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-body text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-icon" aria-hidden="true" />
                  {rule}
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-2">
              {RULES_DONT.map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-body text-foreground">
                  <Ban className="mt-0.5 size-4 shrink-0 text-danger-icon" aria-hidden="true" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel title="Historique" description="Les étapes de votre dossier.">
        <HistoryList history={history} />
      </Panel>
    </LanayaPage>
  );
}
