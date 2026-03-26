import type { LandingPageData } from "../schema";

// ============================================================
// Landing Page — Mock Data (Design-Only)
// ============================================================

export const landingPageMock: LandingPageData = {
  navLinks: [
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "Témoignages", href: "#temoignages" },
    { label: "FAQ", href: "#faq" },
    { label: "Blog", href: "/blog" },
  ],
  hero: {
    badge: "+2,500 vendeurs nous font confiance",
    headlineBefore: "Vendez et livrez sur ",
    headlineHighlight: "SUGU",
    headlineAfter: ", la marketplace #1 d'Afrique",
    subtext:
      "Créez votre boutique en ligne, gérez vos produits, suivez vos livraisons et boostez vos ventes — tout depuis un seul tableau de bord.",
    ctaPrimary: {
      label: "Créer ma boutique",
      href: "/login",
    },
    ctaSecondary: {
      label: "Voir la démo",
      href: "#demo",
    },
    trustSignals: [
      { text: "Gratuit pour commencer" },
      { text: "Sans engagement" },
      { text: "Setup en 5 min" },
    ],
    socialProof: {
      vendorCount: 2500,
      avatarImages: ["/images/landing/avatars.jpg"],
    },
    dashboardImage: "/images/landing/dashboard-mockup.jpg",
  },

  // ──────────────────────────────────────────
  // Testimonials Section
  // ──────────────────────────────────────────
  testimonials: {
    badge: "Témoignages",
    heading: "Ils nous font confiance",
    subtext:
      "Découvrez ce que nos vendeurs et agences de livraison disent de SUGU Pro",
    items: [
      {
        id: "t1",
        quote:
          "Depuis que j'utilise SUGU Pro, mes ventes ont augmenté de 300%. Le tableau de bord est incroyable et le suivi des livraisons me fait gagner un temps fou !",
        rating: 5,
        author: {
          name: "Mamadou Diallo",
          business: "Boutique Mamadou, Bamako",
          avatarUrl: "/images/landing/testimonials/avatar-mamadou.jpg",
          role: "Vendeur",
        },
      },
      {
        id: "t2",
        quote:
          "La gestion de notre flotte de 25 livreurs n'a jamais été aussi simple. La carte en temps réel et les analytics nous ont permis d'optimiser nos trajets de 40%.",
        rating: 5,
        author: {
          name: "Fatoumata Sanogo",
          business: "Express Bamako Livraison",
          avatarUrl: "/images/landing/testimonials/avatar-fatoumata.jpg",
          role: "Agence",
        },
      },
      {
        id: "t3",
        quote:
          "Le plan Pro vaut chaque franc. Les analytics avancés m'ont aidé à identifier mes meilleurs produits et à doubler mon chiffre d'affaires en 3 mois.",
        rating: 5,
        author: {
          name: "Seydou Traoré",
          business: "Artisanat du Sahel, Ouaga",
          avatarUrl: "/images/landing/testimonials/avatar-seydou.jpg",
          role: "Vendeur",
        },
      },
    ],
  },

  // ──────────────────────────────────────────
  // Trust Partners Section
  // ──────────────────────────────────────────
  trustPartners: {
    label: "Ils nous font confiance",
    partners: [
      { name: "Livraison Express", iconType: "delivery-truck" },
      { name: "Paiement Carte", iconType: "card-payment" },
      { name: "Orange Money", iconType: "orange-money" },
      { name: "MobiPay", iconType: "mobipay" },
      { name: "SamaLogistics", iconType: "sama-logistics" },
      { name: "ShopMali", iconType: "shopmali" },
      { name: "EcoVende", iconType: "ecovende" },
    ],
  },

  // ──────────────────────────────────────────
  // Pricing Preview Section
  // ──────────────────────────────────────────
  pricing: {
    badge: "Tarifs",
    heading: "Des tarifs simples et transparents",
    plans: [
      {
        id: "free",
        name: "Gratuit",
        price: 0,
        currency: "FCFA",
        isPopular: false,
        features: [
          { text: "Accès tableau de bord" },
          { text: "Gestion de 5 produits" },
          { text: "Suivi basique des ventes" },
          { text: "Support par email" },
        ],
        cta: {
          label: "Commencer gratuitement",
          href: "/login",
        },
      },
      {
        id: "pro",
        name: "Pro",
        price: 14900,
        currency: "FCFA",
        period: "/mois",
        isPopular: true,
        features: [
          { text: "Toutes les fonctionnalités Gratuit" },
          { text: "Produits illimités" },
          { text: "Analytics avancés & rapports" },
          { text: "Suivi des livraisons en temps réel" },
          { text: "Priorité support client" },
          { text: "Outils marketing avancés" },
        ],
        cta: {
          label: "Essai gratuit 14 jours →",
          href: "/login?plan=pro",
        },
      },
    ],
  },

  // ──────────────────────────────────────────
  // How It Works Section
  // ──────────────────────────────────────────
  howItWorks: {
    badge: "Comment ça marche",
    heading: "Lancez-vous en 3 étapes simples",
    subtext:
      "Rejoignez SUGU Pro en quelques minutes et commencez à vendre dès aujourd'hui",
    steps: [
      {
        id: "step-1",
        stepNumber: 1,
        stepLabel: "STEP 1",
        title: "Créez votre compte",
        description:
          "Inscrivez-vous gratuitement, choisissez votre type de compte et remplissez vos informations en 2 minutes.",
        footerNote: "Gratuit, sans carte bancaire",
        iconType: "create-account",
      },
      {
        id: "step-2",
        stepNumber: 2,
        stepLabel: "STEP 2",
        title: "Configurez votre espace",
        description:
          "Ajoutez vos produits, personnalisez votre boutique et choisissez vos options de livraison.",
        footerNote: "Assistance disponible 24/7",
        iconType: "configure-space",
      },
      {
        id: "step-3",
        stepNumber: 3,
        stepLabel: "STEP 3",
        title: "Commencez à vendre !",
        description:
          "Recevez vos premières commandes, gérez vos livraisons et suivez vos revenus en temps réel.",
        footerNote: "Premiers revenus sous 48h",
        iconType: "start-selling",
      },
    ],
    cta: {
      label: "Commencer maintenant →",
      href: "/login",
    },
  },

  // ──────────────────────────────────────────
  // Stats Section
  // ──────────────────────────────────────────
  stats: {
    items: [
      {
        id: "stat-vendors",
        value: "2,500+",
        label: "Vendeurs actifs",
        iconType: "vendors",
      },
      {
        id: "stat-orders",
        value: "50,000+",
        label: "Commandes/mois",
        iconType: "orders",
      },
      {
        id: "stat-cities",
        value: "15+",
        label: "Villes couvertes",
        iconType: "cities",
      },
      {
        id: "stat-satisfaction",
        value: "98.5%",
        label: "Taux de satisfaction",
        iconType: "satisfaction",
      },
    ],
  },

  // ──────────────────────────────────────────
  // FAQ Section
  // ──────────────────────────────────────────
  faq: {
    badge: "FAQ",
    heading: "Questions fréquentes",
    subtext: "Tout ce que vous devez savoir pour commencer",
    items: [
      {
        id: "faq-1",
        question: "Comment créer ma boutique sur SUGU ?",
        answer:
          "Inscrivez-vous gratuitement, remplissez les informations de votre boutique et commencez à ajouter vos produits. Tout le processus prend moins de 5 minutes.",
      },
      {
        id: "faq-2",
        question: "Quels sont les frais de commission ?",
        answer:
          "Le plan Gratuit inclut une commission de 5% par vente. Le plan Pro réduit la commission à 2.5% et offre des fonctionnalités avancées comme les analytics et le suivi en temps réel.",
      },
      {
        id: "faq-3",
        question: "Comment sont gérées les livraisons ?",
        answer:
          "Vous pouvez utiliser vos propres livreurs ou faire appel à nos agences partenaires. Le suivi en temps réel est disponible sur le plan Pro pour une visibilité complète.",
      },
      {
        id: "faq-4",
        question: "Quand est-ce que je reçois mes paiements ?",
        answer:
          "Les paiements sont virés automatiquement tous les 7 jours sur votre compte Orange Money ou bancaire. Le plan Pro offre des virements plus fréquents (J+2).",
      },
      {
        id: "faq-5",
        question: "Puis-je passer du plan Gratuit au plan Pro ?",
        answer:
          "Oui ! Vous pouvez mettre à niveau votre plan à tout moment depuis votre tableau de bord. L'essai gratuit de 14 jours du plan Pro vous permet de tester toutes les fonctionnalités.",
      },
      {
        id: "faq-6",
        question: "SUGU est disponible dans quelles villes ?",
        answer:
          "SUGU est actuellement disponible dans 15+ villes au Mali, Burkina Faso et Sénégal. Nous étendons notre couverture chaque mois vers de nouvelles villes d'Afrique de l'Ouest.",
      },
    ],
  },

  // ──────────────────────────────────────────
  // CTA Banner Section
  // ──────────────────────────────────────────
  ctaBanner: {
    heading: "Prêt à booster votre business ?",
    subtext:
      "Rejoignez des milliers de vendeurs et agences de livraison qui font confiance à SUGU Pro.",
    ctaPrimary: {
      label: "Créer mon compte gratuitement →",
      href: "/login",
    },
    ctaSecondary: {
      label: "Contacter notre équipe",
      href: "#contact",
    },
  },

  // ──────────────────────────────────────────
  // Footer Section
  // ──────────────────────────────────────────
  footer: {
    brandTagline: "La marketplace africaine",
    socialLinks: [
      { platform: "facebook", href: "https://facebook.com/sugupro", label: "Facebook" },
      { platform: "instagram", href: "https://instagram.com/sugupro", label: "Instagram" },
      { platform: "twitter", href: "https://twitter.com/sugupro", label: "Twitter" },
      { platform: "linkedin", href: "https://linkedin.com/company/sugupro", label: "LinkedIn" },
    ],
    columns: [
      {
        title: "Produit",
        links: [
          { label: "Fonctionnalités", href: "#fonctionnalites" },
          { label: "Tarifs", href: "#tarifs" },
          { label: "Intégrations", href: "#integrations" },
          { label: "Changelog", href: "#changelog" },
        ],
      },
      {
        title: "Ressources",
        links: [
          { label: "Blog", href: "/blog" },
          { label: "Centre d'aide", href: "#aide" },
          { label: "Guide vendeur", href: "#guide" },
          { label: "API Documentation", href: "#api" },
        ],
      },
      {
        title: "Entreprise",
        links: [
          { label: "À propos", href: "#apropos" },
          { label: "Carrières", href: "#carrieres" },
          { label: "Contact", href: "#contact" },
          { label: "Mentions légales", href: "#mentions" },
        ],
      },
    ],
    copyright: "© 2026 SUGU. Tous droits réservés.",
    legalLinks: [
      { label: "Conditions d'utilisation", href: "#cgu" },
      { label: "Politique de confidentialité", href: "#privacy" },
      { label: "Cookies", href: "#cookies" },
    ],
  },
};
