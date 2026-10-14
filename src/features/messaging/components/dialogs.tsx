"use client";

import { useEffect, useRef, useState } from "react";
import { Package, Search } from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Dialog, DialogContent, EmptyState, ErrorState, FormField, Input, Select, Skeleton, Textarea, formatMoneyFromFrancs } from "@/design-system";
import { REPORT_REASONS, type MessagingScope } from "../api";
import type { Conversation, Message } from "../contract";
import { describeMessagingFailure, useConversationAction, useReportMessage, useShareableProducts } from "../hooks";

// ============================================================
// What a seller or a courier decides about a conversation: share a
// product, report a message, close, block. Each one is said to have
// happened only once the server has answered.
// ============================================================

export function ShareProductDialog({
  open,
  onOpenChange,
  conversationId,
  onShare,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onShare: (product: { id: string; name: string }) => void;
}) {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  // One card per opening of the dialog: a second click before it closes shares nothing more.
  const shared = useRef(false);
  useEffect(() => {
    if (open) shared.current = false;
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), 300);
    return () => clearTimeout(timer);
  }, [typed]);

  const products = useShareableProducts(conversationId, search, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Partager un produit" description="Les produits en vente de votre boutique. Le client reçoit une carte avec le nom, la photo et le prix.">
        <div className="space-y-3 p-4">
          <Input
            type="search"
            leadingIcon={Search}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher un produit"
            maxLength={80}
          />

          <div className="max-h-80 min-h-40 overflow-y-auto">
            {products.isLoading ? (
              <ul aria-busy="true" aria-label="Chargement des produits" className="space-y-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-14 w-full" />
                  </li>
                ))}
              </ul>
            ) : products.isError ? (
              <ErrorState title="Impossible de charger vos produits" onRetry={() => void products.refetch()} retrying={products.isRefetching} />
            ) : (products.data ?? []).length === 0 ? (
              <EmptyState icon={Package} title={search ? "Aucun produit ne correspond" : "Aucun produit en vente"} description={search ? "Modifiez la recherche." : "Seuls les produits en ligne peuvent être partagés."} />
            ) : (
              <ul className="divide-y divide-border">
                {(products.data ?? []).map((product) => (
                  <li key={product.id} className="flex items-center gap-3 py-2">
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-subtle text-foreground-subtle">
                      {product.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a public product picture of the catalogue, at thumbnail size.
                        <img src={product.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <Package className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label text-foreground">{product.name}</span>
                      <span className="block text-meta text-foreground-muted tabular-nums">
                        {formatMoneyFromFrancs(product.price)}
                        {!product.inStock && " · En rupture"}
                      </span>
                    </span>
                    <Button
                      size="compact"
                      variant="outline"
                      aria-label={`Partager ${product.name}`}
                      onClick={() => {
                        if (shared.current) return;
                        shared.current = true;
                        onShare({ id: product.id, name: product.name });
                        onOpenChange(false);
                      }}
                    >
                      Partager
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReportDialog({ scope, conversationId, message, onClose }: { scope: MessagingScope; conversationId: string; message: Message | null; onClose: () => void }) {
  const report = useReportMessage(scope, conversationId);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason("");
    setNote("");
    setError(null);
    onClose();
  };

  const reporting = useRef(false);
  const submit = () => {
    if (!message || reporting.current) return;
    if (!reason) {
      setError("Choisissez une raison.");
      return;
    }
    setError(null);
    reporting.current = true;
    report.mutate(
      { messageId: message.id, reason, note },
      {
        onSuccess: () => {
          toast.success("Message signalé à l'équipe SUGU.");
          close();
        },
        onError: (failure) => setError(describeMessagingFailure(failure).message),
        onSettled: () => {
          reporting.current = false;
        },
      },
    );
  };

  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        title="Signaler un message"
        description="Le message est transmis à l'équipe SUGU, qui décide de la suite. Votre correspondant n'est pas prévenu."
        footer={
          <>
            <Button onClick={close}>Annuler</Button>
            <Button variant="primary" onClick={submit} loading={report.isPending}>
              Signaler
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-4">
          {message && (
            <blockquote className="max-h-24 overflow-y-auto rounded-control border border-border bg-surface-subtle px-3 py-2 text-body text-foreground-muted">
              {message.body || "Pièce jointe"}
            </blockquote>
          )}
          <FormField label="Raison" required error={error}>
            <Select value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Choisir une raison">
              {REPORT_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Précision" hint="Facultatif, 500 caractères au plus.">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} />
          </FormField>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type ConversationDecision = "close" | "block" | null;

/** Closing and blocking, each confirmed in plain words. The dialog stays open if the server refuses. */
export function DecisionDialog({
  scope,
  conversation,
  decision,
  onClose,
}: {
  scope: MessagingScope;
  conversation: Conversation;
  decision: ConversationDecision;
  onClose: () => void;
}) {
  const action = useConversationAction(scope, conversation.id);
  const blocking = decision === "block";

  return (
    <ConfirmDialog
      open={decision !== null}
      onOpenChange={(open) => !open && onClose()}
      title={blocking ? "Bloquer ce client ?" : "Fermer la conversation ?"}
      description={
        blocking
          ? `${conversation.peer.name} ne pourra plus vous écrire, et vous ne pourrez plus lui écrire. Ce blocage ne peut pas être levé depuis le portail.`
          : "Plus aucun message ne pourra y être envoyé. Elle se rouvre si le client reprend contact depuis votre boutique."
      }
      confirmLabel={blocking ? "Bloquer" : "Fermer la conversation"}
      tone={blocking ? "danger" : "default"}
      onConfirm={async () => {
        try {
          await action.mutateAsync(blocking ? { type: "block", reason: null } : { type: "close" });
          toast.success(blocking ? "Client bloqué." : "Conversation fermée.");
        } catch (error) {
          toast.error(describeMessagingFailure(error).message);
          throw error;
        }
      }}
    />
  );
}
