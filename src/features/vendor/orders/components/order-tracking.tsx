import { ArrowRight } from "lucide-react";
import { Badge, cn, type Tone } from "@/design-system";
import type { TrackingStepStatus, TrackingStepView, TrackingView } from "../tracking";

const STATUS_LABEL: Record<TrackingStepStatus, string> = {
  done: "Terminé",
  current: "En cours",
  upcoming: "À venir",
};

/** Tinted disc behind a step icon. */
const MARKER: Record<Tone, string> = {
  success: "border-success-border bg-success-bg text-success-icon",
  info: "border-info-border bg-info-bg text-info-icon",
  warning: "border-warning-border bg-warning-bg text-warning-icon",
  danger: "border-danger-border bg-danger-bg text-danger-icon",
  neutral: "border-border bg-surface text-foreground-subtle",
};

const BANNER: Record<Tone, string> = {
  success: "border-success-border bg-success-bg",
  info: "border-info-border bg-info-bg",
  warning: "border-warning-border bg-warning-bg",
  danger: "border-danger-border bg-danger-bg",
  neutral: "border-border bg-surface-subtle",
};

const STATE_TEXT: Record<Tone, string> = {
  success: "text-success-fg",
  info: "text-info-fg",
  warning: "text-warning-fg",
  danger: "text-danger-fg",
  neutral: "text-neutral-fg",
};

/** Progress segments: [gone through, still ahead]. */
const SEGMENT: Record<Tone, [string, string]> = {
  success: ["bg-success-icon", "bg-surface ring-1 ring-inset ring-success-border"],
  info: ["bg-info-icon", "bg-surface ring-1 ring-inset ring-info-border"],
  warning: ["bg-warning-icon", "bg-surface ring-1 ring-inset ring-warning-border"],
  danger: ["bg-danger-icon", "bg-surface ring-1 ring-inset ring-danger-border"],
  neutral: ["bg-neutral-icon", "bg-surface ring-1 ring-inset ring-neutral-border"],
};

function StepDate({ step, className }: { step: TrackingStepView; className?: string }) {
  if (!step.dateLabel) return null;
  return step.dateTime ? (
    <time dateTime={step.dateTime} className={cn("tabular-nums", className)}>
      {step.dateLabel}
    </time>
  ) : (
    <span className={className}>{step.dateLabel}</span>
  );
}

/**
 * Where the order stands, in one compact block: the current step, how far
 * the order has gone, and the next step when there is one.
 */
export function OrderTrackingBanner({ view, className }: { view: TrackingView; className?: string }) {
  const { current, next, progress } = view;
  if (!current) return null;
  const Icon = current.icon;

  return (
    <section aria-label="Étape en cours de la commande" className={cn("rounded-panel border", BANNER[view.tone], className)}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill border", MARKER[view.tone], "bg-surface")}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={cn("text-meta font-medium", STATE_TEXT[view.tone])}>{view.stateLabel}</p>
            <p className="text-section-title break-words text-foreground">{current.title}</p>
            {current.summary && <p className="text-body text-foreground">{current.summary}</p>}
            <StepDate step={current} className="mt-0.5 block text-meta text-foreground-muted" />
          </div>
        </div>

        {progress && progress.total > 0 && (
          <div className="flex shrink-0 flex-col gap-1.5 sm:w-48">
            <p className="text-meta text-foreground tabular-nums sm:text-right">
              Étape {progress.done} sur {progress.total}
            </p>
            <div
              role="progressbar"
              aria-label="Progression de la commande"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
              aria-valuetext={`Étape ${progress.done} sur ${progress.total}`}
              className="flex gap-1"
            >
              {Array.from({ length: progress.total }, (_, index) => (
                <span
                  key={index}
                  className={cn("h-1.5 flex-1 rounded-pill", SEGMENT[view.tone][index < progress.done ? 0 : 1])}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {next && (
        <p className="flex items-start gap-2 border-t border-inherit px-4 py-2.5 text-body text-foreground">
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span className="min-w-0">
            <span className="font-medium">Prochaine étape : {next.title}.</span>
            {next.summary && <> {next.summary}</>}
          </span>
        </p>
      )}
    </section>
  );
}

/**
 * What happened and what is expected, step by step, as the backend ordered
 * it. A step that has not happened carries no date.
 */
export function OrderTrackingSteps({ view }: { view: TrackingView }) {
  return (
    <ol className="flex flex-col" aria-label="Étapes de la commande">
      {view.steps.map((step, index) => {
        const Icon = step.icon;
        const last = index === view.steps.length - 1;
        const upcoming = step.status === "upcoming";
        return (
          <li key={step.id} className="flex gap-3" aria-current={step.status === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-pill border",
                  MARKER[step.tone],
                  upcoming && "border-dashed",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>

            <div className={cn("min-w-0 flex-1 pt-1", last ? "pb-0" : "pb-4")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className={cn("flex min-w-0 flex-wrap items-center gap-2 text-body", upcoming ? "text-foreground-muted" : "font-medium text-foreground")}>
                  <span className="break-words">{step.title}</span>
                  {step.status === "current" ? (
                    <Badge tone={step.tone}>{STATUS_LABEL.current}</Badge>
                  ) : (
                    <span className="sr-only">({STATUS_LABEL[step.status]})</span>
                  )}
                </p>
                <StepDate step={step} className="text-meta text-foreground-muted" />
              </div>
              {step.summary && <p className="mt-0.5 text-meta text-foreground-muted">{step.summary}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
