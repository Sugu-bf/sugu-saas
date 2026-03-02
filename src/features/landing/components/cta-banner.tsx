import Link from "next/link";
import type { CtaBannerSection } from "../schema";

// ============================================================
// CTA Banner Section — Server Component
// ============================================================

interface CtaBannerSectionProps {
  data: CtaBannerSection;
}

export function CtaBanner({ data }: CtaBannerSectionProps) {
  return (
    <section
      className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      aria-label="Appel à l'action"
    >
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sugu-50 via-orange-50 to-sugu-100/60 px-6 py-12 shadow-xl shadow-sugu-100/40 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          {/* ── Decorative elements ── */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-sugu-400/20 blur-xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-sugu-300/25 blur-lg"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-12 bottom-8 h-16 w-16 rounded-full bg-sugu-400/15 blur-md"
          />
          {/* Small decorative dots */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/4 top-6 h-3 w-3 rounded-full bg-sugu-400/40"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-1/3 top-10 h-2 w-2 rounded-full bg-sugu-300/50"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-10 bottom-12 h-2.5 w-2.5 rounded-full bg-sugu-400/30"
          />

          {/* ── Content ── */}
          <div className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: Text */}
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                {data.heading}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600 sm:text-lg">
                {data.subtext}
              </p>
            </div>

            {/* Right: CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <Link
                href={data.ctaPrimary.href}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-sugu-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sugu-500/30 transition-all duration-300 hover:bg-sugu-600 hover:shadow-xl hover:shadow-sugu-500/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-sugu-500 focus-visible:ring-offset-2 sm:text-base"
              >
                {data.ctaPrimary.label}
              </Link>
              <Link
                href={data.ctaSecondary.href}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white/90 px-7 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:bg-white hover:border-gray-400 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 sm:text-base"
              >
                {/* Chat icon */}
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-11.25 4.5A2.625 2.625 0 018.25 14h7.5a2.625 2.625 0 012.625 2.625v0a2.625 2.625 0 01-2.625 2.625h-7.5A2.625 2.625 0 015.625 16.5v0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 10.5h.008v.008H7.5V10.5zm4.5 0h.008v.008H12V10.5zm4.5 0h.008v.008H16.5V10.5zM12 3c4.97 0 9 3.582 9 8s-4.03 8-9 8a9.863 9.863 0 01-4.255-.966L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8z"
                  />
                </svg>
                {data.ctaSecondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
