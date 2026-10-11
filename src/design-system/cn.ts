import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const TONES = ["success", "warning", "danger", "info", "neutral"] as const;
const FACETS = ["fg", "bg", "border", "icon"] as const;

/**
 * tailwind-merge only knows Tailwind's default names. Without this, a
 * `className` override such as `text-meta` would not replace `text-body`,
 * and `text-body` could be mistaken for a colour.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["page-title", "section-title", "body", "label", "meta", "kpi"],
      radius: ["compact", "control", "panel", "pill", "button", "badge"],
      spacing: ["control-sm", "control", "touch"],
      shadow: ["raised", "overlay"],
      color: [
        "surface",
        "surface-subtle",
        "surface-hover",
        "surface-elevated",
        "foreground-muted",
        "foreground-subtle",
        "border-strong",
        "border-control",
        "brand",
        "brand-hover",
        "brand-subtle",
        "primary",
        "primary-hover",
        "primary-foreground",
        "focus-ring",
        "disabled",
        "disabled-foreground",
        "danger-solid",
        "danger-solid-hover",
        ...TONES.flatMap((tone) => FACETS.map((facet) => `${tone}-${facet}`)),
      ],
    },
  },
});

/** Class merger for design-system components. */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
