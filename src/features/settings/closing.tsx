"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock3, Trash2 } from "lucide-react";
import { Alert, Button, ConfirmDialog, ErrorState, FormField, Input, PasswordInput, Skeleton, formatMoneyFromCents, asCents } from "@/design-system";
import { api } from "@/lib/http/client";
import { ApiError } from "@/lib/http/api-error";
import { logout } from "@/features/auth/service";
import { SettingsPanel } from "./parts";
import { describeSettingsFailure } from "./use-draft";

// ============================================================
// Closing an account. The server refuses while something is still
// owed or on its way (orders, deliveries, money, cash): the list
// comes from it before anything is asked, and again at the end if
// something changed in between. History stays (soft deletion).
// ============================================================

export interface DeletionBlocker {
  code: string;
  message: string;
  count?: number;
  /** Centimes. */
  amount?: number;
}

export interface ClosingPanelProps {
  /** GET path answering `{ data: { blockers } }`. */
  checkPath: string;
  /** Sends the deletion with the password; throws the refusal. */
  submit: (password: string) => Promise<unknown>;
  /** What closing does, for this profile. */
  consequences: ReactNode[];
}

const CONFIRM_WORD = "SUPPRIMER";

export function ClosingPanel({ checkPath, submit, consequences }: ClosingPanelProps) {
  const router = useRouter();
  const client = useQueryClient();
  const check = useQuery({
    queryKey: ["account", "deletion-check", checkPath],
    queryFn: async () => (await api.get<{ data: { blockers: DeletionBlocker[] } }>(checkPath)).data.blockers,
    staleTime: 0,
  });
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const [errors, setErrors] = useState<{ password?: string; word?: string }>({});
  const [asking, setAsking] = useState(false);

  const blockers = check.data ?? [];
  const blocked = blockers.length > 0;

  const prepare = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!password) next.password = "Saisissez votre mot de passe.";
    if (word.trim() !== CONFIRM_WORD) next.word = `Écrivez ${CONFIRM_WORD} en majuscules.`;
    setErrors(next);
    if (Object.keys(next).length === 0) setAsking(true);
  };

  const close = async () => {
    try {
      await submit(password);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Something new since the check (an order, a withdrawal): read the
        // list again and show it; nothing was closed.
        await check.refetch();
      } else {
        const failure = describeSettingsFailure(error);
        if (failure.fields.password) setErrors({ password: failure.fields.password });
        else setErrors({ password: failure.kind === "validation" ? "Mot de passe incorrect." : failure.message });
      }
      throw error;
    }
    await logout().catch(() => undefined);
    client.clear();
    router.replace("/login?reason=account_closed");
  };

  return (
    <SettingsPanel primary title="Supprimer le compte" description="Une décision définitive : lisez ce qu'elle entraîne avant de confirmer.">
      <Alert tone="danger" title="Cette action est définitive">
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {consequences.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      </Alert>

      {check.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : check.isError ? (
        <ErrorState title="Vérification impossible" description="Nous n'avons pas pu vérifier si votre compte peut être fermé. Réessayez." onRetry={() => check.refetch()} retrying={check.isFetching} />
      ) : blocked ? (
        <Alert tone="warning" title="Votre compte ne peut pas encore être fermé">
          <ul className="mt-1 space-y-1.5">
            {blockers.map((blocker) => (
              <li key={blocker.code} className="flex items-start gap-2">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {blocker.message}
                  {typeof blocker.amount === "number" && blocker.amount > 0 && (
                    <span className="font-semibold tabular-nums"> ({formatMoneyFromCents(asCents(blocker.amount))})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <form onSubmit={prepare} noValidate className="flex max-w-xl flex-col gap-4" aria-label="Supprimer le compte">
        <FormField label="Mot de passe" required error={errors.password} disabled={blocked}>
          <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </FormField>
        <FormField label={`Pour confirmer, écrivez ${CONFIRM_WORD}`} required error={errors.word} disabled={blocked}>
          <Input value={word} onChange={(event) => setWord(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </FormField>
        <div>
          <Button type="submit" variant="destructive" icon={Trash2} disabled={blocked || check.isPending || check.isError}>
            Supprimer mon compte
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="Supprimer définitivement votre compte ?"
        description={
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-icon" aria-hidden="true" />
            Vous serez déconnecté et ne pourrez plus vous connecter avec ce compte.
          </span>
        }
        confirmLabel="Supprimer définitivement"
        confirmIcon={Trash2}
        tone="danger"
        onConfirm={close}
      />
    </SettingsPanel>
  );
}

/** A setting the platform does not offer yet: said plainly, nothing to press. */
export function UnavailablePanel({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <SettingsPanel title={title} description={description}>
      {children}
    </SettingsPanel>
  );
}
