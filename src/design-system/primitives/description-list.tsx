import type { ReactNode } from "react";
import { cn } from "../cn";

export interface DescriptionItem {
  label: string;
  value: ReactNode;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  /** Label and value on one line from 768px (summaries), or always stacked. */
  layout?: "inline" | "stacked";
  className?: string;
}

/** Label / value pairs: form recaps, detail panels, wizard summaries. */
export function DescriptionList({ items, layout = "inline", className }: DescriptionListProps) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col gap-0.5 py-2",
            layout === "inline" && "md:flex-row md:items-baseline md:justify-between md:gap-4",
          )}
        >
          <dt className="text-label text-foreground-muted">{item.label}</dt>
          <dd className={cn("min-w-0 text-body text-foreground", layout === "inline" && "md:text-right")}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
