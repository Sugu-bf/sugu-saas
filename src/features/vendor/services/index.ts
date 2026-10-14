/**
 * Vendor Services — Barrel Export
 * Re-exports all domain services from a single entry point.
 */

// Dashboard
export { getVendorDashboard } from "./dashboard.service";

// Products
export {
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
} from "./products.service";

// Inventory
export {
  getVendorInventory,
  addInventoryStock,
  exportInventoryCSV,
} from "./inventory.service";

// Sales (search + order creation)
export {
  getAllVendorProducts,
} from "./sales.service";

// Settings


