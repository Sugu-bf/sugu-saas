import Link from "next/link";
import type { PricingSection } from "../schema";

// ============================================================
// Pricing Preview Section — Server Component
// ============================================================

interface PricingSectionProps {
  data: PricingSection;
}

/** Checkmark icon */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4 flex-shrink-0 text-sugu-500"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function PricingPreview({ data }: PricingSectionProps) {
  return (
    <section
      id="tarifs"
      className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-5xl">
        {/* ── Section Header ── */}
        <div className="text-center">
          {/* Badge pill */}
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-sugu-700 shadow-sm backdrop-blur-md animate-slide-up">
            {data.badge}
          </span>

          <h2
            id="pricing-heading"
            className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 animate-slide-up-delay-1 sm:text-4xl"
          >
            {data.heading}
          </h2>
        </div>

        {/* ── Pricing Cards Grid ── */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:mx-auto lg:max-w-4xl">
          {data.plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg sm:p-8 ${
                plan.isPopular
                  ? "border-sugu-300 bg-gradient-to-b from-sugu-50/80 to-white ring-2 ring-sugu-500/20 scale-[1.02]"
                  : "border-gray-200/80 bg-white/90 hover:-translate-y-1"
              }`}
            >
              {/* Popular badge */}
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-sugu-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-sugu-500/30">
                    Populaire
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1.5">
                <span
                  className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${
                    plan.isPopular ? "text-sugu-500" : "text-gray-900"
                  }`}
                >
                  {plan.price === 0
                    ? "0"
                    : plan.price.toLocaleString("fr-FR")}
                </span>
                <span className="text-base font-semibold text-gray-500 sm:text-lg">
                  {plan.currency}
                  {plan.period ?? ""}
                </span>
              </div>

              {/* Features list */}
              <ul className="mt-6 flex-1 space-y-3" role="list">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2.5">
                    <CheckIcon
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        plan.isPopular ? "text-sugu-500" : "text-gray-400"
                      }`}
                    />
                    <span className="text-sm text-gray-600">{feature.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <div className="mt-8">
                <Link
                  href={plan.cta.href}
                  className={`flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    plan.isPopular
                      ? "bg-sugu-500 text-white shadow-lg shadow-sugu-500/30 hover:bg-sugu-600 hover:shadow-xl hover:shadow-sugu-500/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-sugu-500"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-400"
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
