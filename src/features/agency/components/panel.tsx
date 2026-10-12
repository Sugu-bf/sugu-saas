"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle, type LucideIcon } from "lucide-react";
import { Card, IconButton, Tooltip, buttonVariants, cn, iconTileClass, type Tone } from "@/design-system";
import { whatsappHref } from "../format";

/** A titled card of a detail page: an icon in a tinted tile, the title, its action, the content. */
export function Panel({
  title,
  icon,
  tone = "brand",
  actions,
  description,
  children,
  className,
  flush = false,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: Tone | "brand";
  actions?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** The content goes edge to edge (a table): only the heading keeps the padding. */
  flush?: boolean;
}) {
  const Icon = icon;
  return (
    <Card flush className={cn("min-w-0", className)}>
      <section className="flex h-full flex-col">
        {/*
          One line while it fits: the title keeps ten rems (sixteen with a
          description under it) before the actions drop under it, where they
          wrap in turn. Kept beside the title at any cost, three buttons ran
          over it and out of the card on a phone.
        */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 p-4 pb-3">
          <div className={cn("flex min-w-0 flex-1 gap-2.5", description ? "basis-64 items-start" : "basis-40 items-center")}>
            {Icon && (
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-control", iconTileClass[tone])}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-section-title text-foreground">{title}</h2>
              {description && <p className="mt-0.5 text-body text-foreground-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className={cn("min-w-0 flex-1", !flush && "px-4 pb-4")}>{children}</div>
      </section>
    </Card>
  );
}

/** Copies a value (a number, a phone) and says so. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copié dans le presse-papiers.");
    } catch {
      toast.error("La copie n'a pas été possible. Sélectionnez le texte pour le copier.");
    }
  }
  return <IconButton icon={Copy} label={label} size="compact" onClick={copy} className="-my-1.5" />;
}

/** Opens a WhatsApp conversation with someone, next to his phone number. */
export function WhatsAppLink({ phone, name }: { phone: string; name: string }) {
  const label = `Écrire à ${name} sur WhatsApp`;
  return (
    <Tooltip content={label}>
      <a
        href={whatsappHref(phone)}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        className={cn(buttonVariants({ variant: "quiet", size: "compact", iconOnly: true }), "-my-1.5")}
      >
        <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      </a>
    </Tooltip>
  );
}
