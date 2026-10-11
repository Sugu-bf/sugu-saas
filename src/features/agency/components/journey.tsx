import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn, type Tone } from "@/design-system";
import type { JourneyStepView, JourneyView } from "../deliveries/journey";

// The way of a delivery, drawn twice: a banner with its milestones in a row,
// and a dated timeline. Both render what `buildJourneyView` prepared.

const SURFACE: Record<Tone, string> = {
  success: "border-success-border bg-success-bg",
  warning: "border-warning-border bg-warning-bg",
  danger: "border-danger-border bg-danger-bg",
  info: "border-info-border bg-info-bg",
  neutral: "border-border bg-surface-subtle",
};

const SOLID: Record<Tone, string> = {
  success: "bg-success-icon",
  warning: "bg-warning-icon",
  danger: "bg-danger-icon",
  info: "bg-info-icon",
  neutral: "bg-neutral-icon",
};

const RING: Record<Tone, string> = {
  success: "border-success-icon",
  warning: "border-warning-icon",
  danger: "border-danger-icon",
  info: "border-info-icon",
  neutral: "border-neutral-icon",
};

const TEXT: Record<Tone, string> = {
  success: "text-success-fg",
  warning: "text-warning-fg",
  danger: "text-danger-fg",
  info: "text-info-fg",
  neutral: "text-foreground",
};

const STATUS_WORD = { done: "terminée", current: "en cours", upcoming: "à venir" } as const;

/** The mark of a step: a tick once done, a ringed dot where the delivery stands, a grey dot for what is to come. */
function StepMark({ step, className }: { step: JourneyStepView; className?: string }) {
  if (step.status === "upcoming") {
    return <span className={cn("block size-6 rounded-pill border-2 border-border-strong bg-surface", className)} aria-hidden="true" />;
  }
  if (step.status === "current") {
    const failed = step.key === "delivery_failed";
    return (
      <span className={cn("flex size-6 items-center justify-center rounded-pill border-2 bg-surface", RING[step.tone], className)} aria-hidden="true">
        {failed ? <X className="size-3.5 text-danger-icon" strokeWidth={3} /> : <span className={cn("size-2.5 rounded-pill", SOLID[step.tone])} />}
      </span>
    );
  }
  return (
    <span className={cn("flex size-6 items-center justify-center rounded-pill text-white", SOLID[step.tone], className)} aria-hidden="true">
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

export interface JourneyBannerProps {
  view: JourneyView;
  /** On the right of the headline: when the parcel is expected. */
  aside?: ReactNode;
  className?: string;
}

/** Where the delivery stands, at a glance: what is happening, and the milestones of its way in a row. */
export function JourneyBanner({ view, aside, className }: JourneyBannerProps) {
  const Icon = view.icon;
  return (
    <section aria-label="Avancement de la livraison" className={cn("flex flex-col gap-5 rounded-panel border p-4 md:p-5", SURFACE[view.tone], className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-pill text-white", SOLID[view.tone])}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className={cn("text-section-title", TEXT[view.tone])}>{view.headline}</h2>
            <p className="mt-0.5 text-body text-foreground">{view.summary}</p>
          </div>
        </div>
        {aside && <div className="flex shrink-0 flex-wrap items-center gap-3">{aside}</div>}
      </div>

      <ol aria-label="Étapes de la livraison" className="grid auto-cols-fr grid-flow-col">
        {view.milestones.map((step, index) => (
          <li key={step.key} aria-current={step.status === "current" ? "step" : undefined} className="relative flex min-w-0 flex-col items-center px-1 text-center">
            {/* The line from the previous milestone: coloured once this one is reached. */}
            {index > 0 && (
              <span
                className={cn("absolute top-[0.6875rem] right-1/2 -left-1/2 h-0.5", step.status === "upcoming" ? "bg-border-strong" : SOLID[view.milestones[index - 1].tone])}
                aria-hidden="true"
              />
            )}
            <StepMark step={step} className="relative" />
            <span className={cn("mt-2 max-w-full text-meta md:text-label", step.status === "upcoming" ? "text-foreground-muted" : "font-medium text-foreground")}>
              {step.title}
              <span className="sr-only"> : {STATUS_WORD[step.status]}</span>
            </span>
            {step.dateLabel && (
              <span className="hidden max-w-full text-meta text-foreground-muted tabular-nums md:block">
                {step.dateTime ? <time dateTime={step.dateTime}>{step.dateLabel}</time> : step.dateLabel}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface JourneyTimelineProps {
  view: JourneyView;
  /** Shown under the step the delivery stands on, e.g. where the parcel was last seen. */
  currentNote?: ReactNode;
}

/** The same way, top to bottom, each step with its date and one sentence. */
export function JourneyTimeline({ view, currentNote }: JourneyTimelineProps) {
  return (
    <ol className="flex flex-col">
      {view.steps.map((step, index) => {
        const last = index === view.steps.length - 1;
        const next = view.steps[index + 1];
        return (
          <li key={step.key} aria-current={step.status === "current" ? "step" : undefined} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepMark step={step} className="shrink-0" />
              {!last && <span className={cn("my-1 w-0.5 flex-1", next && next.status !== "upcoming" ? SOLID[step.tone] : "bg-border-strong")} aria-hidden="true" />}
            </div>
            <div className={cn("min-w-0 flex-1", !last && "pb-5")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn("text-body font-semibold", step.status === "upcoming" ? "text-foreground-muted" : step.status === "current" ? TEXT[step.tone] : "text-foreground")}>
                  {step.title}
                  <span className="sr-only"> : {STATUS_WORD[step.status]}</span>
                </p>
                {step.dateLabel && (
                  <p className="text-meta text-foreground-muted tabular-nums">{step.dateTime ? <time dateTime={step.dateTime}>{step.dateLabel}</time> : step.dateLabel}</p>
                )}
              </div>
              {step.summary && <p className="mt-0.5 text-body text-foreground-muted">{step.summary}</p>}
              {step.status === "current" && currentNote && <div className="mt-2">{currentNote}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
