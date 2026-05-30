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
import {
  ArrowRight,
  BellRing,
  Check,
  PlayCircle,
  Route,
  Rocket,
  Star,
  TrendingUp,
} from "lucide-react";

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
      {/* ── Navbar ── */}
      <LandingNavbar navLinks={navLinks} />

      <main>
        {/* ── Hero Section ── */}
        <section
          id="hero"
          className="relative isolate px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-28 lg:pb-24"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
              {/* ── Left Column: Text Content ── */}
              <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-none lg:text-left">
                {/* Social Proof Badge */}
                <div className="animate-slide-up">
                  <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-white px-4 py-1.5 text-sm font-semibold text-sugu-700 shadow-sm shadow-sugu-500/5">
                    <Rocket className="h-4 w-4 text-orange-500" />
                    {hero.badge}
                  </span>
                </div>

                {/* Headline */}
                <h1
                  id="hero-heading"
                  className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#101828] animate-slide-up-delay-1 sm:text-5xl lg:text-[3.75rem]"
                >
                  {hero.headlineBefore}
                  <span className="text-sugu-500">{hero.headlineHighlight}</span>
                  {hero.headlineAfter}
                </h1>

                {/* Subtext */}
                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 animate-slide-up-delay-2 lg:mx-0">
                  {hero.subtext}
                </p>

                {/* CTA Buttons */}
                <div className="mt-8 flex flex-col justify-center gap-3 animate-slide-up-delay-3 sm:flex-row sm:items-center lg:justify-start">
                  <Link
                    href={hero.ctaPrimary.href}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-sugu-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sugu-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-sugu-600 hover:shadow-xl hover:shadow-sugu-500/30 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-sugu-500 focus-visible:ring-offset-2"
                  >
                    {hero.ctaPrimary.label}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href={hero.ctaSecondary.href}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                  >
                    <PlayCircle className="h-5 w-5 text-gray-500" />
                    {hero.ctaSecondary.label}
                  </Link>
                </div>

                {/* Trust Signals */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-500 animate-slide-up-delay-4 lg:justify-start">
                  {hero.trustSignals.map((signal) => (
                    <span key={signal.text} className="inline-flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-sugu-500" />
                      {signal.text}
                    </span>
                  ))}
                </div>

                {/* Social Proof Avatars */}
                <div className="mt-8 flex flex-col items-center gap-3 animate-slide-up-delay-5 sm:flex-row sm:justify-center lg:justify-start">
                  <div className="flex -space-x-3">
                    {hero.socialProof.avatarImages.map((avatar) => (
                      <Image
                        key={avatar}
                        src={avatar}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
                      />
                    ))}
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-sugu-500 text-xs font-bold text-white shadow-sm">
                      +
                    </span>
                  </div>
                  <p className="max-w-xs text-sm leading-relaxed text-gray-500 sm:max-w-none">
                    Rejoint par{" "}
                    <span className="font-semibold text-gray-800">
                      {hero.socialProof.vendorCount.toLocaleString("en-US")}+ vendeurs, boutiques et commerçants
                    </span>
                  </p>
                </div>
              </div>

              {/* ── Right Column: Human Hero Image ── */}
              <div className="relative mx-auto w-full max-w-[620px] lg:mx-0 lg:max-w-none">
                <div className="relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white shadow-[0_24px_80px_rgba(16,24,40,0.14)]">
                  <div className="relative aspect-[4/5] min-h-[420px] sm:aspect-[16/11] lg:aspect-[4/3] lg:min-h-[520px]">
                    <Image
                      src={hero.dashboardImage}
                      alt="Vendeuse africaine préparant des commandes e-commerce dans sa boutique"
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#101828]/20 via-transparent to-white/5"
                    />
                  </div>
                </div>

                <div className="absolute right-4 top-5 flex animate-badge-float-delay items-center gap-1.5 rounded-2xl border border-white/80 bg-white px-3 py-2.5 shadow-[0_16px_40px_rgba(16,24,40,0.14)] transition-transform duration-300 hover:-translate-y-1 sm:right-7 lg:-right-5 lg:top-20">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-extrabold text-[#101828]">4.8</span>
                </div>

                <div className="absolute left-3 top-5 flex animate-badge-float items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-2.5 text-left shadow-[0_16px_40px_rgba(16,24,40,0.14)] transition-transform duration-300 hover:-translate-y-1 sm:left-6 lg:-left-8 lg:top-12">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sugu-100 text-sugu-600">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase leading-none text-gray-400">Commande</p>
                    <p className="mt-1 text-sm font-bold text-[#101828]">Nouvelle commande!</p>
                  </div>
                </div>

                <div className="absolute bottom-6 left-4 flex animate-badge-float-delay items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-2.5 text-left shadow-[0_16px_40px_rgba(16,24,40,0.14)] transition-transform duration-300 hover:-translate-y-1 sm:bottom-8 sm:left-8 lg:-left-10">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase leading-none text-gray-400">Ventes</p>
                    <p className="mt-1 text-sm font-extrabold text-emerald-600">+125,000 FCFA</p>
                  </div>
                </div>

                <div className="absolute right-3 top-[48%] hidden animate-badge-float items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-2.5 text-left shadow-[0_16px_40px_rgba(16,24,40,0.14)] transition-transform duration-300 hover:-translate-y-1 sm:flex lg:-right-8">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Route className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase leading-none text-gray-400">Livraison</p>
                    <p className="mt-1 text-sm font-bold text-[#101828]">Livraison en cours</p>
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
