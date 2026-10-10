import Image from "next/image";
import Link from "next/link";
import { cn } from "@/design-system";

/** The SUGU mark. Decorative: the name next to it carries the meaning. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt=""
      width={28}
      height={28}
      className={cn("size-7 shrink-0 rounded-control", className)}
    />
  );
}

export interface WorkspaceBrandProps {
  href: string;
  /** Store, agency or courier name. */
  name: string;
  /** Second line: the space, or the current page on phones. */
  caption: string;
  /** Mark only (reduced sidebar); the name stays available to assistive tech. */
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/** SUGU mark + workspace identity, linking to the home of the space. */
export function WorkspaceBrand({ href, name, caption, compact = false, onNavigate, className }: WorkspaceBrandProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={compact ? `${name}, accueil` : undefined}
      className={cn("flex min-w-0 items-center gap-2.5 rounded-control", compact && "justify-center", className)}
    >
      <BrandMark />
      {!compact && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold text-foreground">{name}</span>
          <span className="truncate text-meta text-foreground-muted">{caption}</span>
        </span>
      )}
    </Link>
  );
}
