import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";
import type { Tone } from "./badge";

/** Tinted tile behind an icon: the colour says what the block or the figure is about. */
export const iconTileClass: Record<Tone | "brand", string> = {
  brand: "bg-brand-subtle text-primary",
  success: "bg-success-bg text-success-icon",
  warning: "bg-warning-bg text-warning-icon",
  danger: "bg-danger-bg text-danger-icon",
  info: "bg-info-bg text-info-icon",
  neutral: "bg-neutral-bg text-neutral-icon",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove inner padding (for tables and lists that go edge to edge). */
  flush?: boolean;
}

/** Plain surface: one border, no blur, no shadow. */
export function Card({ flush = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-panel border border-border bg-surface", !flush && "p-4", className)}
      {...props}
    />
  );
}

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** Actions aligned with the section title. */
  actions?: ReactNode;
  /** Icon shown in a tinted tile before the title (the cards of a detail page). */
  icon?: LucideIcon;
  /** Colour of that tile. Defaults to the brand. */
  tone?: Tone | "brand";
  /** Heading level, to keep the document outline correct. */
  headingLevel?: 2 | 3 | 4;
}

/** Titled block of a page. Not a card: add `Card` inside only when needed. */
export function Section({
  title,
  description,
  actions,
  icon: Icon,
  tone = "brand",
  headingLevel = 2,
  className,
  children,
  ...props
}: SectionProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className={cn("min-w-0", Icon && "flex items-center gap-2.5")}>
          {Icon && (
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-control", iconTileClass[tone])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <Heading className="text-section-title text-foreground">{title}</Heading>
            {description && <p className="mt-0.5 text-body text-foreground-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
