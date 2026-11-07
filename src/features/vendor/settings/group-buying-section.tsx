"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Boxes, Package, PowerOff, Share2, ShoppingBag, Store, Tags, TrendingDown, Users } from "lucide-react";
import { Alert, Button, ConfirmDialog, EmptyState, ErrorState, Skeleton } from "@/design-system";
import { SettingsGroup, SettingsPanel, ToggleRow, describeSettingsFailure, describeSettingsLoadFailure } from "@/features/settings";
import { formatUnits } from "@/features/vendor/clients/components/bits";
import { GROUP_BUYS, PRODUCTS } from "@/features/vendor/group-buys/components/bits";
import type { StoreGroupBuying, StoreOptionChange } from "@/features/vendor/group-buys/contract";
import { useGroupBuyingSettings, useSaveStoreGroupBuying } from "@/features/vendor/group-buys/hooks";

// "Achat groupé": the option of each store the seller owns. A switch applies
// at once, through the server; nothing shows as changed before it answered.
// Turning it off stops the groups still open on the store's products, at no
// cost for the buyers, so it is asked first.

const STEPS = [
  {
    icon: Share2,
    title: "Un client lance un groupe",
    text: "Sur un produit qui a des prix par quantité, puis il le partage à ses proches, sur WhatsApp par exemple.",
  },
  {
    icon: TrendingDown,
    title: "Le prix baisse pour tous",
    text: "Chaque palier atteint fait baisser le prix pour tout le groupe. La remise vient de vos propres paliers.",
  },
  {
    icon: ShoppingBag,
    title: "Chacun commande sa part",
    text: "À la clôture, chacun commande au prix atteint et paie comme d'habitude, à la livraison ou par mobile money. Vous recevez des commandes normales.",
  },
];

export function GroupBuyingSection() {
  const settings = useGroupBuyingSettings();

  return (
    <SettingsPanel
      primary
      title="Achat groupé"
      description="Vos clients se regroupent pour atteindre vos prix par quantité."
      action={
        <Button asChild variant="secondary" size="compact" icon={Users}>
          <Link href={GROUP_BUYS}>Voir les groupes</Link>
        </Button>
      }
    >
      {settings.isPending ? (
        <>
          <span className="sr-only" role="status">
            Chargement du réglage…
          </span>
          <Skeleton className="h-56 w-full rounded-panel" />
        </>
      ) : settings.isError ? (
        <ErrorState title="Réglage indisponible" description={describeSettingsLoadFailure(settings.error)} onRetry={() => void settings.refetch()} retrying={settings.isFetching} />
      ) : settings.data.stores.length === 0 ? (
        <EmptyState icon={Store} title="Aucune boutique" description="L'achat groupé se règle boutique par boutique : votre compte n'en a pas encore." />
      ) : (
        settings.data.stores.map((store) => <StoreOptions key={store.id} store={store} />)
      )}

      <SettingsGroup title="Comment ça marche">
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 rounded-panel border border-border p-3 md:flex-col">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-body font-medium text-foreground">{title}</span>
                <span className="block text-meta text-foreground-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </SettingsGroup>
    </SettingsPanel>
  );
}

function StoreOptions({ store }: { store: StoreGroupBuying }) {
  const save = useSaveStoreGroupBuying();
  // `isPending` disables the switches on the next render: a second tap that lands before it must not send twice.
  const lock = useRef(false);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const headingId = useId();

  /** Sends the change; says what the server answered, or why it refused. Rejects on failure. */
  const apply = async (change: Omit<StoreOptionChange, "storeId">, said: (message: string | null) => string) => {
    if (lock.current) return;
    lock.current = true;
    try {
      const saved = await save.mutateAsync({ storeId: store.id, ...change });
      toast.success(said(saved.message));
    } catch (error) {
      toast.error(describeSettingsFailure(error).message);
      throw error;
    } finally {
      lock.current = false;
    }
  };

  const switchOn = () => void apply({ enabled: true, sharedMoq: store.sharedMoq }, (message) => message ?? "L'achat groupé est activé pour cette boutique.").catch(() => undefined);

  // The server's sentence speaks of the main option: this one says what changed.
  const switchSharedMoq = (next: boolean) =>
    void apply({ enabled: store.enabled, sharedMoq: next }, () => (next ? "Le minimum de commande partagé est activé." : "Le minimum de commande partagé est désactivé.")).catch(() => undefined);

  const count = store.productsWithTiers;

  return (
    <div role="group" aria-labelledby={headingId} className="min-w-0 rounded-panel border border-border">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Store className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
        <h3 id={headingId} className="min-w-0 flex-1 truncate text-label font-semibold text-foreground">
          {store.name}
        </h3>
      </div>

      <div className="divide-y divide-border px-4">
        <ToggleRow
          icon={Users}
          title="Autoriser l'achat groupé"
          description="Vos clients se regroupent pour atteindre vos prix par quantité. Le désactiver arrête les groupes encore ouverts, sans frais pour les acheteurs ; ceux au prix obtenu vont jusqu’au bout des commandes."
          checked={store.enabled}
          onCheckedChange={(next) => (next ? switchOn() : setConfirmingOff(true))}
          disabled={save.isPending}
        />
        <ToggleRow
          icon={Boxes}
          title="Minimum de commande partagé"
          description="Pour un produit à quantité minimale élevée : chacun commande sa part, le minimum se compte sur le total du groupe. Sinon, seule la personne qui a lancé le groupe commande, pour tous."
          checked={store.sharedMoq}
          onCheckedChange={switchSharedMoq}
          disabled={save.isPending}
          lockedNote={store.enabled ? undefined : "Activez d'abord l'achat groupé."}
        />
      </div>

      <div className="border-t border-border px-4 py-3">
        {count > 0 ? (
          <p className="flex items-start gap-2 text-body text-foreground">
            <Tags className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
            <span>
              {count === 1 ? "1 produit a des prix par quantité : il peut être acheté en groupe." : `${formatUnits(count)} produits ont des prix par quantité : ils peuvent être achetés en groupe.`}
            </span>
          </p>
        ) : (
          <Alert
            tone="info"
            title="Aucun produit n'a de prix par quantité"
            actions={
              <Button asChild size="compact" icon={Package}>
                <Link href={PRODUCTS}>Voir mes produits</Link>
              </Button>
            }
          >
            Ajoutez des prix par quantité à vos produits pour qu&apos;ils puissent être achetés en groupe.
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={confirmingOff}
        onOpenChange={setConfirmingOff}
        title="Désactiver l'achat groupé ?"
        description={`Les groupes encore ouverts sur les produits de ${store.name} seront arrêtés, sans frais pour les acheteurs, qui sont prévenus. Ceux dont le prix est déjà obtenu continuent : leurs membres peuvent encore commander.`}
        confirmLabel="Désactiver"
        confirmIcon={PowerOff}
        tone="danger"
        onConfirm={() => apply({ enabled: false, sharedMoq: store.sharedMoq }, (message) => message ?? "L'achat groupé est désactivé pour cette boutique.")}
      />
    </div>
  );
}
