"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, HandHeart, Handshake, MapPin, MessageSquareQuote, ShieldCheck, Undo2, UserCheck, UserMinus, Users, Wallet, X, type LucideIcon } from "lucide-react";
import { Alert, Avatar, Badge, Button, Card, Checkbox, ConfirmDialog, ErrorState, PageHeader, Radio, RadioGroup, Skeleton } from "@/design-system";
import { LANABAGA_FILE_PATH } from "@/lib/auth/session-user";
import { ApiError } from "@/lib/http/api-error";
import { LanayaPage, Panel, formatDate, formatDateTime } from "./frame";
import type { InvitationPreview, LanabagaPublicCard, SellerLanaya } from "../contract";

type SellerStore = SellerLanaya["stores"][number];
import { describeLanayaFailure } from "../errors";
import { isInvitationToken, useAnswerInvitation, useAssignmentAnswer, useInvitationPreview, useSellerLanaya } from "../hooks";

// ============================================================
// Programme Lanaya, côté vendeur (maquettes 3 et 4).
//
// Who introduced each shop (first accepted invitation, DEC-23), the
// decision on an invitation opened from its link, and the main Lanabaga
// of the shop: SUGU proposes one, the seller accepts or declines (DEC-30),
// and may end it whenever they want. Every consent is a box the seller
// ticks; every button says exactly what is recorded. The follow-up and the
// badge come with later lots and are not drawn.
// ============================================================

