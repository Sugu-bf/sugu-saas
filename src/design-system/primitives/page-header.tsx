"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import { Button, IconButton } from "./button";
import { DropdownMenu, DropdownMenuItem } from "./dropdown-menu";

export interface PageAction {
  label: string;
  icon: LucideIcon;
  /** Either a handler or a destination. */
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  /** `danger` for an action that cannot be taken back; only shown in a menu. */
  tone?: "danger";
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /**
   * Shows the description from 768px only: on a phone, a sentence that says
   * what the page is for pushes the list it introduces down the screen.
   */
  hideDescriptionOnPhone?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * The way back to the list a detail page was opened from ("Retour aux
   * livraisons"), above the title. Use it or `breadcrumbs`, not both.
   */
  back?: { label: string; href: string };
  /** The one main action of the page. Always visible, on every screen size. */
  primaryAction?: PageAction;
  /** Shown as buttons from 768px; folded into a "Plus d'actions" menu on phones. */
  secondaryActions?: PageAction[];
  /**
   * Less frequent actions, behind a "Plus d'actions" menu at every width.
   * On a phone the secondary actions join them in that one menu.
   */
  moreActions?: PageAction[];
  /** Extra content next to the title, e.g. a `StatusBadge`. */
  titleAddon?: ReactNode;
  /** What the page is about, before its title: the picture of a person, of a product. */
  leading?: ReactNode;
  /**
   * For a page with many actions: from 1280px they keep to half the row
   * and run on two lines, the main one on top, so that the title keeps its
   * line. Without it the actions stay on one row.
   */
  stackActions?: boolean;
  /**
   * A piece of information next to the actions, e.g. the day a board is
   * about. Not a control. Shown from 768px: a phone keeps the row for the
   * actions.
   */
  meta?: ReactNode;
  className?: string;
}

function ActionButton({ action, variant }: { action: PageAction; variant: "primary" | "secondary" }) {
  if (action.href && !action.disabled) {
    // A destination outside the application (tel:, a map) is a plain link.
    const external = /^[a-z][a-z0-9+.-]*:/i.test(action.href);
    return (
      <Button asChild variant={variant} icon={action.icon}>
        {external ? (
          <a href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {action.label}
          </a>
        ) : (
          <Link href={action.href}>{action.label}</Link>
        )}
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      icon={action.icon}
      onClick={action.onSelect}
      disabled={action.disabled}
      loading={action.loading}
    >
      {action.label}
    </Button>
  );
}

function MenuAction({ action }: { action: PageAction }) {
  if (action.href && !action.disabled) {
    // A destination outside the application (tel:, a map) is a plain link.
    const external = /^[a-z][a-z0-9+.-]*:/i.test(action.href);
    const content = (
      <>
        <action.icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{action.label}</span>
      </>
    );
    return (
      <DropdownMenuItem asChild>
        {external ? (
          <a href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {content}
          </a>
        ) : (
          <Link href={action.href}>{content}</Link>
        )}
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem icon={action.icon} tone={action.tone === "danger" ? "danger" : "default"} disabled={action.disabled || action.loading} onSelect={action.onSelect}>
      {action.label}
    </DropdownMenuItem>
  );
}

/** Single page heading pattern: breadcrumb, title, description, actions. */
export function PageHeader({
  title,
  description,
  hideDescriptionOnPhone = false,
  breadcrumbs,
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  titleAddon,
  leading,
  stackActions = false,
  back,
  meta,
  className,
}: PageHeaderProps) {
  const hasActions = Boolean(primaryAction) || secondaryActions.length > 0 || moreActions.length > 0 || Boolean(meta);
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      {back && (
        <Link
          href={back.href}
          className="inline-flex h-control-sm items-center gap-1.5 self-start rounded-compact text-body text-foreground-muted hover:text-foreground touch:h-touch"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className={cn("min-w-0 flex-1 basis-64", leading && "flex items-center gap-4")}>
          {leading && <div className="shrink-0">{leading}</div>}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-page-title break-words text-foreground">{title}</h1>
              {titleAddon}
            </div>
            {description && <p className={cn("mt-1 max-w-2xl text-body text-foreground-muted", hideDescriptionOnPhone && "hidden md:block")}>{description}</p>}
          </div>
        </div>
        {hasActions && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2",
              // Wrapping upwards puts the last one, the main action, on the first line.
              stackActions && "max-w-full flex-wrap-reverse justify-end xl:max-w-[36rem]",
            )}
          >
            {meta && <div className="hidden items-center md:flex">{meta}</div>}
            {secondaryActions.length > 0 && (
              <div className={cn("hidden items-center gap-2 md:flex", stackActions && "flex-wrap justify-end")}>
                {secondaryActions.map((action) => (
                  <ActionButton key={action.label} action={action} variant="secondary" />
                ))}
              </div>
            )}
            {/* From 768px the menu holds the less frequent actions only. */}
            {moreActions.length > 0 && (
              <div className="hidden md:block">
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="Plus d'actions" variant="secondary" tooltip={false} />}>
                  {moreActions.map((action) => (
                    <MenuAction key={action.label} action={action} />
                  ))}
                </DropdownMenu>
              </div>
            )}
            {/* On a phone, everything but the main action is in it. */}
            {secondaryActions.length + moreActions.length > 0 && (
              <div className="md:hidden">
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="Plus d'actions" variant="secondary" tooltip={false} />}>
                  {[...secondaryActions, ...moreActions].map((action) => (
                    <MenuAction key={action.label} action={action} />
                  ))}
                </DropdownMenu>
              </div>
            )}
            {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
          </div>
        )}
      </div>
    </header>
  );
}
