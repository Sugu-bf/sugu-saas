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
 *   ├── inventory.service.ts    — Inventory + stock management
 *   ├── sales.service.ts        — Product list for pickers
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
  // Inventory
  getVendorInventory,
  addInventoryStock,
  exportInventoryCSV,
  // Sales
  getAllVendorProducts,
} from "./services";


