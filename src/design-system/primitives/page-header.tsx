"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
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
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** The one main action of the page. Always visible, on every screen size. */
  primaryAction?: PageAction;
  /** Shown as buttons from 768px; folded into a "Plus d'actions" menu on phones. */
  secondaryActions?: PageAction[];
  /** Extra content next to the title, e.g. a `StatusBadge`. */
  titleAddon?: ReactNode;
  className?: string;
}

function ActionButton({ action, variant }: { action: PageAction; variant: "primary" | "secondary" }) {
  if (action.href && !action.disabled) {
    return (
      <Button asChild variant={variant} icon={action.icon}>
        <Link href={action.href}>{action.label}</Link>
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

/** Single page heading pattern: breadcrumb, title, description, actions. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions = [],
  titleAddon,
  className,
}: PageHeaderProps) {
  const hasActions = Boolean(primaryAction) || secondaryActions.length > 0;
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-page-title break-words text-foreground">{title}</h1>
            {titleAddon}
          </div>
          {description && <p className="mt-1 max-w-2xl text-body text-foreground-muted">{description}</p>}
        </div>
        {hasActions && (
          <div className="flex shrink-0 items-center gap-2">
            {secondaryActions.length > 0 && (
              <>
                <div className="hidden items-center gap-2 md:flex">
                  {secondaryActions.map((action) => (
                    <ActionButton key={action.label} action={action} variant="secondary" />
                  ))}
                </div>
                <div className="md:hidden">
                  <DropdownMenu
                    trigger={<IconButton icon={MoreHorizontal} label="Plus d'actions" variant="secondary" tooltip={false} />}
                  >
                    {secondaryActions.map((action) =>
                      action.href && !action.disabled ? (
                        <DropdownMenuItem key={action.label} asChild>
                          <Link href={action.href}>
                            <action.icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{action.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          key={action.label}
                          icon={action.icon}
                          disabled={action.disabled || action.loading}
                          onSelect={action.onSelect}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenu>
                </div>
              </>
            )}
            {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
          </div>
        )}
      </div>
    </header>
  );
}
