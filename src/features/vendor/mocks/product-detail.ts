import type { VendorProductDetail } from "../schema";

// ============================================================
// Vendor Product Detail — Mock Data (Design-Only)
// Matches the reference image: Huile de Palme Bio 1L
// ============================================================

export const mockProductDetail: VendorProductDetail = {
  id: "prod-001",
  name: "Huile de Palme Bio 1L",
  sku: "590251",
  status: "active",
  statusLabel: "Actif",
  isPromo: true,
  publishedAt: "2024-03-17",

  // Photos
  photos: [
    { id: "ph-1", url: "/images/products/palm-oil-main.jpg", alt: "Huile de Palme Bio 1L - Vue principale", isPrimary: true },
    { id: "ph-2", url: "/images/products/palm-oil-side.jpg", alt: "Huile de Palme Bio 1L - Vue latérale", isPrimary: false },
    { id: "ph-3", url: "/images/products/palm-oil-label.jpg", alt: "Huile de Palme Bio 1L - Étiquette", isPrimary: false },
    { id: "ph-4", url: "/images/products/palm-oil-back.jpg", alt: "Huile de Palme Bio 1L - Vue arrière", isPrimary: false },
  ],

  // Price
  price: 4500,
  originalPrice: 6000,
  discountPercent: 25,
  marginEstimated: 4500,
  currency: "FCFA",

  // Rating
  rating: 4.5,
  reviewCount: 2,
  reviewLabel: "2 avis des reviews",

  // Info attributes
  category: "Catégorie",
  weight: "250 KG",
  packaging: "Prochagique",
  origin: "Origin",
  description: "Huile de Palme Bio dans se moo palme, de souleill...",

  // Tags
  tags: ["Biologique", "Eatmonies", "Bitnacet"],

  // KPIs
  kpis: {
    stock: { value: 45, unit: "unités", percent: 75, alertThreshold: 45 },
    sold: { value: 234, period: "42 cte mois", change: "+12%", changeType: "positive" },
    views: { value: 1847, period: "324 cte mois", change: "+8%", changeType: "positive" },
    revenue: { value: 1053000, currency: "FCFA", period: "189,000 FCFA" },
  },

  // Variants & Tariffs (sidebar card)
  variantsSummary: {
    weight: [
      { label: "1L", price: 4500, isActive: true },
    ],
    packaging: [
      { label: "Packaging", price: 4500, isActive: false },
    ],
  },

  // Customer reviews summary (sidebar card)
  reviewsSummary: {
    totalRevenue: 1053000,
    revenueLabel: "1,053,000 FCFA",
    monthlyRevenue: "189,000 FCFA ce mois",
    recentReviews: [
      { id: "rv-1", name: "Mooenaa", rating: 5, timeAgo: "17 hours ago", avatarColor: "bg-amber-100" },
      { id: "rv-2", name: "Hamartia", rating: 5, timeAgo: "17 hours ago", avatarColor: "bg-orange-100" },
      { id: "rv-3", name: "Nama B.", rating: 5, timeAgo: "17 hours ago", avatarColor: "bg-pink-100" },
    ],
  },

  // Volume discount tiers (in main info)
  volumeDiscounts: [
    { minQty: 1, label: "1 =", price: 1500, discount: 3 },
    { minQty: 10, label: "10 =", price: 2300, discount: 15 },
    { minQty: 100, label: "100 =", price: 2500, discount: 5 },
  ],

  // Recent sales card
  recentSales: {
    chartData: [
      { x: 0, y: 20 }, { x: 4, y: 45 }, { x: 8, y: 60 }, { x: 12, y: 75 },
      { x: 16, y: 55 }, { x: 20, y: 90 }, { x: 24, y: 80 }, { x: 26, y: 70 },
      { x: 28, y: 85 }, { x: 30, y: 95 },
    ],
    orders: [
      { id: "o-1", reference: "00003700", customer: "Customer", qty: 1, price: 40, currency: "FCFA", time: "13:38", statusLabel: "Status", statusColor: "text-green-600" },
      { id: "o-2", reference: "00003702", customer: "Ramuuz", qty: 1, price: 45, currency: "FCFA", time: "13:38", statusLabel: "Status", statusColor: "text-green-600" },
      { id: "o-3", reference: "00003703", customer: "Customer", qty: 1, price: 40, currency: "FCFA", time: "13:59", statusLabel: "Status", statusColor: "text-green-600" },
      { id: "o-4", reference: "00003704", customer: "Ramuuz", qty: 1, price: 40, currency: "FCFA", time: "13:38", statusLabel: "Status", statusColor: "text-sugu-500" },
    ],
  },

  // Variants & Tariffs (bottom card with full detail)
  variantsDetail: {
    weights: [
      { label: "1L", isActive: true },
      { label: "3L", isActive: false },
      { label: "1L", isActive: false },
      { label: "25L", isActive: false },
    ],
    packagings: [
      { label: "1L", isActive: true },
      { label: "Aingeman", isActive: false },
    ],
    pricingTiers: [
      { minQty: "1 $", price: 45, currency: "FCFA", discount: 2 },
      { minQty: "10 à $", price: 100, currency: "FCFA", discount: 25 },
      { minQty: "100 $", price: 300, currency: "FCFA", discount: 40 },
    ],
  },

  // Customer reviews detail (bottom card)
  reviewsDetail: {
    globalRating: 4.5,
    ratingDistribution: [
      { stars: 5, count: 4 },
      { stars: 4, count: 2 },
      { stars: 3, count: 0 },
      { stars: 2, count: 1 },
      { stars: 1, count: 0 },
    ],
    reviews: [
      { id: "rd-1", name: "Name", rating: 5, timeAgo: "13 m. ago", avatarUrl: "" },
      { id: "rd-2", name: "Manira", rating: 5, timeAgo: "12 m. ago", avatarUrl: "" },
    ],
  },

  // Modification history
  history: [
    { id: "h-1", date: "26.08.2023", action: "Modification du prix au mannaone et prettons", author: "Descripto" },
    { id: "h-2", date: "28.08.2023", action: "Stockication du stock uodatles", author: "Descripto" },
    { id: "h-3", date: "23.06.2023", action: "Addition de photos commor les photos", author: "Descripto" },
  ],
};
