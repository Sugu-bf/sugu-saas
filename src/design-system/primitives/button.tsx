"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Tooltip } from "./tooltip";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button border font-medium",
    "transition-colors duration-100 select-none",
    "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground",
    "aria-disabled:cursor-not-allowed aria-disabled:border-transparent aria-disabled:bg-disabled aria-disabled:text-disabled-foreground",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
        secondary:
          "border-border-strong bg-surface text-foreground hover:bg-surface-subtle active:bg-surface-hover aria-pressed:bg-surface-hover",
        // The next step of a row (assign, follow, relaunch): visible without competing with the page's primary button.
        outline: "border-primary bg-surface text-primary hover:bg-brand-subtle active:bg-brand-subtle",
        quiet:
          "border-transparent bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground active:bg-surface-hover aria-pressed:bg-surface-hover aria-pressed:text-foreground",
        destructive:
          "border-transparent bg-danger-solid text-white hover:bg-danger-solid-hover active:bg-danger-solid-hover",
      },
      size: {
        default: "h-control px-4 text-body touch:h-touch touch:px-5",
        compact: "h-control-sm px-3 text-label touch:h-control",
      },
      iconOnly: { true: "px-0 touch:px-0", false: "" },
    },
    compoundVariants: [
      { iconOnly: true, size: "default", className: "w-control touch:w-touch" },
      { iconOnly: true, size: "compact", className: "w-control-sm touch:w-control" },
    ],
    defaultVariants: { variant: "secondary", size: "default", iconOnly: false },
  },
);

type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, "iconOnly">;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  /** Lucide icon shown before the label. Expected on every important action. */
  icon?: LucideIcon;
  /** Lucide icon shown after the label (disclosure, external link…). */
  trailingIcon?: LucideIcon;
  /** Shows a spinner, sets `aria-busy` and blocks activation. */
  loading?: boolean;
  /** Render the child element (e.g. a `Link`) with the button styles. */
  asChild?: boolean;
}

const ICON_SIZE = "size-4 shrink-0";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    icon: Icon,
    trailingIcon: TrailingIcon,
    loading = false,
    asChild = false,
    disabled,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(ICON_SIZE, "animate-ds-spin")} aria-hidden="true" />
      ) : (
        Icon && <Icon className={ICON_SIZE} aria-hidden="true" />
      )}
      <Slottable>{children}</Slottable>
      {TrailingIcon && <TrailingIcon className={ICON_SIZE} aria-hidden="true" />}
    </Comp>
  );
});

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">,
    ButtonVariantProps {
  icon: LucideIcon;
  /** Accessible name — mandatory, an icon alone says nothing. */
  label: string;
  loading?: boolean;
  /** Show the label in a tooltip on hover and focus. Defaults to true. */
  tooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = "quiet", size, loading = false, tooltip = true, disabled, className, type, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, iconOnly: true }), className)}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(ICON_SIZE, "animate-ds-spin")} aria-hidden="true" />
      ) : (
        <Icon className={ICON_SIZE} aria-hidden="true" />
      )}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
});

export interface ButtonGroupProps {
  /** Accessible name of the group. */
  label: string;
  children: ReactNode;
  className?: string;
}

/** Joins adjacent buttons into one segmented control. */
export function ButtonGroup({ label, children, className }: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex [&>*]:relative [&>*:focus-visible]:z-[1]",
        "[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
