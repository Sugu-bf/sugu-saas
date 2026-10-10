/**
 * Vendor Service Layer — Re-export Facade
 *
 * This file is a backward-compatible re-export of all vendor services.
 * The actual implementations live in the `services/` directory,
 * split by domain (SRP):
 *
 *   services/
 *   ├── _shared.ts              — Shared utilities
 *   ├── dashboard.service.ts    — Dashboard data
 *   ├── products.service.ts     — Products CRUD + creation
 *   ├── clients.service.ts      — Clients list/detail + export
 *   ├── inventory.service.ts    — Inventory + stock management
 *   ├── statistics.service.ts   — Analytics/statistics
 *   ├── marketing.service.ts    — Coupons + promotions
 *   ├── sales.service.ts        — Product list for pickers
 *   ├── settings.service.ts     — Settings (real API + Fortify 2FA)
 *   └── tickets.service.ts      — Tickets (mock)
 *
 * All existing imports from "./service" continue to work unchanged.
 */

export {
  // Dashboard
  getVendorDashboard,
  // Products
  getVendorProducts,
  getVendorProductDetail,
  deleteVendorProduct,
  getProductCategories,
  getProductBrands,
  getVariantOptions,
  previewProductImage,
  getImageProcessingCapabilities,
  previewProductBackgroundRemoval,
  acceptProductBackgroundRemoval,
  cancelProductBackgroundRemoval,
  createVendorProduct,
  updateVendorProduct,
  // Clients
  getVendorClients,
  getVendorClientDetail,
  createClientFromClientsPage,
  exportVendorClients,
  // Inventory
  getVendorInventory,
  addInventoryStock,
  exportInventoryCSV,
  // Statistics
  getVendorStats,
  // Marketing
  getVendorMarketing,
  toggleCouponStatus,
  createCoupon,
  createPromotion,
  updatePromotion,
  deletePromotion,
  // Sales
  getAllVendorProducts,
  // Settings
  getVendorSettings,
  updateSettingsIdentity,
  updateSettingsContact,
  buildContactRequest,
  buildIdentityRequest,
  updateSettingsProfile,
  buildProfileRequest,
  updateSettingsBusinessHours,
  updateSettingsLegal,
  updateSettingsOperations,
  updateSettingsNotifications,
  updateSettingsPassword,
  toggleSettings2FA,
  revokeSettingsSession,
  revokeOtherSettingsSessions,
  deactivateSettingsAccount,
  deleteSettingsAccount,
  // Settings — 2FA Fortify endpoints
  enable2FA,
  disable2FA,
  get2FAQrCode,
  confirm2FA,
  get2FARecoveryCodes,
  regenerate2FARecoveryCodes,
  // Settings — Sessions & Security
  getActiveSessions,
  updateSecurityAlerts,
  getLoginHistory,
  // Settings — Invoices
  getInvoices,
  // Settings — Media uploads & categories
  uploadLogo,
  uploadCover,
  getStoreCategories,
  // Tickets
  getVendorTickets,
  getTicketDetail,
  getTicketMessages,
  createTicket,
  sendTicketMessage,
  closeTicket,
  // Wallet
  getVendorWallet,
  requestPayout,
  getPayoutSettings,
  submitWithdrawal,
  // Messaging
  getSellerConversations,
  getSellerConversation,
  getSellerMessages,
  sendSellerMessage,
  sendSellerProductCard,
  markSellerRead,
  sendSellerTyping,
  getSellerPresence,
  reportSellerMessage,
  closeConversation,
  blockConversation,
  getRecommendedProducts,
} from "./services";

export type {
  CreateCouponRequest,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  UpdateProfileRequest,
  UpdateBusinessHoursRequest,
  TwoFactorEnableResponse,
  TwoFactorQrCodeResponse,
  TwoFactorConfirmRequest,
  TwoFactorRecoveryCodesResponse,
  ActiveSession,
  LoginHistoryEntry,
  Invoice,
  RecommendedProduct,
} from "./services";
