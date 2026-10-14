"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, ImageUp, Loader2, Lock, RotateCcw, Save, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Switch, Textarea, cn, type InputProps, type TextareaProps } from "@/design-system";

// ============================================================
// Pieces shared by the settings of the three profiles.
// ============================================================

// ── Panels ───────────────────────────────────────────────────

interface PanelHeadingProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

function PanelHeading({ title, description, action, wideOnly = false, primary = false }: PanelHeadingProps & { wideOnly?: boolean; primary?: boolean }) {
  return (
    <div className={cn("flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-border px-4 py-4 md:px-6 lg:flex-nowrap", wideOnly ? "hidden lg:flex" : "flex")}>
      <div className="min-w-0">
        <h2 className={cn("text-section-title text-foreground lg:text-[1.125rem] lg:leading-7", primary && "max-lg:sr-only")}>{title}</h2>
        {description && <p className="mt-0.5 text-body text-foreground-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * A section shown without a form: a title, then its content. `primary`: the
 * panel is the whole section, and on a phone the bar above already says its
 * name — the title is then left to screen readers there.
 */
export function SettingsPanel({ title, description, action, children, className, primary = false }: PanelHeadingProps & { children: ReactNode; className?: string; primary?: boolean }) {
  return (
    <section className={cn("min-w-0 rounded-panel border border-border bg-surface", className)} aria-label={title}>
      <PanelHeading title={title} description={description} action={action} primary={primary} />
      <div className="flex flex-col gap-6 px-4 py-5 md:px-6">{children}</div>
    </section>
  );
}

export interface SettingsFormProps {
  title: string;
  description?: ReactNode;
  /** Something differs from what the server holds. */
  dirty: boolean;
  saving: boolean;
  onSubmit: () => void;
  /** Put back what the server holds. */
  onReset: () => void;
  submitLabel?: string;
  /** Nothing may be changed (permission, locked): no button at all. */
  readOnly?: boolean;
  children: ReactNode;
  /** Above the fields, e.g. the summary of what failed. */
  notice?: ReactNode;
}

/**
 * A section that is a form. "Enregistrer les modifications" sits in its
 * header from 1024px; on a phone it rests at the bottom of the screen, above
 * the tab bar, so that the keyboard or a long form never hides it.
 */
export function SettingsForm({ title, description, dirty, saving, onSubmit, onReset, submitLabel = "Enregistrer les modifications", readOnly = false, children, notice }: SettingsFormProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!dirty) {
      toast.info("Aucune modification à enregistrer.");
      return;
    }
    onSubmit();
  };
  const actions = readOnly ? null : (
    <>
      {dirty && !saving && (
        <Button type="button" variant="quiet" size="compact" icon={RotateCcw} onClick={onReset}>
          Annuler
        </Button>
      )}
      <Button type="submit" variant="primary" icon={Save} loading={saving}>
        {submitLabel}
      </Button>
    </>
  );

  return (
    <form onSubmit={submit} noValidate className="min-w-0" aria-label={title}>
      <section className="min-w-0 rounded-panel border border-border bg-surface">
        {/* On a phone the bar above says which section this is, and the button rests at the bottom. */}
        <PanelHeading wideOnly title={title} description={description} action={actions && <span className="flex items-center gap-2">{actions}</span>} />
        <div className="flex flex-col gap-6 px-4 py-5 md:px-6">
          {description && <p className="-mb-2 text-body text-foreground-muted lg:hidden">{description}</p>}
          {notice}
          {children}
        </div>
      </section>
      {!readOnly && (
        <div className="sticky-bottom-shell sticky z-sticky -mx-page mt-4 border-t border-border bg-surface/95 px-page py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-meta text-foreground-muted" aria-live="polite">
              {saving ? "Enregistrement…" : dirty ? "Modifications non enregistrées" : "Tout est enregistré"}
            </p>
            {dirty && !saving && (
              <Button type="button" variant="quiet" size="compact" onClick={onReset}>
                Annuler
              </Button>
            )}
            <Button type="submit" variant="primary" icon={Save} loading={saving}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

/** A titled block inside a panel. */
export function SettingsGroup({ title, description, action, children, className }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-label font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-meta text-foreground-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Fields ───────────────────────────────────────────────────

/** Flag of Burkina Faso: red over green, a yellow star. Drawn, not an emoji. */
function FlagBF() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-5 shrink-0 rounded-[2px]" aria-hidden="true">
      <rect width="30" height="10" fill="#EF2B2D" />
      <rect y="10" width="30" height="10" fill="#009E49" />
      <polygon fill="#FCD116" points="15,5.6 16.2,9 19.8,9 16.9,11.1 18,14.5 15,12.4 12,14.5 13.1,11.1 10.2,9 13.8,9" />
    </svg>
  );
}

/**
 * A phone number. The flag says which country the number is read in; the
 * number itself is typed whole (+226…), as the server stores it.
 */
export function PhoneInput({ className, ...props }: Omit<InputProps, "type" | "leadingIcon">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center">
        <FlagBF />
      </span>
      <Input type="tel" inputMode="tel" autoComplete="tel" className={cn("pl-11 tabular-nums", className)} {...props} />
    </div>
  );
}

/** A text area that counts what is left, like the mock-up's "62/500". */
export function CountedTextarea({ maxLength, value, className, ...props }: TextareaProps & { maxLength: number; value: string }) {
  const id = useId();
  return (
    <div className="relative">
      <Textarea maxLength={maxLength} value={value} className={cn("pb-6", className)} aria-describedby={id} {...props} />
      <span id={id} className="pointer-events-none absolute right-3 bottom-2 text-meta text-foreground-subtle tabular-nums" aria-live="off">
        {value.length}/{maxLength}
      </span>
    </div>
  );
}

/** A value shown, not edited here; a lock says it is not by choice. */
export function ReadOnlyValue({ value, locked = false, placeholder = "Non renseigné" }: { value: string | null | undefined; locked?: boolean; placeholder?: string }) {
  return (
    <div className="flex h-control min-w-0 items-center gap-2 rounded-control border border-border bg-surface-subtle px-3 text-body touch:h-touch">
      <span className={cn("min-w-0 flex-1 truncate", value ? "text-foreground" : "text-foreground-subtle")}>{value || placeholder}</span>
      {locked && <Lock className="size-3.5 shrink-0 text-foreground-subtle" aria-label="Verrouillé" />}
    </div>
  );
}

// ── Pictures ─────────────────────────────────────────────────

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ImageFieldProps {
  label: string;
  /** What the server holds. A picture being sent is never shown as saved. */
  url: string | null | undefined;
  /** Shown when there is no picture: initials, an icon. */
  placeholder: ReactNode;
  maxBytes: number;
  /** "PNG, JPG (max. 2 Mo)". */
  hint: string;
  buttonLabel: string;
  /** Sends the file; resolves when the server kept it. */
  onUpload: (file: File) => Promise<unknown>;
  shape?: "square" | "round" | "banner";
  disabled?: boolean;
  /** Why it cannot be changed, when `disabled`. */
  disabledReason?: string;
}

/**
 * A logo, a banner, a photo: sent as soon as it is chosen, through the
 * portal. While it travels the previous picture stays, dimmed; if the
 * server refuses it, the previous one is still the one shown, with the
 * reason under it.
 */
export function ImageField({ label, url, placeholder, maxBytes, hint, buttonLabel, onUpload, shape = "square", disabled = false, disabledReason }: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`L'image dépasse ${Math.round(maxBytes / (1024 * 1024))} Mo. Choisissez-en une plus légère.`);
      return;
    }
    setSending(true);
    try {
      await onUpload(file);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : "L'image n'a pas pu être envoyée. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const frame = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden border border-border bg-surface-subtle",
    shape === "round" && "size-20 rounded-pill",
    shape === "square" && "size-16 rounded-panel md:size-20",
    shape === "banner" && "aspect-[3/1] w-full rounded-panel",
  );

  return (
    <div className={cn("flex min-w-0 gap-3", shape === "banner" ? "flex-col" : "items-center gap-4")}>
      <div className={frame}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the picture comes from the media server, sized by the frame
          <img src={url} alt={label} className={cn("size-full object-cover", sending && "opacity-50")} />
        ) : (
          placeholder
        )}
        {sending && <Loader2 className="absolute size-5 animate-spin text-foreground" aria-hidden="true" />}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="compact"
          icon={ImageUp}
          loading={sending}
          disabled={disabled}
          onClick={() => input.current?.click()}
          aria-describedby={error ? errorId : undefined}
        >
          {sending ? "Envoi…" : buttonLabel}
        </Button>
        <p className="text-meta text-foreground-muted">{disabled && disabledReason ? disabledReason : hint}</p>
        <p id={errorId} role="alert" className={cn("text-meta text-danger-fg", !error && "hidden")}>
          {error}
        </p>
      </div>
    </div>
  );
}

