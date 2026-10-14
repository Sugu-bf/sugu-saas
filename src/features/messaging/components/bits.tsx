"use client";

import Link from "next/link";
import { AlertCircle, Check, CheckCheck, Clock, Download, FileText, Package, WifiOff } from "lucide-react";
import { Badge, cn, formatMoneyFromFrancs } from "@/design-system";
import { attachmentHref } from "../api";
import type { Attachment, ProductCard } from "../contract";
import { extensionOf } from "../contract";
import { formatFileSize, formatFullDate } from "../format";
import type { SocketState } from "../realtime";

// ============================================================
// Small pieces of a thread, shared by conversations and tickets.
// ============================================================

/** State of a message of the reader, as far as it is really known. */
export type DeliveryMark = "sending" | "sent" | "read" | "failed";

const MARKS: Record<DeliveryMark, { icon: typeof Check; label: string; className: string }> = {
  sending: { icon: Clock, label: "En cours d'envoi", className: "text-foreground-subtle" },
  sent: { icon: Check, label: "Envoyé", className: "text-foreground-subtle" },
  read: { icon: CheckCheck, label: "Lu", className: "text-info-icon" },
  failed: { icon: AlertCircle, label: "Non envoyé", className: "text-danger-icon" },
};

export function DeliveryTick({ mark, className }: { mark: DeliveryMark; className?: string }) {
  const { icon: Icon, label, className: tone } = MARKS[mark];
  return (
    <span className={cn("inline-flex items-center", tone, className)} data-mark={mark}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Count of unread messages of a row: the one place where orange is a number. */
export function UnreadCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-meta font-semibold text-primary-foreground tabular-nums">
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{count === 1 ? "1 message non lu" : `${count} messages non lus`}</span>
    </span>
  );
}

/** An image of a thread: shown, and opened full size in a new tab through the portal. */
export function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const href = attachmentHref(attachment.path);
  if (!href) return <FileAttachment attachment={attachment} />;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-fit overflow-hidden rounded-panel border border-border bg-surface-subtle"
      aria-label={`Ouvrir l'image ${attachment.name}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a private file relayed with the session: the image optimiser cannot read it. */}
      <img src={href} alt={attachment.name} loading="lazy" decoding="async" className="block max-h-64 w-auto max-w-full object-contain sm:max-w-xs" />
    </a>
  );
}

export function FileAttachment({ attachment, tone = "plain" }: { attachment: Attachment; tone?: "plain" | "onPrimary" }) {
  const href = attachmentHref(attachment.path);
  const extension = extensionOf(attachment.name).toUpperCase();
  const detail = [attachment.size > 0 ? formatFileSize(attachment.size) : null, extension || null].filter(Boolean).join(" · ");

  return (
    <div className={cn("flex w-fit max-w-full items-center gap-3 rounded-panel border px-3 py-2", tone === "onPrimary" ? "border-border bg-surface" : "border-border bg-surface")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-danger-bg text-danger-icon">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-label text-foreground">{attachment.name}</span>
        {detail && <span className="block text-meta text-foreground-subtle">{detail}</span>}
      </span>
      {href ? (
        <a
          href={href}
          download={attachment.name}
          className="ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-button border border-border-strong text-foreground-muted hover:bg-surface-subtle hover:text-foreground touch:size-11"
          aria-label={`Télécharger ${attachment.name}`}
        >
          <Download className="size-4" aria-hidden="true" />
        </a>
      ) : (
        <span className="text-meta text-foreground-subtle">Indisponible</span>
      )}
    </div>
  );
}

export function Attachments({ attachments, align }: { attachments: Attachment[]; align: "start" | "end" }) {
  if (attachments.length === 0) return null;
  return (
    <ul className={cn("flex flex-col gap-1.5", align === "end" ? "items-end" : "items-start")}>
      {attachments.map((attachment) => (
        <li key={attachment.id} className="max-w-full">
          {attachment.kind === "image" ? <ImageAttachment attachment={attachment} /> : <FileAttachment attachment={attachment} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * A product a store shared. The price shown is the one of the product now,
 * when the server gives it; the card says so when it differs from the price
 * at the time it was sent, and when the product is no longer on sale.
 */
export function ProductCardView({ product, sentAt, href }: { product: ProductCard; sentAt: string; href: string | null }) {
  const current = product.current;
  const available = current ? current.available : true;
  const price = current?.price ?? product.sentPrice;
  const priceChanged = current?.price != null && current.price !== product.sentPrice;

  return (
    <div className="w-72 max-w-full rounded-panel border-2 border-brand bg-surface p-3" data-product-card={product.id}>
      <div className="flex gap-3">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-subtle text-foreground-subtle">
          {product.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- a public product picture of the catalogue, at thumbnail size.
            <img src={product.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <Package className="size-6" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold text-foreground">{product.name}</p>
          <div className="mt-1">
            {!available ? (
              <Badge tone="neutral">Plus en vente</Badge>
            ) : current && !current.inStock ? (
              <Badge tone="warning">En rupture</Badge>
            ) : current ? (
              <Badge tone="success">En stock</Badge>
            ) : null}
          </div>
          {available && <p className="mt-1 text-body font-semibold text-primary tabular-nums">{formatMoneyFromFrancs(price)}</p>}
          {product.category && <p className="truncate text-meta text-foreground-subtle">{product.category}</p>}
        </div>
      </div>
      {priceChanged && available && (
        <p className="mt-2 text-meta text-foreground-muted">
          Prix actuel. À l&apos;envoi : <span className="tabular-nums">{formatMoneyFromFrancs(product.sentPrice)}</span>
        </p>
      )}
      {href && (
        <Link
          href={href}
          className="mt-2 flex h-control items-center justify-center rounded-button bg-brand-subtle text-label font-medium text-primary-hover hover:bg-surface-hover touch:h-touch"
        >
          Voir le produit
        </Link>
      )}
      <p className="mt-2 text-meta text-foreground-subtle">Envoyé le {formatFullDate(sentAt)}</p>
    </div>
  );
}

const SOCKET_NOTE: Partial<Record<SocketState, string>> = {
  offline: "Temps réel indisponible : les nouveaux messages sont vérifiés toutes les 15 secondes.",
};

/** Said only when the socket is known to be away: the screen then asks the API at intervals. */
export function ConnectionNote({ state, className }: { state: SocketState; className?: string }) {
  const note = SOCKET_NOTE[state];
  if (!note) return null;
  return (
    <p role="status" className={cn("flex items-center gap-2 border-b border-warning-border bg-warning-bg px-4 py-1.5 text-meta text-warning-fg", className)}>
      <WifiOff className="size-3.5 shrink-0 text-warning-icon" aria-hidden="true" />
      {note}
    </p>
  );
}
