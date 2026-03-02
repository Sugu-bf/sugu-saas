import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLandingPageData } from "@/features/landing";
import { LandingNavbar } from "@/features/landing/components/navbar";
import { HowItWorksBlock } from "@/features/landing/components/how-it-works-section";
import { StatsBar } from "@/features/landing/components/stats-bar";
import { TestimonialsBlock } from "@/features/landing/components/testimonials-section";
import { TrustPartnersBar } from "@/features/landing/components/trust-partners-bar";
import { PricingPreview } from "@/features/landing/components/pricing-section";
import { FaqBlock } from "@/features/landing/components/faq-section";
import { CtaBanner } from "@/features/landing/components/cta-banner";
import { LandingFooter } from "@/features/landing/components/landing-footer";

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "SUGUPro — Vendez et livrez sur la marketplace #1 d'Afrique",
  description:
    "Créez votre boutique en ligne, gérez vos produits, suivez vos livraisons et boostez vos ventes — tout depuis un seul tableau de bord. Rejoignez 2 500+ vendeurs.",
  openGraph: {
    title: "SUGUPro — La marketplace #1 d'Afrique",
    description:
      "Créez votre boutique en ligne et boostez vos ventes depuis un seul tableau de bord.",
    type: "website",
  },
};

// ============================================================
// Landing Page — Server Component
// ============================================================

export default async function LandingPage() {
  const data = await getLandingPageData();
  const { hero, navLinks, howItWorks, stats, testimonials, trustPartners, pricing, faq, ctaBanner, footer } = data;

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* ── Decorative Blobs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sugu-400/30 to-sugu-500/20 blur-3xl animate-blob"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/2 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-purple-300/20 to-pink-200/20 blur-3xl animate-blob-delay-2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-gradient-to-tl from-orange-200/25 to-yellow-100/15 blur-3xl animate-blob-delay-4"
      />

      {/* ── Navbar ── */}
      <LandingNavbar navLinks={navLinks} />

      <main>
        {/* ── Hero Section ── */}
        <section
          id="hero"
          className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-24"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* ── Left Column: Text Content ── */}
              <div className="max-w-2xl lg:max-w-none">
                {/* Social Proof Badge */}
                <div className="animate-slide-up">
                  <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-sugu-700 shadow-sm backdrop-blur-md">
                    {hero.badge}
                  </span>
                </div>

                {/* Headline */}
                <h1
                  id="hero-heading"
                  className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 animate-slide-up-delay-1 sm:text-5xl lg:text-[3.5rem]"
                >
                  {hero.headlineBefore}
                  <span className="text-sugu-500">{hero.headlineHighlight}</span>
                  {hero.headlineAfter}
                </h1>

                {/* Subtext */}
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-500 animate-slide-up-delay-2">
                  {hero.subtext}
                </p>

                {/* CTA Buttons */}
                <div className="mt-8 flex flex-col gap-3 animate-slide-up-delay-3 sm:flex-row sm:items-center">
                  <Link
                    href={hero.ctaPrimary.href}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-sugu-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sugu-500/30 transition-all duration-300 hover:bg-sugu-600 hover:shadow-xl hover:shadow-sugu-500/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-sugu-500 focus-visible:ring-offset-2"
                  >
                    {hero.ctaPrimary.label}
                    <svg
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href={hero.ctaSecondary.href}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white/80 px-7 py-3.5 text-base font-semibold text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white hover:border-gray-400 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                  >
                    <svg
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                      />
                    </svg>
                    {hero.ctaSecondary.label}
                  </Link>
                </div>

                {/* Trust Signals */}
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 animate-slide-up-delay-4">
                  {hero.trustSignals.map((signal) => (
                    <span key={signal.text} className="inline-flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4 text-sugu-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {signal.text}
                    </span>
                  ))}
                </div>

                {/* Social Proof Avatars */}
                <div className="mt-8 flex items-center gap-3 animate-slide-up-delay-5">
                  <div className="flex -space-x-2">
                    <Image
                      src={hero.socialProof.avatarImages[0]}
                      alt="Vendeurs sur SUGU"
                      width={128}
                      height={40}
                      className="h-10 w-auto rounded-full"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Rejoint par{" "}
                    <span className="font-semibold text-gray-700">
                      {hero.socialProof.vendorCount.toLocaleString("fr-FR")}+ vendeurs
                    </span>
                  </p>
                </div>
              </div>

              {/* ── Right Column: Dashboard Mockup ── */}
              <div className="relative lg:mt-0" aria-hidden="true">
                {/* Decorative orange circle */}
                <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-gradient-to-br from-sugu-400/40 to-sugu-300/20 blur-2xl sm:h-64 sm:w-64 lg:h-72 lg:w-72" />

                {/* Dashboard Image */}
                <div className="relative animate-float">
                  <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-2 shadow-2xl shadow-gray-900/10 backdrop-blur-sm">
                    <Image
                      src={hero.dashboardImage}
                      alt="Tableau de bord SUGUPro — gestion des ventes et livraisons"
                      width={700}
                      height={460}
                      className="rounded-xl"
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 700px"
                    />
                  </div>

                  {/* Floating Badge — Star Rating */}
                  <div className="absolute -right-3 bottom-1/3 animate-badge-float rounded-xl border border-white/50 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md sm:-right-4 sm:px-4 sm:py-2.5">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-lg font-bold text-gray-800">4.8</span>
                    </div>
                  </div>

                  {/* Floating Badge — Revenue */}
                  <div className="absolute -left-2 bottom-8 animate-badge-float-delay rounded-xl border border-white/50 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md sm:-left-4 sm:px-4 sm:py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100">
                        <svg
                          className="h-4 w-4 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400">Revenus</p>
                        <p className="text-sm font-bold text-green-600">+125,000 FCFA</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating Badge — New Order */}
                  <div className="absolute -top-3 left-8 animate-badge-float rounded-xl border border-white/50 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md sm:left-12 sm:px-4 sm:py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sugu-100">
                        <svg
                          className="h-3.5 w-3.5 text-sugu-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">Nouvelle commande!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works Section ── */}
        <HowItWorksBlock data={howItWorks} />

        {/* ── Stats Bar ── */}
        <StatsBar data={stats} />

        {/* ── Testimonials Section ── */}
        <TestimonialsBlock data={testimonials} />

        {/* ── Trust Partners Bar ── */}
        <TrustPartnersBar data={trustPartners} />

        {/* ── Pricing Preview Section ── */}
        <PricingPreview data={pricing} />

        {/* ── FAQ Section ── */}
        <FaqBlock data={faq} />

        {/* ── CTA Banner ── */}
        <CtaBanner data={ctaBanner} />
      </main>

      {/* ── Footer ── */}
      <LandingFooter data={footer} />
    </div>
  );
}
