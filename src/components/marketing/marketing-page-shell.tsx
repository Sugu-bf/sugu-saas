import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { MarketingPageContent } from "@/lib/marketing-pages";
import { publicPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

const publicLinks = [
  { href: "/vendeurs", label: "Vendeurs" },
  { href: "/agences-de-livraison", label: "Agences" },
  { href: "/coursiers", label: "Coursiers" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingPageShell({ page }: { page: MarketingPageContent }) {
  return (
    <div className="min-h-screen bg-[#f7f0e7] text-[#07111f]">
      <JsonLd
        data={publicPageJsonLd({
          name: page.title,
          description: page.description,
          path: page.path,
          faqs: page.faqs,
        })}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/95 text-white backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Navigation Sugu Pro">
          <Link href="/" className="flex items-baseline gap-0.5" aria-label="Sugu Pro — Accueil">
            <span className="text-2xl font-black tracking-[-0.04em]">SUGU</span>
            <span className="text-xs font-black text-[#f15412]">Pro</span>
          </Link>
          <div className="hidden items-center gap-5 text-sm font-bold text-white/70 lg:flex">
            {publicLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="/login" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#07111f] transition hover:bg-[#c9f2e2]">
            Connexion
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#07111f] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(241,84,18,.32),transparent_32rem)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
            <div className="self-center">
              <nav className="mb-8 text-sm font-bold text-white/50" aria-label="Fil d’Ariane">
                <Link href="/" className="hover:text-white">Sugu Pro</Link>
                <span aria-hidden="true"> / </span>
                <span className="text-white/80">{page.eyebrow}</span>
              </nav>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#fb8a3c]">{page.eyebrow}</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                {page.title}
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-white/68 sm:text-xl">
                {page.description}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href={page.ctaHref} className="inline-flex items-center gap-3 rounded-full bg-[#f15412] px-7 py-4 font-black text-white shadow-[0_0_60px_rgba(241,84,18,.3)] transition hover:bg-[#d43d0a]">
                  {page.ctaLabel}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <a href="https://sugu.pro/" className="inline-flex items-center rounded-full border border-white/20 px-7 py-4 font-black text-white transition hover:bg-white/10">
                  Acheter sur Sugu
                </a>
              </div>
            </div>

            <div className="relative self-center overflow-hidden rounded-[2rem] border border-white/12 bg-white/8 p-3 shadow-2xl backdrop-blur">
              <Image
                src="/images/landing/dashboard-mockup.jpg"
                alt="Aperçu du tableau de bord professionnel Sugu Pro"
                // The file is 640x640; declaring 1200x800 reserved the wrong
                // aspect ratio and shifted layout on load.
                width={640}
                height={640}
                priority
                className="h-auto w-full rounded-[1.4rem]"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f15412]">Le principe</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Un même fil pour toute l’opération.</h2>
              <p className="mt-6 text-lg font-semibold leading-8 text-slate-600">{page.promise}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.features.map((feature, index) => (
                <article key={feature.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-sm font-black text-[#f15412]">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                  <p className="mt-3 font-medium leading-7 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0e6b57]">Résultats recherchés</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">Plus clair pour l’équipe. Plus fiable pour le client.</h2>
            </div>
            <ul className="grid gap-4">
              {page.outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-4 rounded-2xl bg-[#f7f0e7] p-5 font-bold">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#0e6b57]" aria-hidden="true" />
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {page.faqs && (
          <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-4xl font-black tracking-[-0.04em]">Questions fréquentes</h2>
            <div className="mt-10 grid gap-4">
              {page.faqs.map((item) => (
                <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-6">
                  <summary className="cursor-pointer list-none text-lg font-black">{item.question}</summary>
                  <p className="mt-4 font-medium leading-7 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="bg-[#0e6b57] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#c9f2e2]">Prêt à avancer ?</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em]">Donnez un système clair à votre prochaine commande.</h2>
            </div>
            <Link href={page.ctaHref} className="inline-flex shrink-0 items-center gap-3 rounded-full bg-white px-7 py-4 font-black text-[#07111f] transition hover:bg-[#c9f2e2]">
              {page.ctaLabel}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#07111f] px-4 py-10 text-white/60 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Link href="/" className="flex items-baseline gap-0.5 text-white">
              <span className="text-2xl font-black">SUGU</span><span className="text-xs font-black text-[#f15412]">Pro</span>
            </Link>
            <p className="mt-3 max-w-xl text-sm font-semibold">Le système professionnel de l’écosystème Sugu pour les ventes et la livraison.</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold" aria-label="Écosystème Sugu">
            <a href="https://sugu.pro/" className="hover:text-white">Marketplace Sugu</a>
            <a href="https://sugupay.net/" className="hover:text-white">SuguPay</a>
            <Link href="/faq" className="hover:text-white">FAQ</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
