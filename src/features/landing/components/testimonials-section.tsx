import Image from "next/image";
import type { TestimonialsSection } from "../schema";

// ============================================================
// Testimonials Section — Server Component
// ============================================================

interface TestimonialsSectionProps {
  data: TestimonialsSection;
}

/** Star rating SVG (5 filled stars) */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} sur 5 étoiles`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-sugu-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** Role badge component */
function RoleBadge({ role }: { role: "Vendeur" | "Agence" }) {
  const isVendeur = role === "Vendeur";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isVendeur
          ? "bg-sugu-100 text-sugu-600"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {role}
    </span>
  );
}

export function TestimonialsBlock({ data }: TestimonialsSectionProps) {
  return (
    <section
      id="temoignages"
      className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* ── Section Header ── */}
        <div className="text-center">
          {/* Badge pill */}
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-sugu-700 shadow-sm backdrop-blur-md animate-slide-up">
            {data.badge}
          </span>

          <h2
            id="testimonials-heading"
            className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 animate-slide-up-delay-1 sm:text-4xl"
          >
            {data.heading}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 animate-slide-up-delay-2 sm:text-lg">
            {data.subtext}
          </p>
        </div>

        {/* ── Testimonial Cards Grid ── */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {data.items.map((testimonial, index) => (
            <article
              key={testimonial.id}
              className={`group relative flex flex-col rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-sugu-200/60 animate-slide-up-delay-${index + 1}`}
              style={{
                animationDelay: `${(index + 1) * 100}ms`,
              }}
            >
              {/* Orange left accent bar */}
              <div
                className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b from-sugu-400 to-sugu-500 opacity-80"
                aria-hidden="true"
              />

              {/* Star rating */}
              <div className="mb-4">
                <StarRating rating={testimonial.rating} />
              </div>

              {/* Quote text */}
              <blockquote className="flex-1 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
                <p>&ldquo;{testimonial.quote}&rdquo;</p>
              </blockquote>

              {/* Author info */}
              <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
                <Image
                  src={testimonial.author.avatarUrl}
                  alt={testimonial.author.name}
                  width={44}
                  height={44}
                  className="rounded-full object-cover ring-2 ring-white"
                  sizes="44px"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {testimonial.author.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {testimonial.author.business}
                  </p>
                </div>
                <RoleBadge role={testimonial.author.role} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
