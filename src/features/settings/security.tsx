"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, History, KeyRound, LogOut, Monitor, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { Alert, Badge, Button, ConfirmDialog, Dialog, DialogContent, EmptyState, ErrorState, FormField, Input, PasswordInput, Skeleton, cn } from "@/design-system";
import { api, apiRequest } from "@/lib/http/client";
import { describeFailureWith } from "@/lib/http/failure";
import { LinkRow, SettingsPanel } from "./parts";
import { describeSettingsFailure } from "./use-draft";

// ============================================================
// Security of the signed-in account, the same three blocks for a
// seller, an agency and a courier: the password, the two-step
// sign-in, the open sessions — plus the sign-ins the server
// recorded. Each profile gives its own password and session calls;
// the two-step sign-in and the history are the account's.
// ============================================================

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

// ── Password ─────────────────────────────────────────────────

export interface PasswordValues {
  current: string;
  next: string;
  confirmation: string;
}

export interface PasswordCardProps {
  /** Null when the server does not know (changed before it was recorded). */
  changedAt: string | null | undefined;
  /** Sends the change; throws the server's refusal. */
  submit: (values: PasswordValues) => Promise<unknown>;
  /** Name of each field in the server's errors → the field of this form. */
  fieldMap: Record<string, keyof PasswordValues>;
}

const EMPTY_PASSWORD: PasswordValues = { current: "", next: "", confirmation: "" };

function checkPassword(values: PasswordValues): Partial<Record<keyof PasswordValues, string>> {
  const errors: Partial<Record<keyof PasswordValues, string>> = {};
  if (!values.current) errors.current = "Saisissez votre mot de passe actuel.";
  if (values.next.length < 8) errors.next = "Au moins 8 caractères.";
  else if (values.next === values.current) errors.next = "Choisissez un mot de passe différent de l'actuel.";
  if (values.confirmation !== values.next) errors.confirmation = "Les deux saisies ne correspondent pas.";
  return errors;
}

