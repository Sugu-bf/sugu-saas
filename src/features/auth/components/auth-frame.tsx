import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/design-system";
import { BrandMark } from "@/components/app-shell/brand";

/** Page frame of every authentication screen: brand, one card, quiet footer. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="sugu-ui flex min-h-dvh flex-col items-center bg-background px-4 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-16">
      <Link href="/" className="flex items-center gap-2 rounded-control" aria-label="SUGU Pro, retour au site">
        <BrandMark />
        <span className="text-section-title text-foreground">
          SUGU <span className="font-normal text-foreground-muted">Pro</span>
        </span>
      </Link>
      <main className="mt-6 flex w-full flex-1 flex-col items-center md:mt-8">{children}</main>
      <footer className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-meta text-foreground-muted">
        <span>Espace professionnel SUGU</span>
        <Link href="/faq" className="rounded-compact underline underline-offset-2 hover:text-foreground">
          Aide et FAQ
        </Link>
      </footer>
    </div>
  );
}

export interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Wider card for multi-step forms. */
  wide?: boolean;
  /** Content above the title, e.g. a `Stepper`. */
  header?: ReactNode;
}

export function AuthCard({ title, description, children, wide = false, header }: AuthCardProps) {
  return (
    <section
      className={cn(
        "w-full rounded-panel border border-border bg-surface p-5 md:p-8",
        wide ? "max-w-lg" : "max-w-[26rem]",
      )}
    >
      {header && <div className="mb-6">{header}</div>}
      <h1 className="text-page-title text-foreground">{title}</h1>
      {description && <p className="mt-1 text-body text-foreground-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
