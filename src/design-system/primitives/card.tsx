import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

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
  /** Heading level, to keep the document outline correct. */
  headingLevel?: 2 | 3 | 4;
}

/** Titled block of a page. Not a card: add `Card` inside only when needed. */
export function Section({
  title,
  description,
  actions,
  headingLevel = 2,
  className,
  children,
  ...props
}: SectionProps) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <Heading className="text-section-title text-foreground">{title}</Heading>
          {description && <p className="mt-0.5 text-body text-foreground-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
