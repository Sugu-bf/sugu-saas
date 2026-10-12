"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound, Link2, RefreshCw } from "lucide-react";
import { Button, ConfirmDialog, IconButton, Skeleton } from "@/design-system";
import { useAgencyInvitationCode, useRegenerateInvitationCode } from "@/features/agency/hooks";
import { Panel } from "./panel";

/** The code with its middle hidden: enough to recognise it, not enough to use it. */
export function maskCode(code: string): string {
  if (code.length <= 6) return "•".repeat(code.length);
  return code.slice(0, 4) + "•".repeat(code.length - 6) + code.slice(-2);
}

/**
 * The code a courier types at sign-up to join the agency, and the sign-up
 * link that carries it. Hidden until asked for; replacing it makes the old
 * one useless, which is said before it is done.
 */
export function InvitationCode({ className }: { className?: string }) {
  const code = useAgencyInvitationCode();
  const regenerate = useRegenerateInvitationCode();
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error("La copie n'a pas été possible. Affichez le code pour le recopier.");
    }
  }

  async function renew() {
    try {
      await regenerate.mutateAsync();
      toast.success("Nouveau code de recrutement généré.");
    } catch (error) {
      toast.error("Le code n'a pas pu être généré. Réessayez dans un instant.");
      throw error;
    }
  }

  const data = code.data;
  const hasCode = Boolean(data?.code);

  return (
    <Panel
      title="Code de recrutement"
      icon={KeyRound}
      tone="neutral"
      className={className}
      description={hasCode ? "Un livreur le saisit à son inscription pour rejoindre votre agence." : undefined}
    >
      {code.isLoading ? (
        <Skeleton className="h-control w-full" />
      ) : !hasCode || !data ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body text-foreground-muted">
            {code.isError ? "Le code n'a pas pu être chargé." : "Votre agence n'a pas encore de code de recrutement."}
          </p>
          <Button icon={RefreshCw} loading={regenerate.isPending} onClick={() => renew().catch(() => undefined)}>
            Générer un code
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 rounded-control border border-border bg-surface-subtle py-1 pr-1 pl-3">
            {/* On several lines rather than cut: a real code is longer than the box beside the list is wide. */}
            <output aria-label="Code de recrutement" className="min-w-0 flex-1 py-1 font-mono text-body font-semibold tracking-wider break-all text-foreground select-all">
              {visible ? data.code : maskCode(data.code)}
            </output>
            <IconButton icon={visible ? EyeOff : Eye} label={visible ? "Masquer le code" : "Afficher le code"} size="compact" aria-pressed={visible} onClick={() => setVisible(!visible)} />
            <IconButton icon={Copy} label="Copier le code" size="compact" onClick={() => copy(data.code, "Code copié.")} />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.link && (
              <Button size="compact" icon={Link2} onClick={() => copy(data.link, "Lien d'inscription copié.")}>
                Copier le lien d&apos;inscription
              </Button>
            )}
            <Button size="compact" variant="quiet" icon={RefreshCw} onClick={() => setConfirming(true)}>
              Remplacer le code
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Remplacer le code de recrutement ?"
        description="L'ancien code et le lien qui le contient ne fonctionneront plus. Les livreurs déjà inscrits ne sont pas concernés."
        confirmLabel="Remplacer le code"
        confirmIcon={RefreshCw}
        onConfirm={renew}
      />
    </Panel>
  );
}
