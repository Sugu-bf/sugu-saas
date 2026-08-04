export interface MarketingFeature {
  title: string;
  description: string;
}

export interface MarketingFaq {
  question: string;
  answer: string;
}

export interface MarketingPageContent {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  promise: string;
  features: MarketingFeature[];
  outcomes: string[];
  ctaLabel: string;
  ctaHref: string;
  faqs?: MarketingFaq[];
}

export const marketingPages = {
  vendeurs: {
    path: "/vendeurs",
    eyebrow: "Pour les vendeurs",
    title: "Pilotez votre boutique Sugu sans perdre le fil.",
    description:
      "Centralisez catalogue, stock, commandes, livraisons et revenus dans un espace professionnel conçu pour le commerce local.",
    promise:
      "Sugu Pro transforme chaque commande en un parcours clair, de la mise en ligne du produit jusqu’au règlement.",
    features: [
      { title: "Catalogue maîtrisé", description: "Créez et mettez à jour vos produits depuis un seul espace." },
      { title: "Commandes lisibles", description: "Retrouvez le client, les articles et le statut sans chercher l’information." },
      { title: "Livraison connectée", description: "Préparez la remise au coursier et suivez l’avancement de la commande." },
      { title: "Revenus suivis", description: "Consultez les mouvements liés à votre activité et à vos commandes." },
    ],
    outcomes: ["Moins d’oublis opérationnels", "Une équipe alignée sur le même statut", "Une expérience client plus prévisible"],
    ctaLabel: "Accéder à mon espace vendeur",
    ctaHref: "/login",
  },
  "agences-de-livraison": {
    path: "/agences-de-livraison",
    eyebrow: "Pour les agences de livraison",
    title: "Coordonnez les courses, les coursiers et les preuves de livraison.",
    description:
      "Sugu Pro donne aux agences une vue commune pour recevoir les missions, affecter les coursiers et suivre chaque livraison.",
    promise:
      "Les équipes terrain et le back-office travaillent à partir de la même commande et du même statut.",
    features: [
      { title: "Affectation structurée", description: "Assignez une livraison à un coursier disponible depuis le tableau de bord." },
      { title: "Suivi des missions", description: "Visualisez les livraisons en attente, en cours et finalisées." },
      { title: "Équipe coursiers", description: "Gérez les profils, véhicules et accès de votre équipe." },
      { title: "Historique exploitable", description: "Retrouvez les opérations passées pour mieux piloter l’activité." },
    ],
    outcomes: ["Des responsabilités clairement attribuées", "Moins d’appels pour connaître le statut", "Une traçabilité partagée"],
    ctaLabel: "Accéder à l’espace agence",
    ctaHref: "/login",
  },
  coursiers: {
    path: "/coursiers",
    eyebrow: "Pour les coursiers",
    title: "Gardez vos missions, vos statuts et vos gains au même endroit.",
    description:
      "L’espace coursier Sugu Pro présente l’essentiel de chaque livraison dans une interface adaptée au terrain et au téléphone.",
    promise:
      "Chaque étape utile reste visible : mission, destination, progression, validation et historique.",
    features: [
      { title: "Missions accessibles", description: "Consultez les livraisons qui vous sont affectées et leur priorité." },
      { title: "Étapes guidées", description: "Mettez à jour le statut au fil de la prise en charge et de la remise." },
      { title: "Validation sécurisée", description: "Confirmez la livraison avec les mécanismes prévus par la commande." },
      { title: "Gains visibles", description: "Suivez les revenus associés à votre activité de livraison." },
    ],
    outcomes: ["Moins d’informations dispersées", "Un parcours mobile plus direct", "Un historique disponible à tout moment"],
    ctaLabel: "Créer mon accès coursier",
    ctaHref: "/signup/driver",
  },
  fonctionnalites: {
    path: "/fonctionnalites",
    eyebrow: "Fonctionnalités Sugu Pro",
    title: "Un système continu, de la vente à la livraison.",
    description:
      "Découvrez les modules qui relient les vendeurs, les agences et les coursiers autour d’un même cycle de commande.",
    promise:
      "Sugu Pro évite la rupture entre le catalogue, la commande, le colis, le paiement et le revenu.",
    features: [
      { title: "Produits et inventaire", description: "Informations, prix, médias et disponibilité sont gérés dans le même environnement." },
      { title: "Commandes", description: "Chaque commande conserve ses articles, son client et ses changements de statut." },
      { title: "Livraison", description: "Agences et coursiers disposent de vues dédiées à leurs responsabilités." },
      { title: "Paiements et revenus", description: "Les opérations financières restent rattachées au parcours commercial." },
      { title: "Messagerie", description: "Les échanges utiles restent proches des opérations concernées." },
      { title: "Statistiques", description: "Les tableaux de bord synthétisent l’activité selon le rôle connecté." },
    ],
    outcomes: ["Une source de vérité commune", "Des rôles clairement séparés", "Un suivi adapté au mobile comme au bureau"],
    ctaLabel: "Découvrir Sugu Pro",
    ctaHref: "/#flow",
  },
  tarifs: {
    path: "/tarifs",
    eyebrow: "Tarification",
    title: "Une tarification expliquée avant votre activation.",
    description:
      "Le modèle applicable dépend de votre rôle, de vos opérations et des services activés. L’équipe Sugu vous présente les conditions avant la mise en service.",
    promise:
      "Aucun chiffre générique inventé : votre configuration est qualifiée et les conditions correspondantes sont communiquées clairement.",
    features: [
      { title: "Vendeur", description: "Les services utiles à la gestion de boutique et de commandes sont cadrés selon votre activité." },
      { title: "Agence", description: "L’organisation de l’équipe et le volume de livraisons sont pris en compte." },
      { title: "Coursier", description: "Les conditions liées aux missions et aux gains sont présentées lors de l’intégration." },
      { title: "Accompagnement", description: "L’équipe Sugu précise les prérequis et le périmètre retenu avant activation." },
    ],
    outcomes: ["Des conditions adaptées au rôle", "Un périmètre connu avant démarrage", "Un point de contact pour les questions commerciales"],
    ctaLabel: "Demander les conditions",
    ctaHref: "/#final",
  },
  faq: {
    path: "/faq",
    eyebrow: "Questions fréquentes",
    title: "Les réponses essentielles avant de commencer.",
    description:
      "Comprenez à qui s’adresse Sugu Pro, comment accéder à votre espace et comment les rôles collaborent autour d’une commande.",
    promise: "Une réponse claire vaut mieux qu’une promesse vague. Voici les informations utiles avant votre inscription.",
    features: [
      { title: "Vendeurs", description: "Gérez produits, commandes, livraison et suivi de l’activité." },
      { title: "Agences", description: "Organisez les missions et les équipes de coursiers." },
      { title: "Coursiers", description: "Consultez et exécutez les livraisons qui vous sont confiées." },
    ],
    outcomes: ["Un espace adapté à chaque rôle", "Des accès protégés", "Un parcours relié à la marketplace Sugu"],
    ctaLabel: "Accéder à Sugu Pro",
    ctaHref: "/login",
    faqs: [
      { question: "À qui s’adresse Sugu Pro ?", answer: "Sugu Pro est conçu pour les vendeurs de la marketplace Sugu, les agences de livraison partenaires et leurs coursiers." },
      { question: "Puis-je utiliser le même espace pour tous les rôles ?", answer: "Chaque rôle possède une interface et des autorisations adaptées à ses responsabilités. Les accès sont séparés pour protéger les opérations." },
      { question: "Comment un coursier rejoint-il une agence ?", answer: "Le parcours d’inscription coursier et les mécanismes d’invitation permettent de rattacher le profil à l’organisation concernée." },
      { question: "Sugu Pro remplace-t-il la marketplace ?", answer: "Non. sugu.pro est l’espace d’achat public. Sugu Pro est le système professionnel utilisé pour administrer les ventes et les livraisons." },
      { question: "Où les paiements sont-ils gérés ?", answer: "Les paiements des commandes Sugu s’appuient sur SuguPay. Sugu Pro restitue les informations utiles au suivi de l’activité professionnelle." },
    ],
  },
} satisfies Record<string, MarketingPageContent>;

export type MarketingPageKey = keyof typeof marketingPages;
