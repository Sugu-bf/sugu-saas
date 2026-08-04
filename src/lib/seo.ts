import type { Metadata } from "next";

export const SUGU_PRO_URL = "https://pro.sugu.pro";
export const SUGU_PRO_NAME = "Sugu Pro";
export const SUGU_ORGANIZATION_ID = "https://sugu.pro/#organization";
/**
 * Purpose-built 1200x630 social card. The dashboard mockup it used to point at
 * is a 640x640 square — it was declared as 1200x630 and cropped badly by every
 * `summary_large_image` consumer.
 */
export const SUGU_PRO_OG_IMAGE = `${SUGU_PRO_URL}/images/og-sugu-pro.png`;

export function createPublicMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `${SUGU_PRO_URL}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SUGU_PRO_NAME}`,
      description,
      url,
      siteName: SUGU_PRO_NAME,
      locale: "fr_BF",
      type: "website",
      images: [
        {
          url: SUGU_PRO_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "Tableau de bord Sugu Pro pour vendeurs et équipes de livraison",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SUGU_PRO_NAME}`,
      description,
      images: [SUGU_PRO_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function suguOrganizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": SUGU_ORGANIZATION_ID,
    name: "Sugu",
    url: "https://sugu.pro/",
    logo: {
      "@type": "ImageObject",
      url: "https://cdn.sugu.pro/p/sugu_logo.png",
    },
  };
}

export function suguProWebSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SUGU_PRO_URL}/#website`,
    name: SUGU_PRO_NAME,
    alternateName: ["SUGUPro", "pro.sugu.pro"],
    url: `${SUGU_PRO_URL}/`,
    inLanguage: "fr-BF",
    publisher: { "@id": SUGU_ORGANIZATION_ID },
  };
}

export function suguProServiceJsonLd() {
  return {
    "@type": ["Service", "SoftwareApplication"],
    "@id": `${SUGU_PRO_URL}/#service`,
    name: SUGU_PRO_NAME,
    url: `${SUGU_PRO_URL}/`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    serviceType: "Gestion des ventes, commandes et livraisons",
    description:
      "Sugu Pro relie catalogue, commandes, livraison, paiement et revenus dans un espace professionnel unique.",
    provider: { "@id": SUGU_ORGANIZATION_ID },
    areaServed: { "@type": "Place", name: "Afrique de l’Ouest" },
  };
}

export function publicPageJsonLd({
  name,
  description,
  path,
  faqs,
}: {
  name: string;
  description: string;
  path: string;
  faqs?: Array<{ question: string; answer: string }>;
}) {
  const url = `${SUGU_PRO_URL}${path}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      suguOrganizationJsonLd(),
      suguProWebSiteJsonLd(),
      suguProServiceJsonLd(),
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name,
        description,
        url,
        isPartOf: { "@id": `${SUGU_PRO_URL}/#website` },
        about: { "@id": `${SUGU_PRO_URL}/#service` },
        inLanguage: "fr-BF",
      },
      // Note: Google restricted the FAQ rich result to government and health
      // sites in 2023, so this buys no SERP feature. It is still parsed by Bing
      // and by the LLM crawlers that increasingly drive B2B discovery.
      ...(faqs?.length
        ? [
            {
              "@type": "FAQPage",
              "@id": `${url}#faq`,
              mainEntity: faqs.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Sugu Pro",
            item: `${SUGU_PRO_URL}/`,
          },
          { "@type": "ListItem", position: 2, name, item: url },
        ],
      },
    ],
  };
}
