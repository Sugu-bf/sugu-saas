/**
 * Centralised query key factory.
 * All features MUST use this to ensure consistent cache invalidation.
 */
export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  vendor: {
    all: ["vendor"] as const,
    dashboard: () => [...queryKeys.vendor.all, "dashboard"] as const,
    orders: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "orders", filters] as const,
    orderDetail: (id: string) =>
      [...queryKeys.vendor.all, "orders", "detail", id] as const,
    orderStats: () =>
      [...queryKeys.vendor.all, "orders", "stats"] as const,
    products: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "products", filters] as const,
    productDetail: (id: string) =>
      [...queryKeys.vendor.all, "products", "detail", id] as const,
    productStats: () =>
      [...queryKeys.vendor.all, "products", "stats"] as const,
    productSearch: (query: string) =>
      [...queryKeys.vendor.all, "productSearch", query] as const,
    customerSearch: (query: string) =>
      [...queryKeys.vendor.all, "customerSearch", query] as const,
    productCategories: () =>
      [...queryKeys.vendor.all, "products", "categories"] as const,
    productBrands: () =>
      [...queryKeys.vendor.all, "products", "brands"] as const,
    variantOptions: () =>
      [...queryKeys.vendor.all, "products", "variantOptions"] as const,
    clients: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "clients", filters] as const,
    clientStats: () =>
      [...queryKeys.vendor.all, "clients", "stats"] as const,
    clientDetail: (id: string) =>
      [...queryKeys.vendor.all, "clients", "detail", id] as const,
    inventory: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "inventory", filters] as const,
    inventoryStats: () =>
      [...queryKeys.vendor.all, "inventory", "stats"] as const,
    inventoryTabs: () =>
      [...queryKeys.vendor.all, "inventory", "tabs"] as const,
    inventoryAlerts: () =>
      [...queryKeys.vendor.all, "inventory", "alerts"] as const,
    marketing: () =>
      [...queryKeys.vendor.all, "marketing"] as const,
    statistics: () =>
      [...queryKeys.vendor.all, "statistics"] as const,
    settings: () =>
      [...queryKeys.vendor.all, "settings"] as const,
    tickets: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "tickets", filters] as const,
    ticketDetail: (id: string) =>
      [...queryKeys.vendor.all, "tickets", "detail", id] as const,
    ticketMessages: (ticketId: string) =>
      [...queryKeys.vendor.all, "tickets", "messages", ticketId] as const,
    ticketCounts: () =>
      [...queryKeys.vendor.all, "tickets", "counts"] as const,
    wallet: () =>
      [...queryKeys.vendor.all, "wallet"] as const,
    walletTransactions: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "wallet", "transactions", filters] as const,
    payoutSettings: () =>
      [...queryKeys.vendor.all, "wallet", "payout-settings"] as const,
    deliveryPartners: () =>
      [...queryKeys.vendor.all, "deliveryPartners"] as const,
    // Messaging
    conversations: (filters?: Record<string, unknown>) =>
      [...queryKeys.vendor.all, "conversations", filters] as const,
    conversation: (id: string) =>
      [...queryKeys.vendor.all, "conversations", "detail", id] as const,
    messages: (convId: string) =>
      [...queryKeys.vendor.all, "conversations", "messages", convId] as const,
    presence: (convId: string) =>
      [...queryKeys.vendor.all, "conversations", "presence", convId] as const,
    recommendedProducts: (convId: string) =>
      [...queryKeys.vendor.all, "conversations", "recommended-products", convId] as const,
  },
  agency: {
    all: ["agency"] as const,
    dashboard: () => [...queryKeys.agency.all, "dashboard"] as const,
    deliveries: (filters?: Record<string, unknown>) =>
      [...queryKeys.agency.all, "deliveries", filters] as const,
    deliveryDetail: (id: string) =>
      [...queryKeys.agency.all, "deliveries", "detail", id] as const,
    couriers: (filters?: Record<string, unknown>) =>
      [...queryKeys.agency.all, "couriers", filters] as const,
    drivers: (filters?: Record<string, unknown>) =>
      [...queryKeys.agency.all, "drivers", filters] as const,
    driverDetail: (id: string) =>
      [...queryKeys.agency.all, "drivers", "detail", id] as const,
    statistics: (period?: string) =>
      [...queryKeys.agency.all, "statistics", period] as const,
    settings: () =>
      [...queryKeys.agency.all, "settings"] as const,
    // Messaging (read-only oversight)
    conversations: (filters?: Record<string, unknown>) =>
      [...queryKeys.agency.all, "conversations", filters] as const,
    conversation: (id: string) =>
      [...queryKeys.agency.all, "conversations", "detail", id] as const,
    messages: (convId: string) =>
      [...queryKeys.agency.all, "conversations", "messages", convId] as const,
  },
  driver: {
    all: ["driver"] as const,
    dashboard: () => [...queryKeys.driver.all, "dashboard"] as const,
    deliveries: (filters?: Record<string, unknown>) =>
      [...queryKeys.driver.all, "deliveries", filters] as const,
    deliveryDetail: (id: string) =>
      [...queryKeys.driver.all, "deliveries", "detail", id] as const,
    currentDelivery: () =>
      [...queryKeys.driver.all, "deliveries", "current"] as const,
    earnings: (period?: string) =>
      [...queryKeys.driver.all, "earnings", period] as const,
    activity: () =>
      [...queryKeys.driver.all, "activity"] as const,
    history: (filters?: Record<string, unknown>) =>
      [...queryKeys.driver.all, "history", filters] as const,
    settings: () =>
      [...queryKeys.driver.all, "settings"] as const,
    payoutSettings: () =>
      [...queryKeys.driver.all, "payoutSettings"] as const,
    // Messaging
    conversations: (filters?: Record<string, unknown>) =>
      [...queryKeys.driver.all, "conversations", filters] as const,
    conversation: (id: string) =>
      [...queryKeys.driver.all, "conversations", "detail", id] as const,
    messages: (convId: string) =>
      [...queryKeys.driver.all, "conversations", "messages", convId] as const,
    presence: (convId: string) =>
      [...queryKeys.driver.all, "conversations", "presence", convId] as const,
    recommendedProducts: (convId: string) =>
      [...queryKeys.driver.all, "conversations", "recommended-products", convId] as const,
  },
} as const;
