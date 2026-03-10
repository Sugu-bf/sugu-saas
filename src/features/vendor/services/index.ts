/**
 * Vendor Services — Barrel Export
 * Re-exports all domain services from a single entry point.
 */

// Dashboard
export { getVendorDashboard } from "./dashboard.service";

// Orders
export {
  getVendorOrders,
  getVendorOrderDetail,
  confirmOrder,
  cancelOrder,
  requestOrderDelivery,
  markOrderShipped,
  markOrderDelivered,
  downloadDeliverySlip,
  getOrderInvoiceLink,
} from "./orders.service";

// Products
export {
  getVendorProducts,
  getVendorProductDetail,
  deleteVendorProduct,
  getProductCategories,
  getProductBrands,
  getVariantOptions,
  previewProductImage,
  createVendorProduct,
} from "./products.service";

// Clients
export {
  getVendorClients,
  getVendorClientDetail,
  createClientFromClientsPage,
  exportVendorClients,
} from "./clients.service";

// Inventory
export {
  getVendorInventory,
  addInventoryStock,
  exportInventoryCSV,
} from "./inventory.service";

// Statistics
export { getVendorStats } from "./statistics.service";

// Marketing
export {
  getVendorMarketing,
  toggleCouponStatus,
  createCoupon,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "./marketing.service";
export type { CreateCouponRequest, CreatePromotionRequest, UpdatePromotionRequest } from "./marketing.service";

// Sales (search + order creation)
export {
  searchVendorProducts,
  getAllVendorProducts,
  searchVendorCustomers,
  createVendorCustomer,
  createVendorOrder,
  getDeliveryPartners,
} from "./sales.service";

// Settings
export {
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
  // 2FA Fortify endpoints
  enable2FA,
  disable2FA,
  get2FAQrCode,
  confirm2FA,
  get2FARecoveryCodes,
  regenerate2FARecoveryCodes,
  // Sessions & Security
  getActiveSessions,
  updateSecurityAlerts,
  getLoginHistory,
  // Invoices
  getInvoices,
} from "./settings.service";

export type {
  UpdateProfileRequest,
  UpdateBusinessHoursRequest,
  TwoFactorEnableResponse,
  TwoFactorQrCodeResponse,
  TwoFactorConfirmRequest,
  TwoFactorRecoveryCodesResponse,
  ActiveSession,
  LoginHistoryEntry,
  Invoice,
} from "./settings.service";

// Tickets
export {
  getVendorTickets,
  getTicketDetail,
  getTicketMessages,
  createTicket,
  sendTicketMessage,
  closeTicket,
} from "./tickets.service";

// Wallet
export {
  getVendorWallet,
  requestPayout,
  getPayoutSettings,
  submitWithdrawal,
} from "./wallet.service";