export function SellerLanayaScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("invitation");
  const token = isInvitationToken(raw) ? raw : null;

  const seller = useSellerLanaya();
  const preview = useInvitationPreview(token);
  const introduced = seller.data?.stores.filter((store) => store.introduced_by) ?? [];
  const assigned = seller.data?.stores.filter((store) => store.assignment) ?? [];
  const proposed = seller.data?.stores.filter((store) => store.proposal) ?? [];
  const closeInvitation = () => router.replace(pathname);

  return (
    <LanayaPage>
      <PageHeader title="Programme Lanaya" description="Un Lanabaga, partenaire indépendant admis par SUGU, peut vous présenter SUGU et vous accompagner dans votre activité." hideDescriptionOnPhone />

      <Card className="flex flex-col gap-3">
        <p className="text-meta font-semibold tracking-wide text-primary uppercase">Accompagnement</p>
        <h2 className="text-section-title text-foreground md:text-[1.375rem] md:leading-snug">Un accompagnement commercial par un Lanabaga admis par SUGU.</h2>
        <p className="max-w-3xl text-body text-foreground-muted">
          Le programme Lanaya vous met en relation avec un Lanabaga : une personne de votre région, examinée et admise par SUGU, qui connaît votre secteur et vous aide à vendre sur SUGU.
        </p>
        <ul className="mt-1 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <Benefit icon={Users} title="Un accompagnement personnalisé" body="Par une personne de votre région" />
          <Benefit icon={ShieldCheck} title="Un partenaire admis par SUGU" body="Son identité a été vérifiée" />
        </ul>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Votre Lanabaga"
          description={token ? "Le Lanabaga qui vous invite à rejoindre le programme." : assigned.length > 0 ? "Le Lanabaga principal qui accompagne votre boutique." : "Le Lanabaga qui vous a présenté SUGU."}
        >
          {token ? (
            preview.data ? (
              <LanabagaCard card={preview.data.lanabaga} />
            ) : preview.isError ? (
              <p className="text-body text-foreground-muted">L&apos;invitation n&apos;a pas pu être ouverte.</p>
            ) : (
              <Skeleton className="h-32 rounded-control" />
            )
          ) : seller.isError ? (
            <ErrorState title="Votre Lanabaga n'a pas pu être chargé" description={describeLanayaFailure(seller.error).message} onRetry={() => seller.refetch()} retrying={seller.isFetching} />
          ) : !seller.data ? (
            <Skeleton className="h-32 rounded-control" />
          ) : assigned.length > 0 ? (
            <div className="flex flex-col gap-4">
              {assigned.map((store) => (
                <MainLanabaga key={store.id} store={store} several={(seller.data?.stores.length ?? 0) > 1} />
              ))}
            </div>
          ) : introduced.length === 0 ? (
            <p className="text-body text-foreground-muted">
              Aucun Lanabaga ne vous a présenté SUGU. Si un Lanabaga vous a envoyé une invitation, ouvrez le lien qu&apos;il vous a transmis : elle s&apos;affichera ici.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {introduced.map((store) => (
                <div key={store.id} className="flex flex-col gap-2">
                  {(seller.data?.stores.length ?? 0) > 1 && <p className="text-label text-foreground-muted">{store.name}</p>}
                  <LanabagaCard card={store.introduced_by!} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {token ? (
          <DecisionCard token={token} preview={preview.data} error={preview.isError ? preview.error : null} onDone={closeInvitation} />
        ) : proposed.length > 0 ? (
          <div className="flex flex-col gap-4">
            {proposed.map((store) => (
              <ProposalCard key={store.id} store={store} />
            ))}
          </div>
        ) : assigned.length > 0 ? (
          <Panel title="Votre accompagnement" description="Ce que votre Lanabaga principal fait, et ce qu'il ne fait pas.">
            <p className="text-body text-foreground">
              Votre Lanabaga principal vous conseille pour vendre sur SUGU. Il n&apos;a aucun accès à votre compte, à vos commandes ni à vos paiements, et vous pouvez mettre fin à son accompagnement à tout moment.
            </p>
          </Panel>
        ) : introduced.length > 0 ? (
          <Panel title="Prochaine étape" description="Ce qui vient après la mise en relation.">
            <p className="text-body text-foreground">
              SUGU peut vous proposer un Lanabaga principal pour votre boutique. La proposition s&apos;affichera ici, et rien ne sera actif sans votre accord. D&apos;ici là, rien ne change pour votre boutique ni pour vos paiements.
            </p>
          </Panel>
        ) : (
          <Panel title="Rejoindre le programme" description="Le programme est ouvert sur invitation pendant le pilote.">
            <ol className="flex flex-col gap-3 text-body text-foreground">
              <Step index={1}>Un Lanabaga vous envoie l&apos;invitation officielle de SUGU, avec un lien.</Step>
              <Step index={2}>Vous ouvrez le lien connecté à votre compte vendeur et choisissez votre boutique.</Step>
              <Step index={3}>Vous acceptez ou refusez la mise en relation. Rien n&apos;est enregistré sans votre accord.</Step>
            </ol>
          </Panel>
        )}
      </div>

      {token && proposed.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {proposed.map((store) => (
            <ProposalCard key={store.id} store={store} />
          ))}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title="Ce que cela change" description="Ce que le programme fait, et ce qu'il ne fait pas.">
          <ul className="grid gap-4 sm:grid-cols-2">
            <Benefit icon={UserCheck} title="Un interlocuteur identifié" body="Il est connu de SUGU sous un code que vous pouvez vérifier." />
            <Benefit icon={HandHeart} title="Des conseils pour démarrer" body="Vous restez seul à agir sur votre compte et votre boutique." />
            <Benefit icon={Wallet} title="Vos paiements ne changent pas" body="Un Lanabaga n'encaisse rien et ne modifie jamais vos comptes de versement." />
            <Benefit icon={CircleCheck} title="Aucun frais à ce stade" body="Aucun honoraire n'est prélevé sur vos ventes pendant cette phase du programme." />
          </ul>
          <p className="mt-4 border-t border-border pt-3 text-meta text-foreground-muted">L&apos;accompagnement Lanaya n&apos;est ni une garantie de ventes, ni une assurance.</p>
        </Panel>

        <Panel title="Historique" description="Les étapes de votre relation avec le programme.">
          <History seller={seller.data} preview={token ? preview.data : undefined} />
        </Panel>
      </div>

      <p className="text-label font-normal text-foreground-muted">
        Vous souhaitez accompagner vous-même des vendeurs ?{" "}
        <Link href={LANABAGA_FILE_PATH} className="rounded-compact font-medium text-foreground underline underline-offset-2 hover:text-primary">
          Candidatez au programme Lanaya
        </Link>
        . Votre propre boutique se déclare alors dans les liens à déclarer.
      </p>
    </LanayaPage>
  );
}

/** The main Lanabaga of one shop, accepted by the seller, and the way out of it. */
function MainLanabaga({ store, several }: { store: SellerStore; several: boolean }) {
  const { end } = useAssignmentAnswer();
  const [ending, setEnding] = useState(false);
  const assignment = store.assignment!;

  async function confirmEnd() {
    try {
      await end.mutateAsync({ id: assignment.id });
      toast.success("L'accompagnement de votre boutique est terminé.");
    } catch (failure) {
      toast.error(describeLanayaFailure(failure).message);
      throw failure;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {several && <p className="text-label text-foreground-muted">{store.name}</p>}
      {assignment.lanabaga && <LanabagaCard card={assignment.lanabaga} />}
      <p className="text-meta text-foreground-muted">Lanabaga principal de {store.name} depuis le {formatDate(assignment.accepted_at)}.</p>
      <Button size="compact" variant="quiet" icon={UserMinus} className="self-start" onClick={() => setEnding(true)}>
        Mettre fin à l&apos;accompagnement
      </Button>
      <ConfirmDialog
        open={ending}
        onOpenChange={setEnding}
        title="Mettre fin à l'accompagnement ?"
        description={`${assignment.lanabaga?.name ?? "Ce Lanabaga"} ne sera plus le Lanabaga principal de ${store.name}. Vous pourrez accepter plus tard une autre proposition de SUGU.`}
        confirmLabel="Mettre fin"
        confirmIcon={UserMinus}
        tone="danger"
        onConfirm={confirmEnd}
      />
    </div>
  );
}

/** SUGU proposes a main Lanabaga for one shop (DEC-30): nothing is active before the seller ticks and accepts. */
function ProposalCard({ store }: { store: SellerStore }) {
  const { accept, decline } = useAssignmentAnswer();
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const proposal = store.proposal!;
  const name = proposal.lanabaga?.name ?? "Ce Lanabaga";
  const current = store.assignment?.lanabaga?.name ?? null;

  async function confirm() {
    setProblem(null);
    if (!consent) {
      setProblem("Cochez la case pour confirmer votre accord.");
      return;
    }
    try {
      await accept.mutateAsync(proposal.id);
      toast.success("Votre Lanabaga principal est enregistré.");
    } catch (failure) {
      setProblem(describeLanayaFailure(failure).message);
    }
  }

  async function refuse() {
    try {
      await decline.mutateAsync(proposal.id);
      toast.success("Proposition refusée.");
    } catch (failure) {
      toast.error(describeLanayaFailure(failure).message);
      throw failure;
    }
  }

  return (
    <Panel title="Proposition d'accompagnement" description={`Pour ${store.name}, reçue le ${formatDate(proposal.proposed_at)}.`} icon={Handshake} tone="brand">
      <div className="flex flex-col gap-4">
        <p className="text-body text-foreground">
          SUGU vous propose {name} comme Lanabaga principal de <span className="font-medium">{store.name}</span>.
          {current ? ` ${name} remplacera ${current}.` : ""}
        </p>
        {proposal.lanabaga && <LanabagaCard card={proposal.lanabaga} />}
        <div className="rounded-control border border-border p-3">
          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} label={proposal.consent.text} description={`Version ${proposal.consent.version}`} />
        </div>
        {problem && (
          <p role="alert" className="text-label font-normal text-danger-fg">
            {problem}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {/* An invitation may be answered on the same page: each « Refuser » says what it refuses. */}
          <Button className="sm:flex-1" icon={Undo2} onClick={() => setDeclining(true)} disabled={accept.isPending} aria-label={`Refuser la proposition pour ${store.name}`}>
            Refuser
          </Button>
          <Button className="sm:flex-[2]" variant="primary" icon={UserCheck} loading={accept.isPending} onClick={confirm}>
            Accepter ce Lanabaga
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={declining}
        onOpenChange={setDeclining}
        title="Refuser cette proposition ?"
        description={`${name} ne deviendra pas le Lanabaga principal de ${store.name}. SUGU pourra vous en proposer un autre.`}
        confirmLabel="Refuser la proposition"
        confirmIcon={Undo2}
        onConfirm={refuse}
      />
    </Panel>
  );
}

function Benefit({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-body font-medium text-foreground">{title}</span>
        <span className="block text-label font-normal text-foreground-muted">{body}</span>
      </span>
    </li>
  );
}

function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-pill border border-border-strong text-meta font-medium text-foreground-muted tabular-nums" aria-hidden="true">
        {index}
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  );
}

/** Public facts only: name, city, specialties, code. No badge before Lot 6, no "Vérifié". */
export function LanabagaCard({ card }: { card: LanabagaPublicCard }) {
  const name = card.name ?? "Lanabaga";
  return (
    <div className="flex flex-col gap-3 rounded-control border border-border p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <p className="text-body font-semibold text-foreground">{name}</p>
          <p className="flex items-center gap-1 text-label font-normal text-foreground-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {card.city}
          </p>
          <p className="mt-1 text-meta text-foreground-muted">
            {card.account_active ? "Lanabaga admis par SUGU" : "Ce compte Lanabaga n'est plus actif"} · <span className="whitespace-nowrap">Code {card.public_code}</span>
          </p>
        </div>
      </div>
      {card.specialties.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Spécialités">
          {card.specialties.map((specialty) => (
            <li key={specialty}>
              <Badge tone="neutral">{specialty}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DecisionCard({ token, preview, error, onDone }: { token: string; preview?: InvitationPreview; error: unknown; onDone: () => void }) {
  const { accept, decline } = useAnswerInvitation(token);
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const selected = storeId ?? (preview?.stores.length === 1 ? preview.stores[0].id : undefined);

  const header = { title: "Décision du vendeur", description: "Vous êtes invité à rejoindre le programme Lanaya." };

  if (error) {
    const gone = error instanceof ApiError && error.status === 404;
    return (
      <Panel {...header}>
        <Alert
          tone={gone ? "info" : "danger"}
          title={gone ? "Cette invitation n'est plus valable" : "L'invitation n'a pas pu être ouverte"}
          actions={
            <Button size="compact" icon={X} onClick={onDone}>
              Fermer l&apos;invitation
            </Button>
          }
        >
          {gone ? "Elle a expiré, a été retirée, ou a déjà reçu une réponse. Demandez au Lanabaga de vous en envoyer une nouvelle." : describeLanayaFailure(error).message}
        </Alert>
      </Panel>
    );
  }

  if (!preview) {
    return (
      <Panel {...header}>
        <Skeleton className="h-56 rounded-control" />
      </Panel>
    );
  }

  if (preview.self) {
    return (
      <Panel {...header}>
        <Alert tone="info" title="C'est votre propre invitation">
          Un Lanabaga ne peut pas se présenter lui-même. Envoyez ce lien au vendeur concerné.
        </Alert>
      </Panel>
    );
  }

  if (preview.stores.length === 0) {
    return (
      <Panel {...header}>
        <Alert tone="info" title="Aucune boutique à rattacher">
          Cette invitation se rattache à une boutique. Créez d&apos;abord votre boutique, puis rouvrez le lien de l&apos;invitation.
        </Alert>
      </Panel>
    );
  }

  const name = preview.lanabaga.name ?? "Ce Lanabaga";

  async function confirm() {
    setProblem(null);
    setStoreError(null);
    if (!selected) {
      setStoreError("Choisissez la boutique concernée.");
      return;
    }
    if (!consent) {
      setProblem("Cochez la case pour confirmer votre accord.");
      return;
    }
    try {
      await accept.mutateAsync(selected);
      toast.success("Mise en relation enregistrée.");
      onDone();
    } catch (failure) {
      setProblem(describeLanayaFailure(failure).message);
    }
  }

  async function refuse() {
    try {
      await decline.mutateAsync();
      toast.success("Invitation refusée.");
      onDone();
    } catch (failure) {
      toast.error(describeLanayaFailure(failure).message);
      throw failure;
    }
  }

  return (
    <Panel {...header}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-foreground">
          {name} vous invite à rejoindre le programme pour <span className="font-medium">{preview.company_name}</span>. Invitation valable jusqu&apos;au {formatDate(preview.expires_at)}.
        </p>
        {preview.message && (
          <blockquote className="flex gap-2 rounded-control border border-border bg-surface-subtle p-3 text-label font-normal text-foreground">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <span className="min-w-0 break-words">{preview.message}</span>
          </blockquote>
        )}

        {preview.stores.length > 1 ? (
          <RadioGroup label="Boutique concernée" value={selected} onValueChange={setStoreId} error={storeError} required>
            {preview.stores.map((store) => (
              <Radio key={store.id} value={store.id} label={store.name} description={store.city ?? undefined} />
            ))}
          </RadioGroup>
        ) : (
          <p className="text-label font-normal text-foreground-muted">
            Boutique concernée : <span className="font-medium text-foreground">{preview.stores[0].name}</span>
          </p>
        )}

        <div className="rounded-control border border-border p-3">
          <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} label={preview.consent.text} description={`Version ${preview.consent.version}`} />
        </div>

        {problem && (
          <p role="alert" className="text-label font-normal text-danger-fg">
            {problem}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button className="sm:flex-1" icon={Undo2} onClick={() => setDeclining(true)} disabled={accept.isPending}>
            Refuser
          </Button>
          <Button className="sm:flex-[2]" variant="primary" icon={UserCheck} loading={accept.isPending} onClick={confirm}>
            Accepter la mise en relation
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={declining}
        onOpenChange={setDeclining}
        title="Refuser cette invitation ?"
        description={`Votre refus apparaîtra dans les invitations de ${name}. Vous pourrez accepter une autre invitation plus tard.`}
        confirmLabel="Refuser l'invitation"
        confirmIcon={Undo2}
        onConfirm={refuse}
      />
    </Panel>
  );
}

function History({ seller, preview }: { seller?: SellerLanaya; preview?: InvitationPreview }) {
  const entries: { key: string; title: string; body: string; at: string | null }[] = [];
  for (const store of seller?.stores ?? []) {
    if (store.introduced_by) {
      entries.push({
        key: store.id,
        title: "Mise en relation acceptée",
        body: `${store.name} a été présentée par ${store.introduced_by.name ?? "un Lanabaga"}.`,
        at: store.introduced_by.accepted_at,
      });
    }
  }
  for (const store of seller?.stores ?? []) {
    if (store.assignment) {
      entries.push({ key: `assignment-${store.assignment.id}`, title: "Lanabaga principal accepté", body: `${store.assignment.lanabaga?.name ?? "Un Lanabaga"} accompagne ${store.name}.`, at: store.assignment.accepted_at });
    }
    if (store.proposal) {
      entries.push({ key: `proposal-${store.proposal.id}`, title: "Proposition de SUGU reçue", body: `${store.proposal.lanabaga?.name ?? "Un Lanabaga"} est proposé pour ${store.name}.`, at: store.proposal.proposed_at });
    }
  }
  entries.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  if (preview) {
    entries.unshift({ key: "preview", title: "Invitation reçue", body: `${preview.lanabaga.name ?? "Un Lanabaga"} vous invite à rejoindre le programme.`, at: null });
  }

  if (entries.length === 0) return <p className="text-body text-foreground-muted">Aucun événement pour l&apos;instant.</p>;

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.key} className="relative flex gap-3 pb-4 last:pb-0">
          <span className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          {index < entries.length - 1 && <span className="absolute top-4 bottom-0 left-[0.3rem] w-px bg-border" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-foreground">{entry.title}</p>
            <p className="text-label font-normal text-foreground-muted">{entry.body}</p>
          </div>
          {entry.at && <span className="shrink-0 text-meta text-foreground-muted">{formatDateTime(entry.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

export function SellerLanayaLoading() {
  return (
    <LanayaPage aria-busy>
      <p role="status" className="sr-only">
        Chargement du programme Lanaya…
      </p>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-44 rounded-panel" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-panel" />
        <Skeleton className="h-64 rounded-panel" />
      </div>
    </LanayaPage>
  );
}
