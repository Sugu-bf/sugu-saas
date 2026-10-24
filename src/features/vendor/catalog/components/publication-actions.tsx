"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, EyeOff, Globe, PencilLine, type LucideIcon } from "lucide-react";
import { ConfirmDialog } from "@/design-system";
import type { ProductListItem, PublicationAction } from "../contract";
import { describeFailure } from "../errors";
import { useChangeProductStatus } from "../hooks";

// ============================================================
// What the seller decides alone about publication (ProductStatus::
// sellerTransitions): offline and back online, back to draft, archived.
// The server lists the changes each product allows (`sellerActions`);
// this module only words them, asks for confirmation, and reports.
// ============================================================

type Product = Pick<ProductListItem, "id" | "name" | "status" | "publicationActions">;

interface Wording {
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  confirmLabel: string;
  done: string;
  tone: "default" | "danger";
}

export function publicationWording(product: Pick<Product, "name" | "status">, action: PublicationAction): Wording {
  const name = `« ${product.name} »`;
  switch (action) {
    case "unpublished":
      return {
        label: "Mettre hors ligne",
        icon: EyeOff,
        title: `Mettre ${name} hors ligne ?`,
        description: "Les acheteurs ne le voient plus. Vous le remettez en ligne quand vous voulez, sans nouvelle validation.",
        confirmLabel: "Mettre hors ligne",
        done: `${name} est hors ligne.`,
        tone: "default",
      };
    case "published":
      return {
        label: "Remettre en ligne",
        icon: Globe,
        title: `Remettre ${name} en ligne ?`,
        description: "Il redevient visible par les acheteurs, tel que l'équipe SUGU l'a approuvé.",
        confirmLabel: "Remettre en ligne",
        done: `${name} est de nouveau en ligne.`,
        tone: "default",
      };
    case "archived":
      return {
        label: "Archiver",
        icon: Archive,
        title: `Archiver ${name} ?`,
        description: "Il n'est plus proposé aux acheteurs. Vous pourrez le restaurer en brouillon.",
        confirmLabel: "Archiver",
        done: `${name} est archivé.`,
        tone: "default",
      };
    case "draft":
      if (product.status === "archived") {
        return {
          label: "Restaurer en brouillon",
          icon: ArchiveRestore,
          title: `Restaurer ${name} en brouillon ?`,
          description: "Il revient dans vos brouillons. Soumettez-le à validation pour le remettre en vente.",
          confirmLabel: "Restaurer en brouillon",
          done: `${name} est restauré en brouillon.`,
          tone: "default",
        };
      }
      if (product.status === "submitted") {
        return {
          label: "Retirer de la validation",
          icon: PencilLine,
          title: `Retirer ${name} de la validation ?`,
          description: "Il repasse en brouillon : l'équipe SUGU ne l'examine plus. Soumettez-le à nouveau une fois prêt.",
          confirmLabel: "Retirer de la validation",
          done: `${name} est repassé en brouillon.`,
          tone: "default",
        };
      }
      return {
        label: "Repasser en brouillon",
        icon: PencilLine,
        title: `Repasser ${name} en brouillon ?`,
        description:
          "Il n'est plus visible par les acheteurs. Pour le remettre en vente, il faudra le soumettre à nouveau à validation. Pour une simple pause, mettez-le plutôt hors ligne.",
        confirmLabel: "Repasser en brouillon",
        done: `${name} est repassé en brouillon.`,
        tone: "default",
      };
  }
}

/**
 * The publication changes of a product as menu entries, and the dialog that
 * confirms the one chosen. Render `dialog` once in the screen.
 */
export function usePublicationActions() {
  const change = useChangeProductStatus();
  const [pending, setPending] = useState<{ product: Product; action: PublicationAction } | null>(null);
  // Kept while the dialog closes, so its text does not empty itself.
  const [shown, setShown] = useState<{ product: Product; action: PublicationAction } | null>(null);

  function ask(product: Product, action: PublicationAction) {
    setPending({ product, action });
    setShown({ product, action });
  }

  function entries(product: Product) {
    return product.publicationActions.map((action) => {
      const wording = publicationWording(product, action);
      return { action, label: wording.label, icon: wording.icon, onSelect: () => ask(product, action) };
    });
  }

  async function confirm() {
    if (!pending) return;
    const { product, action } = pending;
    try {
      await change.mutateAsync({ id: product.id, status: action });
      toast.success(publicationWording(product, action).done);
    } catch (error) {
      // The server says why (a suspended product, a status that moved meanwhile).
      toast.error(describeFailure(error).message);
      throw error;
    }
  }

  const wording = shown ? publicationWording(shown.product, shown.action) : null;
  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => !open && setPending(null)}
      title={wording?.title ?? ""}
      description={wording?.description ?? ""}
      confirmLabel={wording?.confirmLabel ?? ""}
      confirmIcon={wording?.icon}
      tone={wording?.tone ?? "default"}
      onConfirm={confirm}
    />
  );

  return { entries, ask, dialog, isPending: change.isPending };
}
