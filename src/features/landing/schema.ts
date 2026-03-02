import { z } from "zod";

// ============================================================
// Landing Page — Zod Schemas
// ============================================================

/** Navigation link in the landing navbar */
export const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export type NavLink = z.infer<typeof navLinkSchema>;

/** Trust signal badge below CTA */
export const trustSignalSchema = z.object({
  text: z.string(),
});

export type TrustSignal = z.infer<typeof trustSignalSchema>;

/** Social proof data (avatars + vendor count) */
export const socialProofSchema = z.object({
  vendorCount: z.number(),
  avatarImages: z.array(z.string()),
});

export type SocialProof = z.infer<typeof socialProofSchema>;

/** Complete hero section data */
export const heroSectionSchema = z.object({
  badge: z.string(),
  headlineBefore: z.string(),
  headlineHighlight: z.string(),
  headlineAfter: z.string(),
  subtext: z.string(),
  ctaPrimary: z.object({
    label: z.string(),
    href: z.string(),
  }),
  ctaSecondary: z.object({
    label: z.string(),
    href: z.string(),
  }),
  trustSignals: z.array(trustSignalSchema),
  socialProof: socialProofSchema,
  dashboardImage: z.string(),
});

export type HeroSection = z.infer<typeof heroSectionSchema>;

// ============================================================
// Testimonials Section
// ============================================================

/** Single testimonial entry */
export const testimonialSchema = z.object({
  id: z.string(),
  quote: z.string(),
  rating: z.number().min(1).max(5),
  author: z.object({
    name: z.string(),
    business: z.string(),
    avatarUrl: z.string(),
    role: z.enum(["Vendeur", "Agence"]),
  }),
});

export type Testimonial = z.infer<typeof testimonialSchema>;

/** Testimonials section data */
export const testimonialsSectionSchema = z.object({
  badge: z.string(),
  heading: z.string(),
  subtext: z.string(),
  items: z.array(testimonialSchema),
});

export type TestimonialsSection = z.infer<typeof testimonialsSectionSchema>;

// ============================================================
// Trust Partners Section (logos bar)
// ============================================================

/** Trust partner logo */
export const trustPartnerSchema = z.object({
  name: z.string(),
  /** SVG icon name or image URL — using name for inline SVG rendering */
  iconType: z.enum([
    "delivery-truck",
    "card-payment",
    "orange-money",
    "mobipay",
    "sama-logistics",
    "shopmali",
    "ecovende",
  ]),
});

export type TrustPartner = z.infer<typeof trustPartnerSchema>;

/** Trust partners bar data */
export const trustPartnersSectionSchema = z.object({
  label: z.string(),
  partners: z.array(trustPartnerSchema),
});

export type TrustPartnersSection = z.infer<typeof trustPartnersSectionSchema>;

// ============================================================
// Pricing Preview Section
// ============================================================

/** Single pricing plan feature */
export const pricingFeatureSchema = z.object({
  text: z.string(),
});

export type PricingFeature = z.infer<typeof pricingFeatureSchema>;

/** Single pricing plan */
export const pricingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  currency: z.string(),
  period: z.string().optional(),
  isPopular: z.boolean(),
  features: z.array(pricingFeatureSchema),
  cta: z.object({
    label: z.string(),
    href: z.string(),
  }),
});

export type PricingPlan = z.infer<typeof pricingPlanSchema>;

/** Pricing section data */
export const pricingSectionSchema = z.object({
  badge: z.string(),
  heading: z.string(),
  plans: z.array(pricingPlanSchema),
});

export type PricingSection = z.infer<typeof pricingSectionSchema>;

// ============================================================
// How It Works Section
// ============================================================

/** Single onboarding step */
export const howItWorksStepSchema = z.object({
  id: z.string(),
  stepNumber: z.number(),
  stepLabel: z.string(),
  title: z.string(),
  description: z.string(),
  footerNote: z.string().optional(),
  iconType: z.enum(["create-account", "configure-space", "start-selling"]),
});

export type HowItWorksStep = z.infer<typeof howItWorksStepSchema>;

/** How it works section data */
export const howItWorksSectionSchema = z.object({
  badge: z.string(),
  heading: z.string(),
  subtext: z.string(),
  steps: z.array(howItWorksStepSchema),
  cta: z.object({
    label: z.string(),
    href: z.string(),
  }),
});

export type HowItWorksSection = z.infer<typeof howItWorksSectionSchema>;

// ============================================================
// Stats Section
// ============================================================

/** Single stat/metric item */
export const statItemSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
  iconType: z.enum(["vendors", "orders", "cities", "satisfaction"]),
});

export type StatItem = z.infer<typeof statItemSchema>;

/** Stats section data */
export const statsSectionSchema = z.object({
  items: z.array(statItemSchema),
});

export type StatsSection = z.infer<typeof statsSectionSchema>;

// ============================================================
// FAQ Section
// ============================================================

/** Single FAQ item */
export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export type FaqItem = z.infer<typeof faqItemSchema>;

/** FAQ section data */
export const faqSectionSchema = z.object({
  badge: z.string(),
  heading: z.string(),
  subtext: z.string(),
  items: z.array(faqItemSchema),
});

export type FaqSection = z.infer<typeof faqSectionSchema>;

// ============================================================
// CTA Banner Section
// ============================================================

/** CTA banner section data */
export const ctaBannerSectionSchema = z.object({
  heading: z.string(),
  subtext: z.string(),
  ctaPrimary: z.object({
    label: z.string(),
    href: z.string(),
  }),
  ctaSecondary: z.object({
    label: z.string(),
    href: z.string(),
  }),
});

export type CtaBannerSection = z.infer<typeof ctaBannerSectionSchema>;

// ============================================================
// Footer Section
// ============================================================

/** Social link */
export const socialLinkSchema = z.object({
  platform: z.enum(["facebook", "instagram", "twitter", "linkedin"]),
  href: z.string(),
  label: z.string(),
});

export type SocialLink = z.infer<typeof socialLinkSchema>;

/** Footer link column */
export const footerColumnSchema = z.object({
  title: z.string(),
  links: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    })
  ),
});

export type FooterColumn = z.infer<typeof footerColumnSchema>;

/** Footer section data */
export const footerSectionSchema = z.object({
  brandTagline: z.string(),
  socialLinks: z.array(socialLinkSchema),
  columns: z.array(footerColumnSchema),
  copyright: z.string(),
  legalLinks: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    })
  ),
});

export type FooterSection = z.infer<typeof footerSectionSchema>;

// ============================================================
// Complete Landing Page Data
// ============================================================

/** Complete landing page data */
export const landingPageSchema = z.object({
  navLinks: z.array(navLinkSchema),
  hero: heroSectionSchema,
  testimonials: testimonialsSectionSchema,
  trustPartners: trustPartnersSectionSchema,
  pricing: pricingSectionSchema,
  howItWorks: howItWorksSectionSchema,
  stats: statsSectionSchema,
  faq: faqSectionSchema,
  ctaBanner: ctaBannerSectionSchema,
  footer: footerSectionSchema,
});

export type LandingPageData = z.infer<typeof landingPageSchema>;
