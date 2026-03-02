import Link from "next/link";
import type { HowItWorksSection, HowItWorksStep } from "../schema";

// ============================================================
// How It Works Section — Server Component
// ============================================================

interface HowItWorksSectionProps {
  data: HowItWorksSection;
}

/** Step icon based on iconType */
function StepIcon({ iconType }: { iconType: HowItWorksStep["iconType"] }) {
  const iconClass = "h-10 w-10 text-sugu-500 sm:h-12 sm:w-12";

  switch (iconType) {
    case "create-account":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );

    case "configure-space":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      );

    case "start-selling":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      );

    default:
      return null;
  }
}

/** Dashed connector SVG between cards (hidden on mobile) */
function DashedConnector() {
  return (
    <svg
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block"
      width="100%"
      height="4"
      viewBox="0 0 100 4"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="2"
        x2="100"
        y2="2"
        stroke="#F15412"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity="0.3"
      />
    </svg>
  );
}

export function HowItWorksBlock({ data }: HowItWorksSectionProps) {
  return (
    <section
      id="comment-ca-marche"
      className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      aria-labelledby="how-it-works-heading"
    >
      {/* ── Decorative blob backgrounds ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-0 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-sugu-300/20 to-orange-200/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 h-[350px] w-[350px] rounded-full bg-gradient-to-tl from-sugu-400/15 to-yellow-200/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* ── Section Header ── */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-sugu-700 shadow-sm backdrop-blur-md animate-slide-up">
            {data.badge}
          </span>

          <h2
            id="how-it-works-heading"
            className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 animate-slide-up-delay-1 sm:text-4xl"
          >
            {data.heading}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 animate-slide-up-delay-2 sm:text-lg">
            {data.subtext}
          </p>
        </div>

        {/* ── Steps Grid ── */}
        <div className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {/* Horizontal dashed connector line (desktop only) */}
          <div className="pointer-events-none absolute inset-x-0 top-16 hidden lg:block" aria-hidden="true">
            <DashedConnector />
          </div>

          {data.steps.map((step, index) => (
            <article
              key={step.id}
              className="group relative flex flex-col rounded-2xl border border-white/60 bg-white/50 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:bg-white/80 hover:-translate-y-1 sm:p-7"
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              {/* ── Step Number Badge ── */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sugu-500 to-sugu-600 text-lg font-bold text-white shadow-md shadow-sugu-500/30">
                  {step.stepNumber}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {step.stepLabel}
                </span>
              </div>

              {/* ── Step Icon ── */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sugu-50/80 transition-colors duration-300 group-hover:bg-sugu-100">
                <StepIcon iconType={step.iconType} />
              </div>

              {/* ── Content ── */}
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                {step.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">
                {step.description}
              </p>

              {/* ── Footer Note ── */}
              {step.footerNote && (
                <p className="mt-4 border-t border-gray-100 pt-3 text-xs font-medium text-gray-400 italic">
                  {step.footerNote}
                </p>
              )}
            </article>
          ))}
        </div>

        {/* ── CTA Button ── */}
        <div className="mt-12 flex justify-center animate-slide-up-delay-4">
          <Link
            href={data.cta.href}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-sugu-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-sugu-500/30 transition-all duration-300 hover:bg-sugu-600 hover:shadow-xl hover:shadow-sugu-500/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-sugu-500 focus-visible:ring-offset-2"
          >
            {data.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