export function PasswordCard({ changedAt, submit, fieldMap }: PasswordCardProps) {
  const [values, setValues] = useState<PasswordValues>(EMPTY_PASSWORD);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);

  const set = (key: keyof PasswordValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    const local = checkPassword(values);
    setErrors(local);
    setNotice(null);
    if (Object.keys(local).length > 0) return;
    lock.current = true;
    setSaving(true);
    try {
      await submit(values);
      setValues(EMPTY_PASSWORD);
      toast.success("Mot de passe modifié.");
      setNotice("Votre mot de passe a été modifié. Vos autres sessions ont été déconnectées.");
    } catch (error) {
      const failure = describeSettingsFailure(error);
      const fields: Partial<Record<keyof PasswordValues, string>> = {};
      for (const [field, message] of Object.entries(failure.fields)) {
        const mapped = fieldMap[field];
        if (mapped) fields[mapped] = message;
      }
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(failure.message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <SettingsPanel title="Mot de passe" description={changedAt ? `Modifié le ${formatWhen(changedAt)}` : "Changez-le si vous pensez qu'il est connu d'un tiers."}>
      <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-4" aria-label="Changer le mot de passe">
        {notice && <Alert tone="success" title={notice} />}
        <FormField label="Mot de passe actuel" required error={errors.current}>
          <PasswordInput value={values.current} onChange={(event) => set("current", event.target.value)} autoComplete="current-password" />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nouveau mot de passe" required hint="8 caractères au moins." error={errors.next}>
            <PasswordInput value={values.next} onChange={(event) => set("next", event.target.value)} autoComplete="new-password" />
          </FormField>
          <FormField label="Confirmation" required error={errors.confirmation}>
            <PasswordInput value={values.confirmation} onChange={(event) => set("confirmation", event.target.value)} autoComplete="new-password" />
          </FormField>
        </div>
        <div>
          <Button type="submit" variant="primary" icon={KeyRound} loading={saving}>
            Changer le mot de passe
          </Button>
        </div>
      </form>
    </SettingsPanel>
  );
}

// ── Two-step sign-in ─────────────────────────────────────────

interface VerificationStatus {
  enabled: boolean;
  channel: "email";
  destination: string | null;
  can_enable: boolean;
  enabled_at: string | null;
}

const verificationKey = ["account", "login-verification"] as const;

async function fetchVerification(): Promise<VerificationStatus> {
  const response = await api.get<{ data: VerificationStatus }>("account/security/login-verification");
  return response.data;
}

export function useLoginVerification() {
  return useQuery({ queryKey: verificationKey, queryFn: fetchVerification, staleTime: 30_000 });
}

type Step = { kind: "password"; action: "enable" | "disable" } | { kind: "code"; destination: string };

export function LoginVerificationCard() {
  const query = useLoginVerification();
  const client = useQueryClient();
  const [step, setStep] = useState<Step | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setStep(null);
    setPassword("");
    setCode("");
    setError(null);
  };

  const start = useMutation({
    mutationFn: (pwd: string) => api.post<{ data: { destination: string } }>("account/security/login-verification/start", { password: pwd }),
  });
  const confirm = useMutation({
    mutationFn: (value: string) => api.post<{ data: VerificationStatus }>("account/security/login-verification/confirm", { code: value }),
  });
  const disable = useMutation({
    mutationFn: (pwd: string) => apiRequest<{ data: VerificationStatus }>("account/security/login-verification", { method: "DELETE", body: { password: pwd } }),
  });

  const fail = (failure: unknown) => {
    const described = describeFailureWith(failure, { validation: "Vérifiez votre saisie." });
    setError(described.fields.password ?? described.fields.code ?? described.message);
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!step || step.kind !== "password" || !password) {
      setError("Saisissez votre mot de passe.");
      return;
    }
    setError(null);
    try {
      if (step.action === "enable") {
        const response = await start.mutateAsync(password);
        setPassword("");
        setStep({ kind: "code", destination: response.data.destination });
      } else {
        const response = await disable.mutateAsync(password);
        client.setQueryData(verificationKey, response.data);
        toast.success("Vérification en deux étapes désactivée.");
        close();
      }
    } catch (failure) {
      fail(failure);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(code)) {
      setError("Saisissez le code à chiffres reçu par e-mail.");
      return;
    }
    setError(null);
    try {
      const response = await confirm.mutateAsync(code);
      client.setQueryData(verificationKey, response.data);
      toast.success("Vérification en deux étapes activée.");
      close();
    } catch (failure) {
      fail(failure);
    }
  };

  const status = query.data;
  return (
    <SettingsPanel
      title="Vérification en deux étapes"
      description="À chaque connexion, après votre mot de passe, un code à usage unique vous est envoyé par e-mail."
      action={status ? <Badge tone={status.enabled ? "success" : "danger"}>{status.enabled ? "Activée" : "Désactivée"}</Badge> : undefined}
    >
      {query.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : query.isError || !status ? (
        <ErrorState title="État indisponible" description="L'état de la vérification n'a pas pu être lu." onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body text-foreground-muted">
            {status.enabled
              ? `Activée le ${formatWhen(status.enabled_at)}. Le code est envoyé à ${status.destination ?? "l'adresse de votre compte"}.`
              : status.can_enable
                ? `Le code sera envoyé à ${status.destination}. Une personne qui connaîtrait votre mot de passe ne pourrait pas se connecter sans lui.`
                : "Ajoutez une adresse e-mail à votre compte pour l'activer : le code y est envoyé."}
          </p>
          <div>
            {status.enabled ? (
              <Button variant="secondary" icon={ShieldOff} onClick={() => setStep({ kind: "password", action: "disable" })}>
                Désactiver
              </Button>
            ) : (
              <Button variant="primary" icon={ShieldCheck} disabled={!status.can_enable} onClick={() => setStep({ kind: "password", action: "enable" })}>
                Activer
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog open={step !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent
          title={step?.kind === "code" ? "Saisissez le code reçu" : step?.action === "disable" ? "Désactiver la vérification" : "Activer la vérification"}
          description={
            step?.kind === "code"
              ? `Un code vient d'être envoyé à ${step.destination}. Il est valable quelques minutes.`
              : "Confirmez avec votre mot de passe."
          }
        >
          {step?.kind === "code" ? (
            <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
              <FormField label="Code reçu par e-mail" required error={error}>
                <Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" className="tabular-nums tracking-widest" autoFocus />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={close}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" icon={ShieldCheck} loading={confirm.isPending}>
                  Confirmer
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitPassword} noValidate className="flex flex-col gap-4">
              <FormField label="Mot de passe" required error={error}>
                <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={close}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant={step?.kind === "password" && step.action === "disable" ? "destructive" : "primary"}
                  loading={start.isPending || disable.isPending}
                >
                  {step?.kind === "password" && step.action === "disable" ? "Désactiver" : "Recevoir le code"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </SettingsPanel>
  );
}

// ── Sessions ─────────────────────────────────────────────────

export interface AccountSession {
  id: string;
  device: string;
  location: string | null;
  lastActive: string | null;
  current: boolean;
}

export interface SessionsCardProps {
  query: Pick<UseQueryResult<AccountSession[]>, "data" | "isPending" | "isError" | "refetch" | "isFetching">;
  revoke: (id: string) => Promise<unknown>;
  revokeOthers: () => Promise<unknown>;
}

function deviceIcon(device: string) {
  return /android|iphone|ipad|mobile/i.test(device) ? Smartphone : Monitor;
}

export function SessionsCard({ query, revoke, revokeOthers }: SessionsCardProps) {
  const [target, setTarget] = useState<AccountSession | "others" | null>(null);
  const sessions = query.data ?? [];
  const others = sessions.filter((session) => !session.current);

  const run = async () => {
    if (!target) return;
    try {
      if (target === "others") {
        await revokeOthers();
        toast.success("Les autres sessions ont été déconnectées.");
      } else {
        await revoke(target.id);
        toast.success("Session déconnectée.");
      }
      await query.refetch();
    } catch (error) {
      toast.error(describeSettingsFailure(error, { not_found: "Cette session était déjà fermée. La liste a été actualisée." }).message);
      await query.refetch();
      throw error;
    }
  };

  return (
    <SettingsPanel
      title="Sessions actives"
      description="Les appareils connectés à votre compte."
      action={
        others.length > 0 ? (
          <Button variant="secondary" size="compact" icon={LogOut} onClick={() => setTarget("others")}>
            Déconnecter les autres
          </Button>
        ) : undefined
      }
    >
      {query.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : query.isError ? (
        <ErrorState title="Sessions indisponibles" description="La liste des sessions n'a pas pu être chargée." onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : sessions.length === 0 ? (
        <EmptyState icon={Monitor} title="Aucune session" description="Aucun appareil n'est enregistré pour ce compte." />
      ) : (
        <ul className="-my-2 divide-y divide-border">
          {sessions.map((session) => {
            const Icon = deviceIcon(session.device);
            return (
              <li key={session.id} className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-body font-medium text-foreground">
                    <span className="truncate">{session.device}</span>
                    {session.current && <Badge tone="success">Cet appareil</Badge>}
                  </p>
                  <p className="truncate text-meta text-foreground-muted tabular-nums">
                    {[session.location, session.lastActive ? `Active le ${formatWhen(session.lastActive)}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {!session.current && (
                  <Button variant="quiet" size="compact" onClick={() => setTarget(session)}>
                    Déconnecter
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target === "others" ? "Déconnecter les autres appareils ?" : "Déconnecter cet appareil ?"}
        description={
          target === "others"
            ? "Toutes les sessions sauf celle-ci seront fermées. Il faudra se reconnecter sur ces appareils."
            : `La session « ${target?.device ?? ""} » sera fermée.`
        }
        confirmLabel="Déconnecter"
        confirmIcon={LogOut}
        tone="danger"
        onConfirm={run}
      />
    </SettingsPanel>
  );
}

// ── Sign-ins recorded by the server ──────────────────────────

interface LoginEntry {
  id: string;
  device: string;
  ip: string;
  time: string;
  two_step: boolean;
}

export function LoginHistoryCard() {
  const query = useQuery({
    queryKey: ["account", "login-history"],
    queryFn: async () => (await api.get<{ data: LoginEntry[] }>("account/security/login-history")).data,
    staleTime: 60_000,
  });
  return (
    <SettingsPanel title="Historique de connexion" description="Les dernières connexions réussies à votre compte depuis le web.">
      {query.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : query.isError ? (
        <ErrorState title="Historique indisponible" description="L'historique n'a pas pu être chargé." onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={History} title="Aucune connexion enregistrée" description="Les connexions sont enregistrées depuis octobre 2026 ; les suivantes apparaîtront ici." />
      ) : (
        <ul className="-my-2 divide-y divide-border">
          {query.data.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-body text-foreground">{entry.device}</p>
                <p className="truncate text-meta text-foreground-muted tabular-nums">
                  {entry.ip || "Adresse inconnue"}
                  {entry.two_step ? " · avec code" : ""}
                </p>
              </div>
              <span className="shrink-0 text-meta text-foreground-muted tabular-nums">{formatWhen(entry.time)}</span>
            </li>
          ))}
        </ul>
      )}
    </SettingsPanel>
  );
}

// ── The section ──────────────────────────────────────────────

type SecurityView = "password" | "verification" | "sessions" | "history";

export interface SecuritySectionProps {
  password: PasswordCardProps;
  sessions: SessionsCardProps;
  /** Something said above the blocks (e.g. the account it is). */
  intro?: ReactNode;
}

/**
 * From 1024px the four blocks follow each other. On a phone, the mock-up's
 * list: one line per block, opening it.
 */
export function SecuritySection({ password, sessions, intro }: SecuritySectionProps) {
  const [view, setView] = useState<SecurityView | null>(null);
  const verification = useLoginVerification();
  const count = sessions.query.data?.length;

  const blocks: Record<SecurityView, ReactNode> = {
    password: <PasswordCard {...password} />,
    verification: <LoginVerificationCard />,
    sessions: <SessionsCard {...sessions} />,
    history: <LoginHistoryCard />,
  };
  const titles: Record<SecurityView, string> = {
    password: "Mot de passe",
    verification: "Vérification en deux étapes",
    sessions: "Sessions actives",
    history: "Historique de connexion",
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {intro}
      <div className="hidden flex-col gap-5 lg:flex">
        {blocks.password}
        {blocks.verification}
        {blocks.sessions}
        {blocks.history}
      </div>

      <div className="lg:hidden">
        {view === null ? (
          <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border bg-surface">
            <li>
              <LinkRow icon={KeyRound} title="Changer le mot de passe" onSelect={() => setView("password")} />
            </li>
            <li>
              <LinkRow
                icon={ShieldCheck}
                title="Authentification à deux facteurs"
                onSelect={() => setView("verification")}
                badge={verification.data ? <Badge tone={verification.data.enabled ? "success" : "danger"}>{verification.data.enabled ? "Activée" : "Désactivée"}</Badge> : undefined}
              />
            </li>
            <li>
              <LinkRow icon={Monitor} title="Sessions actives" detail={count === undefined ? undefined : count === 1 ? "1 session" : `${count} sessions`} onSelect={() => setView("sessions")} />
            </li>
            <li>
              <LinkRow icon={History} title="Historique de connexion" onSelect={() => setView("history")} />
            </li>
          </ul>
        ) : (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setView(null)} className={cn("flex min-h-touch items-center gap-1 self-start rounded-pill pr-3 text-label text-primary hover:bg-brand-subtle")}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              Sécurité
            </button>
            <h2 className="sr-only">{titles[view]}</h2>
            {blocks[view]}
          </div>
        )}
      </div>
    </div>
  );
}
