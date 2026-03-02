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
} from "./settings.service";

export type {
  UpdateProfileRequest,
  UpdateBusinessHoursRequest,
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