// ── Rows ─────────────────────────────────────────────────────

/** A line of a list on a phone: a name, a value, and where it leads. */
export function LinkRow({ icon: Icon, title, detail, value, href, onSelect, badge }: { icon?: LucideIcon; title: string; detail?: ReactNode; value?: ReactNode; href?: string; onSelect?: () => void; badge?: ReactNode }) {
  const body = (
    <>
      {Icon && <Icon className="size-4.5 shrink-0 text-foreground-subtle" aria-hidden="true" />}
      <span className="min-w-0 flex-1">
        <span className="block text-body text-foreground">{title}</span>
        {detail && <span className="block text-meta text-foreground-muted">{detail}</span>}
        {badge && <span className="mt-1 block">{badge}</span>}
      </span>
      {value !== undefined && <span className="max-w-[45%] truncate text-right text-body text-foreground tabular-nums">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
    </>
  );
  const className = "flex min-h-touch w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-subtle";
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onSelect} className={className}>
      {body}
    </button>
  );
}

/** A setting turned on or off: an icon, what it is, a switch. */
export function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  lockedNote,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Shown instead of a free switch: why it cannot be turned off. */
  lockedNote?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-subtle text-foreground-muted">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p id={`${id}-title`} className="text-body font-medium text-foreground">
          {title}
        </p>
        <p id={`${id}-desc`} className="text-meta text-foreground-muted">
          {description}
        </p>
        {lockedNote && (
          <p className="mt-1 flex items-center gap-1 text-meta text-foreground-subtle">
            <Lock className="size-3" aria-hidden="true" />
            {lockedNote}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(next) => onCheckedChange?.(next)}
        disabled={disabled || Boolean(lockedNote)}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        // Locked on stays orange: a grey switch would read as "off".
        className={cn("mt-1", checked && "disabled:bg-primary disabled:opacity-60")}
      />
    </div>
  );
}
